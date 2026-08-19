import asyncio
from sqlalchemy import select, func
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics, AdDailyMetrics

async def main():
    async with async_session_factory() as db:
        stmt = select(User).where(User.email == "suvarnakharat57@gmail.com")
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            print("User not found!")
            return

        stmt_acc = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        res_acc = await db.execute(stmt_acc)
        accs = res_acc.scalars().all()
        
        for a in accs:
            print(f"\nAd Account: {a.account_name} ({a.meta_account_id})")
            
            # Fetch aggregated Campaign-level metrics
            stmt_c = (
                select(
                    func.sum(CampaignDailyMetrics.spend).label("spend"),
                    func.sum(CampaignDailyMetrics.impressions).label("impressions"),
                    func.sum(CampaignDailyMetrics.reach).label("reach"),
                    func.sum(CampaignDailyMetrics.clicks).label("clicks"),
                    func.sum(CampaignDailyMetrics.purchases).label("purchases"),
                    func.sum(CampaignDailyMetrics.leads).label("leads"),
                )
                .join(Campaign)
                .where(Campaign.ad_account_id == a.id)
            )
            res_c = await db.execute(stmt_c)
            row = res_c.fetchone()
            
            if row and row.spend is not None:
                # Calculate CTR and CPC
                spend = float(row.spend)
                impressions = int(row.impressions or 0)
                reach = int(row.reach or 0)
                clicks = int(row.clicks or 0)
                
                ctr = (clicks / impressions * 100) if impressions > 0 else 0.0
                
                print(f"  Campaign Daily Metrics (Aggregated):")
                print(f"    Spend: ₹{spend:.2f}")
                print(f"    Impressions: {impressions}")
                print(f"    Reach: {reach}")
                print(f"    Clicks: {clicks}")
                print(f"    CTR (All): {ctr:.2f}%")
            else:
                print("  No campaign metrics found.")

            # Fetch AdSet performance metrics (Messaging connections etc)
            stmt_as_metrics = (
                select(
                    func.sum(AdSetDailyMetrics.spend).label("spend"),
                    func.sum(AdSetDailyMetrics.conversations).label("conversations"),
                    func.sum(AdSetDailyMetrics.messaging_leads).label("messaging_leads"),
                )
                .join(AdSet)
                .join(Campaign)
                .where(Campaign.ad_account_id == a.id)
            )
            res_as = await db.execute(stmt_as_metrics)
            as_row = res_as.fetchone()
            
            if as_row and as_row.spend is not None:
                conversations = int(as_row.conversations or 0)
                c_spend = float(as_row.spend)
                cpc = (c_spend / conversations) if conversations > 0 else 0.0
                print(f"  AdSet Daily Metrics (Aggregated):")
                print(f"    Spend: ₹{c_spend:.2f}")
                print(f"    Messaging Connections: {conversations}")
                print(f"    Cost per Conversation: ₹{cpc:.2f}")
                print(f"    Messaging Leads: {as_row.messaging_leads}")
            else:
                print("  No adset metrics found.")

if __name__ == "__main__":
    asyncio.run(main())
