import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaAdAccount
from app.api.v1.campaigns import list_campaigns
from app.api.v1.ads import list_adsets
from datetime import date

async def main():
    async with async_session_factory() as db:
        # Find user
        stmt_user = select(User).where(User.email == "suvarnakharat57@gmail.com")
        res_user = await db.execute(stmt_user)
        user = res_user.scalar_one_or_none()
        if not user:
            print("User not found!")
            return
        
        # Find ad account
        stmt_acc = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        res_acc = await db.execute(stmt_acc)
        acc = res_acc.scalars().first()
        if not acc:
            print("No ad accounts found!")
            return

        print(f"Testing ad account ID: {acc.id} / {acc.meta_account_id}")

        claims = {"email": user.email, "uid": user.firebase_uid}
        
        # Clear existing ones first for this account so we can regenerate fresh
        from app.models.recommendation import AIRecommendation
        from sqlalchemy import delete
        await db.execute(delete(AIRecommendation).where(AIRecommendation.ad_account_id == acc.id))
        await db.commit()

        # Compile recommendations
        print("Compiling recommendations...")
        from app.services.recommendation_engine import RecommendationEngine
        await RecommendationEngine.compile_recommendations(db, acc.id, user.id)
        await db.commit()

        # Call recommendations list
        print("\n--- Recommendations ---")
        from app.api.v1.recommendations import list_recommendations
        recs = await list_recommendations(
            ad_account_id=str(acc.id),
            claims=claims,
            db=db
        )
        for r in recs:
            print(f"ID: {r.id}, Type: {r.entity_type}, EntityId: {r.entity_id}, Title: {r.title}, CampaignId: {r.campaign_id}, AdSetId: {r.adset_id}, AdId: {r.ad_id}")

if __name__ == "__main__":
    asyncio.run(main())
