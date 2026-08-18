"""
Digital Growth Studio — Celery Tasks
"""
import asyncio
import structlog
from sqlalchemy import select

import uuid
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.meta import MetaAdAccount

logger = structlog.get_logger()


@celery_app.task(name="app.workers.tasks.sync_ad_account_task")
def sync_ad_account_task(ad_account_id: str):
    """
    Celery task to trigger marketing sync for a specific ad account.
    Runs async sync logic inside synchronous task context.
    """
    # Inline import to avoid circular dependency
    from app.services.meta_sync import MetaSyncService
    from app.services.recommendation_engine import RecommendationEngine

    logger.info("celery_sync_task_started", ad_account_id=ad_account_id)

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
            
            if ad_acc:
                await service.sync_ad_account(db, str(ad_acc.id))
                await RecommendationEngine.compile_recommendations(db, ad_acc.id, ad_acc.user_id)
            else:
                logger.error("celery_sync_ad_account_not_found", ad_account_id=ad_account_id)

    try:
        # Run async coroutine in thread event loop
        asyncio.run(_run())
        logger.info("celery_sync_task_completed", ad_account_id=ad_account_id)
        return {"status": "success", "ad_account_id": ad_account_id}
    except Exception as e:
        logger.error("celery_sync_task_failed", ad_account_id=ad_account_id, error=str(e))
        return {"status": "failed", "ad_account_id": ad_account_id, "error": str(e)}


@celery_app.task(name="app.workers.tasks.trigger_all_active_syncs")
def trigger_all_active_syncs():
    """
    Scheduled task that runs periodically to trigger background syncs
    for all connected ad accounts.
    """
    logger.info("trigger_all_active_syncs_started")

    async def _run():
        from app.services.entitlement_engine import EntitlementEngine
        from datetime import datetime, timezone, timedelta
        from app.models.user import User
        from app.models.meta import MetaConnection

        async with async_session_factory() as db:
            # Query all ad accounts currently saved in DB
            stmt = select(MetaAdAccount)
            res = await db.execute(stmt)
            accounts = res.scalars().all()
            
            logger.info("active_ad_accounts_retrieved", count=len(accounts))
            for acc in accounts:
                # 1. Fetch connection last_sync_at
                stmt_conn = select(MetaConnection).where(MetaConnection.user_id == acc.user_id)
                res_conn = await db.execute(stmt_conn)
                conn = res_conn.scalar_one_or_none()
                
                # 2. Fetch User to resolve entitlements
                stmt_user = select(User).where(User.id == acc.user_id)
                res_user = await db.execute(stmt_user)
                user = res_user.scalar_one_or_none()
                
                if user:
                    entitlements = await EntitlementEngine.resolve_entitlements(user, db)
                    interval_hours = entitlements.get("sync_interval_hours", 48)
                    
                    should_sync = True
                    if conn and conn.last_sync_at:
                        now = datetime.now(timezone.utc)
                        last_sync = conn.last_sync_at.replace(tzinfo=timezone.utc) if conn.last_sync_at.tzinfo is None else conn.last_sync_at
                        if now - last_sync < timedelta(hours=interval_hours):
                            should_sync = False
                            logger.info("sync_skipped_within_interval", ad_account_id=acc.meta_account_id, interval_hours=interval_hours)
                    
                    if should_sync:
                        sync_ad_account_task.delay(str(acc.id))

    try:
        asyncio.run(_run())
        logger.info("trigger_all_active_syncs_completed")
        return {"status": "success"}
    except Exception as e:
        logger.error("trigger_all_active_syncs_failed", error=str(e))
        return {"status": "failed", "error": str(e)}
