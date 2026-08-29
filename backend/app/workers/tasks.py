"""
Digital Growth Studio — Celery Tasks
"""
import asyncio
import structlog
from sqlalchemy import select

import uuid
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.meta import MetaAdAccount, MetaConnection

logger = structlog.get_logger()


@celery_app.task(name="app.workers.tasks.sync_ad_account_task", bind=True, max_retries=3, default_retry_delay=10)
def sync_ad_account_task(self, ad_account_id: str):
    """
    Celery task to trigger marketing sync for a specific ad account.
    Includes auto-retry (3 attempts with exponential backoff) and
    sequential queue collision detection.
    """
    # Inline import to avoid circular dependency
    from app.services.meta_sync import MetaSyncService
    from app.services.recommendation_engine import RecommendationEngine
    from datetime import datetime, timezone, timedelta
    import time

    logger.info("celery_sync_task_started", ad_account_id=ad_account_id, attempt=self.request.retries + 1)

    async def _run():
        async with async_session_factory() as db:
            service = MetaSyncService()
            
            # Resolve account UUID
            stmt = select(MetaAdAccount)
            try:
                acc_uuid = uuid.UUID(ad_account_id)
                stmt = stmt.where(MetaAdAccount.id == acc_uuid)
            except ValueError:
                stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)
            
            res = await db.execute(stmt)
            ad_acc = res.scalar_one_or_none()
            
            if not ad_acc:
                logger.error("celery_sync_ad_account_not_found", ad_account_id=ad_account_id)
                return

            # Sequential queue check: if another sync is in progress, wait
            stmt_conn = select(MetaConnection).where(MetaConnection.id == ad_acc.meta_connection_id)
            res_conn = await db.execute(stmt_conn)
            conn = res_conn.scalar_one_or_none()

            if conn and conn.last_sync_status == "in_progress" and conn.last_sync_at:
                last_sync_time = conn.last_sync_at
                if last_sync_time.tzinfo is None:
                    last_sync_time = last_sync_time.replace(tzinfo=timezone.utc)
                elapsed = (datetime.now(timezone.utc) - last_sync_time).total_seconds()
                if elapsed < 600:
                    raise Exception(f"Another sync is in progress (started {int(elapsed)}s ago). Queuing retry.")

            is_final_attempt = (self.request.retries >= self.max_retries)
            await service.sync_ad_account(db, str(ad_acc.id), suppress_failure_notification=not is_final_attempt)
            await RecommendationEngine.compile_recommendations(db, ad_acc.id, ad_acc.user_id)

    try:
        asyncio.run(_run())
        logger.info("celery_sync_task_completed", ad_account_id=ad_account_id)
        return {"status": "success", "ad_account_id": ad_account_id}
    except Exception as e:
        logger.error("celery_sync_task_failed", ad_account_id=ad_account_id, attempt=self.request.retries + 1, error=str(e))
        # Auto-retry with exponential backoff: 10s, 20s, 40s
        retry_delay = 10 * (2 ** self.request.retries)
        try:
            raise self.retry(exc=e, countdown=retry_delay)
        except self.MaxRetriesExceededError:
            logger.error("celery_sync_all_retries_exhausted", ad_account_id=ad_account_id, error=str(e))
            return {"status": "failed", "ad_account_id": ad_account_id, "error": str(e)}


@celery_app.task(name="app.workers.tasks.trigger_all_active_syncs")
def trigger_all_active_syncs():
    """
    Scheduled task that runs periodically to trigger background syncs
    for all connected ad accounts.
    """
    logger.info("trigger_all_active_syncs_started")
    try:
        asyncio.run(trigger_all_active_syncs_async())
        logger.info("trigger_all_active_syncs_completed")
        return {"status": "success"}
    except Exception as e:
        logger.error("trigger_all_active_syncs_failed", error=str(e))
        return {"status": "failed", "error": str(e)}


async def trigger_all_active_syncs_async():
    """
    Asynchronous runner for periodic ad account synchronization.
    Only syncs accounts where:
      - MetaConnection.status == 'connected'
      - MetaAdAccount.account_status == 1 (ACTIVE)
    Fetches user subscription entitlements, evaluates last sync time,
    and schedules Celery or inline FastAPI task executions.
    """
    from app.services.entitlement_engine import EntitlementEngine
    from datetime import datetime, timezone, timedelta
    from app.models.user import User
    from app.models.meta import MetaConnection
    from app.api.v1.meta import run_sync_inline

    async with async_session_factory() as db:
        # Query only ad accounts with active connection and active account status
        stmt = (
            select(MetaAdAccount)
            .join(MetaConnection, MetaAdAccount.meta_connection_id == MetaConnection.id)
            .where(
                MetaConnection.status == "connected",
                MetaAdAccount.account_status == 1,  # 1 = ACTIVE
            )
        )
        res = await db.execute(stmt)
        accounts = res.scalars().all()
        
        logger.info("active_ad_accounts_retrieved", count=len(accounts))
        for acc in accounts:
            # 1. Fetch connection last_sync_at
            stmt_conn = select(MetaConnection).where(MetaConnection.user_id == acc.user_id)
            res_conn = await db.execute(stmt_conn)
            conn = res_conn.scalar_one_or_none()
            
            # Skip if connection is missing or not connected
            if not conn or conn.status != "connected":
                logger.info("sync_skipped_connection_inactive", ad_account_id=acc.meta_account_id, status=conn.status if conn else "missing")
                continue

            # 2. Fetch User to resolve entitlements
            stmt_user = select(User).where(User.id == acc.user_id)
            res_user = await db.execute(stmt_user)
            user = res_user.scalar_one_or_none()
            
            if user:
                entitlements = await EntitlementEngine.resolve_entitlements(user, db)
                interval_hours = entitlements.get("sync_interval_hours", 48)


                
                should_sync = True
                if conn and conn.last_sync_at:
                    if conn.last_sync_status == "failed":
                        should_sync = True
                        logger.info("sync_failed_previously_retrying", ad_account_id=acc.meta_account_id)
                    else:
                        now = datetime.now(timezone.utc)
                        last_sync = conn.last_sync_at.replace(tzinfo=timezone.utc) if conn.last_sync_at.tzinfo is None else conn.last_sync_at
                        if now - last_sync < timedelta(hours=interval_hours):
                            should_sync = False
                            logger.info("sync_skipped_within_interval", ad_account_id=acc.meta_account_id, interval_hours=interval_hours)
                
                if should_sync:
                    logger.info("triggering_overdue_sync", ad_account_id=acc.meta_account_id, interval_hours=interval_hours)
                    # A. Trigger Celery task as fallback
                    celery_triggered = False
                    try:
                        sync_ad_account_task.delay(str(acc.id))
                        celery_triggered = True
                    except Exception:
                        pass
                    # B. Trigger inline sync in background thread as guaranteed fallback
                    if not celery_triggered:
                        asyncio.create_task(run_sync_inline(str(acc.id)))


@celery_app.task(name="app.workers.tasks.force_sync_all_accounts_task")
def force_sync_all_accounts_task():
    """
    Scheduled task that runs daily at 12:01 AM to force sync all active ad accounts.
    Bypasses the subscription interval checks so that all accounts start the day with fresh data.
    """
    logger.info("force_sync_all_accounts_task_started")
    try:
        asyncio.run(force_sync_all_accounts_async())
        logger.info("force_sync_all_accounts_task_completed")
        return {"status": "success"}
    except Exception as e:
        logger.error("force_sync_all_accounts_task_failed", error=str(e))
        return {"status": "failed", "error": str(e)}


async def force_sync_all_accounts_async():
    """
    Asynchronous force runner for all active Meta ad accounts.
    Syncs accounts regardless of last sync timestamp to ensure updated statistics at midnight.
    """
    from app.models.meta import MetaConnection
    from app.api.v1.meta import run_sync_inline

    async with async_session_factory() as db:
        # Query only ad accounts with active connection and active account status
        stmt = (
            select(MetaAdAccount)
            .join(MetaConnection, MetaAdAccount.meta_connection_id == MetaConnection.id)
            .where(
                MetaConnection.status == "connected",
                MetaAdAccount.account_status == 1,  # 1 = ACTIVE
            )
        )
        res = await db.execute(stmt)
        accounts = res.scalars().all()
        
        logger.info("force_sync_active_ad_accounts_retrieved", count=len(accounts))
        for acc in accounts:
            logger.info("triggering_daily_force_sync", ad_account_id=acc.meta_account_id)
            # A. Trigger Celery task as fallback
            celery_triggered = False
            try:
                sync_ad_account_task.delay(str(acc.id))
                celery_triggered = True
            except Exception as e:
                logger.error("triggering_force_sync_celery_failed", ad_account_id=acc.meta_account_id, error=str(e))
            # B. Trigger inline sync in background thread as guaranteed fallback
            if not celery_triggered:
                asyncio.create_task(run_sync_inline(str(acc.id)))
