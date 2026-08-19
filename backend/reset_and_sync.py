import asyncio
from sqlalchemy import select, delete
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics, AdDailyMetrics
from app.services.meta_sync import MetaSyncService

async def main():
    print("Connecting to database...")
    async with async_session_factory() as db:
        # 1. Fetch user suvarnakharat57@gmail.com
        stmt = select(User).where(User.email == "suvarnakharat57@gmail.com")
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            print("User suvarnakharat57@gmail.com not found!")
            return

        print(f"Found User: ID={user.id}, Name={user.name}")

        # 2. Fetch Ad Account
        stmt_acc = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        res_acc = await db.execute(stmt_acc)
        accs = res_acc.scalars().all()
        if not accs:
            print("No ad accounts found for user.")
            return

        for ad_acc in accs:
            print(f"Resetting metrics for Ad Account: {ad_acc.account_name} ({ad_acc.meta_account_id})...")
            
            # Fetch Campaign UUIDs for this ad account
            stmt_c = select(Campaign.id).where(Campaign.ad_account_id == ad_acc.id)
            res_c = await db.execute(stmt_c)
            camp_ids = res_c.scalars().all()
            
            if camp_ids:
                # Fetch AdSet UUIDs
                stmt_as = select(AdSet.id).where(AdSet.campaign_id.in_(camp_ids))
                res_as = await db.execute(stmt_as)
                adset_ids = res_as.scalars().all()

                # Fetch Ad UUIDs
                ad_ids = []
                if adset_ids:
                    stmt_ad = select(Ad.id).where(Ad.ad_set_id.in_(adset_ids))
                    res_ad = await db.execute(stmt_ad)
                    ad_ids = res_ad.scalars().all()

                # Delete daily metrics
                print("Deleting existing daily metrics...")
                stmt_del_c = delete(CampaignDailyMetrics).where(CampaignDailyMetrics.campaign_id.in_(camp_ids))
                await db.execute(stmt_del_c)

                if adset_ids:
                    stmt_del_as = delete(AdSetDailyMetrics).where(AdSetDailyMetrics.ad_set_id.in_(adset_ids))
                    await db.execute(stmt_del_as)

                if ad_ids:
                    stmt_del_ad = delete(AdDailyMetrics).where(AdDailyMetrics.ad_id.in_(ad_ids))
                    await db.execute(stmt_del_ad)

                await db.commit()
                print("Old daily metrics deleted successfully.")
            else:
                print("No campaigns found; nothing to delete.")

            # 3. Trigger live sync using MetaSyncService
            print("Starting fresh Meta API Synchronization...")
            sync_service = MetaSyncService()
            await sync_service.sync_ad_account(db, str(ad_acc.id))
            print("Sync complete successfully!")

if __name__ == "__main__":
    asyncio.run(main())
