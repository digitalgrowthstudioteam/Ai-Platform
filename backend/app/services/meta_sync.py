"""
Digital Growth Studio — Meta Marketing API Synchronization Service
"""
import uuid
import httpx
import structlog
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import get_settings
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics, AdDailyMetrics

logger = structlog.get_logger()
settings = get_settings()


class MetaSyncService:
    """
    Ingests and synchronizes Meta Ads entities and historical performance metrics.
    """

    async def sync_ad_account(self, db: AsyncSession, ad_account_id: str) -> None:
        """
        Runs the full sync cycle for a specific ad account.
        Downloads marketing campaign structures and 30-day daily metrics.
        """
        # 1. Look up the ad account
        ad_acc = None
        try:
            account_uuid = uuid.UUID(ad_account_id)
            stmt = select(MetaAdAccount).where(MetaAdAccount.id == account_uuid)
        except ValueError:
            stmt = select(MetaAdAccount).where(MetaAdAccount.meta_account_id == ad_account_id)

        res = await db.execute(stmt)
        ad_acc = res.scalar_one_or_none()

        if not ad_acc:
            raise ValueError(f"Ad account {ad_account_id} not found in database.")

        # 2. Look up the associated connection
        stmt = select(MetaConnection).where(MetaConnection.id == ad_acc.meta_connection_id)
        res = await db.execute(stmt)
        conn = res.scalar_one_or_none()

        if not conn or conn.status != "connected":
            raise ValueError(f"Meta profile for ad account {ad_account_id} is disconnected.")

        token = conn.access_token

        # Update last sync status
        conn.last_sync_status = "in_progress"
        await db.commit()

        try:
            # Check for mock bypass
            if token.startswith("EAAGm0PX") or token == "mock_access_token":
                logger.info("meta_sync_using_mock_pipeline", ad_account_id=ad_acc.meta_account_id)
                await self._sync_mock_data(db, ad_acc)
            else:
                logger.info("meta_sync_using_live_pipeline", ad_account_id=ad_acc.meta_account_id)
                await self._sync_live_data(db, ad_acc, token)

            # Mark connection status as success
            conn.last_sync_status = "success"
            conn.last_sync_at = datetime.utcnow()
            conn.last_sync_error = None
            ad_acc.updated_at = datetime.utcnow()
            await db.commit()
            logger.info("meta_sync_success", ad_account_id=ad_acc.meta_account_id)

        except Exception as e:
            # Revert to error status on exception
            conn.last_sync_status = "failed"
            conn.last_sync_error = str(e)
            await db.commit()
            logger.error("meta_sync_failed", ad_account_id=ad_acc.meta_account_id, error=str(e))
            raise e

    async def _sync_mock_data(self, db: AsyncSession, ad_acc: MetaAdAccount) -> None:
        """
        Generates structured sandbox datasets for local/mock validation.
        """
        # Create campaigns
        mock_campaigns = [
            {"id": "camp_111", "name": "DG - Prospecting Conversions", "objective": "OUTCOMES", "status": "ACTIVE", "daily_budget": 1500.00},
            {"id": "camp_222", "name": "DG - Retargeting Customers", "objective": "OUTCOMES", "status": "ACTIVE", "daily_budget": 800.00},
        ]
        campaign_map = {}
        for mc in mock_campaigns:
            stmt = pg_insert(Campaign).values(
                ad_account_id=ad_acc.id,
                meta_campaign_id=mc["id"],
                name=mc["name"],
                objective=mc["objective"],
                status=mc["status"],
                daily_budget=mc["daily_budget"],
                buying_type="AUCTION",
            ).on_conflict_do_update(
                index_elements=["meta_campaign_id"],
                set_={
                    "name": mc["name"],
                    "status": mc["status"],
                    "daily_budget": mc["daily_budget"],
                    "updated_at": datetime.utcnow()
                }
            ).returning(Campaign.id)
            res = await db.execute(stmt)
            campaign_map[mc["id"]] = res.scalar()

        # Create ad sets
        mock_adsets = [
            {"id": "adset_111", "campaign_id": "camp_111", "name": "Broad Audience (India)", "status": "ACTIVE", "optimization_goal": "OFFSITE_CONVERSIONS", "billing_event": "IMPRESSIONS", "daily_budget": 1000.00},
            {"id": "adset_112", "campaign_id": "camp_111", "name": "Lookalike (1%) Purchase", "status": "ACTIVE", "optimization_goal": "OFFSITE_CONVERSIONS", "billing_event": "IMPRESSIONS", "daily_budget": 500.00},
            {"id": "adset_221", "campaign_id": "camp_222", "name": "Website Visitors 30d", "status": "ACTIVE", "optimization_goal": "OFFSITE_CONVERSIONS", "billing_event": "IMPRESSIONS", "daily_budget": 800.00},
        ]
        adset_map = {}
        for ma in mock_adsets:
            stmt = pg_insert(AdSet).values(
                campaign_id=campaign_map[ma["campaign_id"]],
                meta_adset_id=ma["id"],
                name=ma["name"],
                status=ma["status"],
                optimization_goal=ma["optimization_goal"],
                billing_event=ma["billing_event"],
                daily_budget=ma["daily_budget"],
            ).on_conflict_do_update(
                index_elements=["meta_adset_id"],
                set_={
                    "name": ma["name"],
                    "status": ma["status"],
                    "daily_budget": ma["daily_budget"],
                    "updated_at": datetime.utcnow()
                }
            ).returning(AdSet.id)
            res = await db.execute(stmt)
            adset_map[ma["id"]] = res.scalar()

        # Create ads and creatives
        mock_ads = [
            {"id": "ad_111_1", "adset_id": "adset_111", "name": "Summer Sale - Video 1", "status": "ACTIVE", "headline": "50% Off Summer Wear", "body": "Beat the heat with our special sales!", "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"},
            {"id": "ad_111_2", "adset_id": "adset_111", "name": "Summer Sale - Image 1", "status": "ACTIVE", "headline": "Shop Summer Looks", "body": "Best collections this summer.", "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"},
            {"id": "ad_112_1", "adset_id": "adset_112", "name": "Summer Sale - Carousel 1", "status": "ACTIVE", "headline": "Trending Outfits", "body": "Discover the latest styles.", "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"},
            {"id": "ad_221_1", "adset_id": "adset_221", "name": "Summer Sale - Retarget Video", "status": "ACTIVE", "headline": "Did you forget something?", "body": "Complete your purchase today.", "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"},
        ]
        
        ad_map = {}
        for ma in mock_ads:
            # 1. Upsert Ad
            stmt = pg_insert(Ad).values(
                ad_set_id=adset_map[ma["adset_id"]],
                meta_ad_id=ma["id"],
                name=ma["name"],
                status=ma["status"],
            ).on_conflict_do_update(
                index_elements=["meta_ad_id"],
                set_={
                    "name": ma["name"],
                    "status": ma["status"],
                    "updated_at": datetime.utcnow()
                }
            ).returning(Ad.id)
            res = await db.execute(stmt)
            ad_uuid = res.scalar()
            ad_map[ma["id"]] = ad_uuid

            # 2. Upsert Creative linked to Ad
            cr_stmt = pg_insert(Creative).values(
                meta_creative_id=f"creative_{ma['id']}",
                ad_id=ad_uuid,
                headline=ma["headline"],
                primary_text=ma["body"],
                description="Limited time offer.",
                image_url=ma["image_url"],
                creative_type="image" if "Image" in ma["name"] else "video",
                landing_page_url="https://example.com/summer-sale",
            ).on_conflict_do_update(
                index_elements=["meta_creative_id"],
                set_={
                    "headline": ma["headline"],
                    "primary_text": ma["body"],
                    "image_url": ma["image_url"],
                    "ad_id": ad_uuid,
                    "updated_at": datetime.utcnow()
                }
            )
            await db.execute(cr_stmt)

        # Generate 30 days of metrics
        today = date.today()
        for i in range(settings.INITIAL_SYNC_DAYS):
            sync_date = today - timedelta(days=i)
            
            # Campaigns metrics
            for mc_id, db_id in campaign_map.items():
                base_spend = 1200.00 if mc_id == "camp_111" else 600.00
                spend = base_spend - (i * 10)
                impressions = int(spend * 15)
                clicks = int(impressions * 0.02)
                purchases = int(clicks * 0.05)
                revenue = purchases * 800.00
                
                # Math metrics
                ctr = clicks / impressions if impressions > 0 else 0.0
                cpc = spend / clicks if clicks > 0 else 0.0
                cpm = (spend / impressions) * 1000 if impressions > 0 else 0.0
                roas = revenue / spend if spend > 0 else 0.0

                stmt = pg_insert(CampaignDailyMetrics).values(
                    campaign_id=db_id,
                    date=sync_date,
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                ).on_conflict_do_update(
                    index_elements=["campaign_id", "date"],
                    set_={
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "purchases": purchases,
                        "revenue": revenue,
                        "ctr": ctr,
                        "cpc": cpc,
                        "cpm": cpm,
                        "roas": roas,
                        "updated_at": datetime.utcnow()
                    }
                )
                await db.execute(stmt)

            # Adsets metrics
            for ma_id, db_id in adset_map.items():
                base_spend = 500.00 if ma_id == "adset_111" else 300.00
                spend = base_spend - (i * 5)
                impressions = int(spend * 12)
                clicks = int(impressions * 0.018)
                purchases = int(clicks * 0.04)
                revenue = purchases * 800.00
                
                ctr = clicks / impressions if impressions > 0 else 0.0
                cpc = spend / clicks if clicks > 0 else 0.0
                cpm = (spend / impressions) * 1000 if impressions > 0 else 0.0
                roas = revenue / spend if spend > 0 else 0.0

                stmt = pg_insert(AdSetDailyMetrics).values(
                    ad_set_id=db_id,
                    date=sync_date,
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                ).on_conflict_do_update(
                    index_elements=["ad_set_id", "date"],
                    set_={
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "purchases": purchases,
                        "revenue": revenue,
                        "ctr": ctr,
                        "cpc": cpc,
                        "cpm": cpm,
                        "roas": roas,
                        "updated_at": datetime.utcnow()
                    }
                )
                await db.execute(stmt)

            # Ads metrics
            for ad_meta_id, db_id in ad_map.items():
                base_spend = 250.00
                spend = base_spend - (i * 3)
                impressions = int(spend * 10)
                clicks = int(impressions * 0.015)
                purchases = int(clicks * 0.035)
                revenue = purchases * 800.00
                
                ctr = clicks / impressions if impressions > 0 else 0.0
                cpc = spend / clicks if clicks > 0 else 0.0
                cpm = (spend / impressions) * 1000 if impressions > 0 else 0.0
                roas = revenue / spend if spend > 0 else 0.0

                stmt = pg_insert(AdDailyMetrics).values(
                    ad_id=db_id,
                    date=sync_date,
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                ).on_conflict_do_update(
                    index_elements=["ad_id", "date"],
                    set_={
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "purchases": purchases,
                        "revenue": revenue,
                        "ctr": ctr,
                        "cpc": cpc,
                        "cpm": cpm,
                        "roas": roas,
                        "updated_at": datetime.utcnow()
                    }
                )
                await db.execute(stmt)

        await db.commit()

    async def _sync_live_data(self, db: AsyncSession, ad_acc: MetaAdAccount, token: str) -> None:
        """
        Performs HTTP API requests against Meta Marketing Graph API.
        Extracts structural trees and daily insight performance logs.
        """
        headers = {"Authorization": f"Bearer {token}"}
        api_ver = settings.META_API_VERSION
        account_id = ad_acc.meta_account_id

        async with httpx.AsyncClient() as client:
            # 1. Fetch campaigns
            camp_url = f"https://graph.facebook.com/{api_ver}/{account_id}/campaigns?fields=id,name,objective,status,buying_type,daily_budget,lifetime_budget&limit=250"
            r = await client.get(camp_url, headers=headers)
            r.raise_for_status()
            campaigns_list = r.json().get("data", [])

            campaign_map = {}
            for mc in campaigns_list:
                stmt = pg_insert(Campaign).values(
                    ad_account_id=ad_acc.id,
                    meta_campaign_id=mc["id"],
                    name=mc["name"],
                    objective=mc.get("objective", "OUTCOMES"),
                    status=mc.get("status", "ACTIVE"),
                    daily_budget=float(mc["daily_budget"]) / 100 if "daily_budget" in mc else None,
                    lifetime_budget=float(mc["lifetime_budget"]) / 100 if "lifetime_budget" in mc else None,
                    buying_type=mc.get("buying_type", "AUCTION"),
                ).on_conflict_do_update(
                    index_elements=["meta_campaign_id"],
                    set_={
                        "name": mc["name"],
                        "status": mc.get("status", "ACTIVE"),
                        "daily_budget": float(mc["daily_budget"]) / 100 if "daily_budget" in mc else None,
                        "lifetime_budget": float(mc["lifetime_budget"]) / 100 if "lifetime_budget" in mc else None,
                        "updated_at": datetime.utcnow()
                    }
                ).returning(Campaign.id)
                res = await db.execute(stmt)
                campaign_map[mc["id"]] = res.scalar()

            # 2. Fetch ad sets
            adsets_url = f"https://graph.facebook.com/{api_ver}/{account_id}/adsets?fields=id,name,campaign{{id}},status,optimization_goal,billing_event,daily_budget,lifetime_budget&limit=250"
            r = await client.get(adsets_url, headers=headers)
            r.raise_for_status()
            adsets_list = r.json().get("data", [])

            adset_map = {}
            for ma in adsets_list:
                parent_camp_meta_id = ma.get("campaign", {}).get("id")
                if not parent_camp_meta_id or parent_camp_meta_id not in campaign_map:
                    continue  # Orphan check
                
                stmt = pg_insert(AdSet).values(
                    campaign_id=campaign_map[parent_camp_meta_id],
                    meta_adset_id=ma["id"],
                    name=ma["name"],
                    status=ma.get("status", "ACTIVE"),
                    optimization_goal=ma.get("optimization_goal", "OFFSITE_CONVERSIONS"),
                    billing_event=ma.get("billing_event", "IMPRESSIONS"),
                    daily_budget=float(ma["daily_budget"]) / 100 if "daily_budget" in ma else None,
                    lifetime_budget=float(ma["lifetime_budget"]) / 100 if "lifetime_budget" in ma else None,
                ).on_conflict_do_update(
                    index_elements=["meta_adset_id"],
                    set_={
                        "name": ma["name"],
                        "status": ma.get("status", "ACTIVE"),
                        "daily_budget": float(ma["daily_budget"]) / 100 if "daily_budget" in ma else None,
                        "lifetime_budget": float(ma["lifetime_budget"]) / 100 if "lifetime_budget" in ma else None,
                        "updated_at": datetime.utcnow()
                    }
                ).returning(AdSet.id)
                res = await db.execute(stmt)
                adset_map[ma["id"]] = res.scalar()

            # 3. Fetch Ads and Creatives
            ads_url = f"https://graph.facebook.com/{api_ver}/{account_id}/ads?fields=id,name,adset{{id}},status,creative{{id,title,body,image_url,url_tags}}&limit=250"
            r = await client.get(ads_url, headers=headers)
            r.raise_for_status()
            ads_list = r.json().get("data", [])

            ad_map = {}
            for ma in ads_list:
                parent_adset_meta_id = ma.get("adset", {}).get("id")
                if not parent_adset_meta_id or parent_adset_meta_id not in adset_map:
                    continue  # Orphan check
                
                stmt = pg_insert(Ad).values(
                    ad_set_id=adset_map[parent_adset_meta_id],
                    meta_ad_id=ma["id"],
                    name=ma["name"],
                    status=ma.get("status", "ACTIVE"),
                ).on_conflict_do_update(
                    index_elements=["meta_ad_id"],
                    set_={
                        "name": ma["name"],
                        "status": ma.get("status", "ACTIVE"),
                        "updated_at": datetime.utcnow()
                    }
                ).returning(Ad.id)
                res = await db.execute(stmt)
                ad_uuid = res.scalar()
                ad_map[ma["id"]] = ad_uuid

                # Sync Creative details
                cr_node = ma.get("creative")
                if cr_node:
                    cr_id = cr_node.get("id")
                    cr_headline = cr_node.get("title") or cr_node.get("name")
                    cr_body = cr_node.get("body")
                    cr_img = cr_node.get("image_url")
                    
                    cr_stmt = pg_insert(Creative).values(
                        meta_creative_id=cr_id,
                        ad_id=ad_uuid,
                        headline=cr_headline,
                        primary_text=cr_body,
                        description="Imported from Meta Sync",
                        image_url=cr_img,
                        creative_type="video" if cr_node.get("video_id") else "image",
                        landing_page_url=cr_node.get("url_tags"),
                    ).on_conflict_do_update(
                        index_elements=["meta_creative_id"],
                        set_={
                            "headline": cr_headline,
                            "primary_text": cr_body,
                            "image_url": cr_img,
                            "ad_id": ad_uuid,
                            "updated_at": datetime.utcnow()
                        }
                    )
                    await db.execute(cr_stmt)

            # 4. Ingest Historical Insights (last 30 days)
            # Level: Campaign
            ins_url = f"https://graph.facebook.com/{api_ver}/{account_id}/insights?time_increment=1&level=campaign&date_preset=last_30d&fields=campaign_id,date_start,spend,impressions,clicks,actions,action_values&limit=500"
            r = await client.get(ins_url, headers=headers)
            r.raise_for_status()
            c_insights = r.json().get("data", [])
            await self._save_insights(db, c_insights, campaign_map, "campaign")

            # Level: AdSet
            ins_url = f"https://graph.facebook.com/{api_ver}/{account_id}/insights?time_increment=1&level=adset&date_preset=last_30d&fields=adset_id,date_start,spend,impressions,clicks,actions,action_values&limit=500"
            r = await client.get(ins_url, headers=headers)
            r.raise_for_status()
            a_insights = r.json().get("data", [])
            await self._save_insights(db, a_insights, adset_map, "adset")

            # Level: Ad
            ins_url = f"https://graph.facebook.com/{api_ver}/{account_id}/insights?time_increment=1&level=ad&date_preset=last_30d&fields=ad_id,date_start,spend,impressions,clicks,actions,action_values&limit=500"
            r = await client.get(ins_url, headers=headers)
            r.raise_for_status()
            ad_insights = r.json().get("data", [])
            await self._save_insights(db, ad_insights, ad_map, "ad")

        await db.commit()

    async def _save_insights(self, db: AsyncSession, insights: list, id_map: dict, level: str) -> None:
        """
        Parses insights JSON array and upserts them into daily statistics tables.
        """
        for item in insights:
            meta_id = item.get(f"{level}_id")
            if not meta_id or meta_id not in id_map:
                continue
            
            db_uuid = id_map[meta_id]
            sync_date = datetime.strptime(item["date_start"], "%Y-%m-%d").date()
            spend = float(item.get("spend", 0))
            impressions = int(item.get("impressions", 0))
            clicks = int(item.get("clicks", 0))

            # Parse purchase count and conversion revenue from actions mapping
            purchases = 0
            revenue = 0.0
            actions = item.get("actions", [])
            for act in actions:
                if act.get("action_type") == "purchase":
                    purchases = int(act.get("value", 0))
            
            act_vals = item.get("action_values", [])
            for val in act_vals:
                if val.get("action_type") == "purchase":
                    revenue = float(val.get("value", 0.0))

            # Math aggregates
            ctr = clicks / impressions if impressions > 0 else 0.0
            cpc = spend / clicks if clicks > 0 else 0.0
            cpm = (spend / impressions) * 1000 if impressions > 0 else 0.0
            roas = revenue / spend if spend > 0 else 0.0

            if level == "campaign":
                stmt = pg_insert(CampaignDailyMetrics).values(
                    campaign_id=db_uuid,
                    date=sync_date,
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                ).on_conflict_do_update(
                    index_elements=["campaign_id", "date"],
                    set_={
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "purchases": purchases,
                        "revenue": revenue,
                        "ctr": ctr,
                        "cpc": cpc,
                        "cpm": cpm,
                        "roas": roas,
                        "updated_at": datetime.utcnow()
                    }
                )
            elif level == "adset":
                stmt = pg_insert(AdSetDailyMetrics).values(
                    ad_set_id=db_uuid,
                    date=sync_date,
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                ).on_conflict_do_update(
                    index_elements=["ad_set_id", "date"],
                    set_={
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "purchases": purchases,
                        "revenue": revenue,
                        "ctr": ctr,
                        "cpc": cpc,
                        "cpm": cpm,
                        "roas": roas,
                        "updated_at": datetime.utcnow()
                    }
                )
            else:
                stmt = pg_insert(AdDailyMetrics).values(
                    ad_id=db_uuid,
                    date=sync_date,
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                ).on_conflict_do_update(
                    index_elements=["ad_id", "date"],
                    set_={
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "purchases": purchases,
                        "revenue": revenue,
                        "ctr": ctr,
                        "cpc": cpc,
                        "cpm": cpm,
                        "roas": roas,
                        "updated_at": datetime.utcnow()
                    }
                )
            await db.execute(stmt)
