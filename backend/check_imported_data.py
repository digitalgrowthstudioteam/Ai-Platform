import asyncio
from sqlalchemy import select, func
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import AdDailyMetrics

async def main():
    async with async_session_factory() as db:
        stmt = select(User).where(User.email == "suvarnakharat57@gmail.com")
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            print("User suvarnakharat57@gmail.com not found!")
            return

        stmt_acc = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        res_acc = await db.execute(stmt_acc)
        accs = res_acc.scalars().all()
        for a in accs:
            print(f"Ad Account: ID={a.id}, MetaID={a.meta_account_id}, Name={a.account_name}")

            # Count campaigns
            stmt_c = select(func.count(Campaign.id)).where(Campaign.ad_account_id == a.id)
            res_c = await db.execute(stmt_c)
            print(f"  Campaigns count: {res_c.scalar_one()}")

            # Count adsets
            stmt_as = select(func.count(AdSet.id)).join(Campaign).where(Campaign.ad_account_id == a.id)
            res_as = await db.execute(stmt_as)
            print(f"  AdSets count: {res_as.scalar_one()}")

            # Count ads
            stmt_ad = select(func.count(Ad.id)).join(AdSet).join(Campaign).where(Campaign.ad_account_id == a.id)
            res_ad = await db.execute(stmt_ad)
            print(f"  Ads count: {res_ad.scalar_one()}")

            # Count metrics
            stmt_m = select(func.count(AdDailyMetrics.id)).join(Ad).join(AdSet).join(Campaign).where(Campaign.ad_account_id == a.id)
            res_m = await db.execute(stmt_m)
            print(f"  Daily metrics count: {res_m.scalar_one()}")

if __name__ == "__main__":
    asyncio.run(main())
