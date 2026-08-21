"""
Digital Growth Studio — AI Optimization Service
"""
import uuid
import json
import httpx
import structlog
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.campaign import Campaign, AdSet, Ad
from app.models.meta import MetaAdAccount
from app.models.metrics import CampaignDailyMetrics, AdDailyMetrics
from app.models.recommendation import AIRecommendation
from app.models.ai_optimization import AIOptimizationConfig, AIOptimizationLog
from app.models.ai_usage import AIUsageRecord

logger = structlog.get_logger()
settings = get_settings()


class AIOptimizationService:
    """
    Continuous campaign-level monitor that runs metrics evaluation first to control costs,
    and calls Gemini Flash only when meaningful performance anomalies or opportunities arise.
    """

    @classmethod
    async def analyze_active_campaigns(cls, db: AsyncSession, ad_account_uuid: uuid.UUID, user_uuid: uuid.UUID) -> int:
        """
        Main runner called after the Meta Sync finishes.
        Identifies active AI Optimization configs and runs intelligence analysis for each.
        """
        logger.info("Running AI Optimization analysis", ad_account_id=ad_account_uuid)
        
        # 1. Fetch all active AI Optimization configs for this ad account
        stmt = (
            select(AIOptimizationConfig)
            .where(AIOptimizationConfig.ad_account_id == ad_account_uuid)
            .where(AIOptimizationConfig.is_active == True)
            .options(selectinload(AIOptimizationConfig.campaign))
        )
        res = await db.execute(stmt)
        configs = res.scalars().all()
        
        if not configs:
            logger.info("No active AI Optimization campaigns to analyze", ad_account_id=ad_account_uuid)
            return 0

        # Load user campaign limit
        from app.models.user import User
        from app.services.entitlement_engine import EntitlementEngine
        
        user_stmt = select(User).where(User.id == user_uuid)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if not user:
            return 0
            
        ent = await EntitlementEngine.resolve_entitlements(user, db)
        limit = ent.get("ai_optimization_campaign_limit", 0)

        # Query all active configs globally to determine limit boundary
        global_stmt = (
            select(AIOptimizationConfig)
            .where(AIOptimizationConfig.user_id == user_uuid)
            .where(AIOptimizationConfig.is_active == True)
            .order_by(AIOptimizationConfig.created_at.asc())
        )
        global_res = await db.execute(global_stmt)
        global_configs = global_res.scalars().all()
        entitled_campaign_ids = [cfg.campaign_id for cfg in global_configs[:limit]]
            
        logger.info(f"Found {len(configs)} campaigns with AI Optimization active, limit={limit}", ad_account_id=ad_account_uuid)
        
        processed_count = 0
        for config in configs:
            if config.campaign_id not in entitled_campaign_ids:
                logger.info("skipping_campaign_optimization_over_entitlement", campaign_id=config.campaign_id, limit=limit)
                continue
            try:
                # Run the analysis cycle for this specific campaign
                triggered = await cls.analyze_campaign(db, config, user_uuid)
                if triggered:
                    processed_count += 1
            except Exception as ex:
                logger.error("Failed analyzing campaign in AI Optimization", campaign_id=config.campaign_id, error=str(ex))
                # Audit log for error
                db.add(AIOptimizationLog(
                    user_id=user_uuid,
                    ad_account_id=ad_account_uuid,
                    campaign_id=config.campaign_id,
                    trigger_type="SYNC",
                    gemini_model="gemini-1.5-flash",
                    recommendations_generated=0,
                    status="ERROR",
                    error_message=str(ex)
                ))
                await db.commit()
                
        return processed_count

    @classmethod
    async def analyze_campaign(cls, db: AsyncSession, config: AIOptimizationConfig, user_uuid: uuid.UUID) -> bool:
        """
        Evaluates a single campaign, detects changes, runs Gemini (or fallback), and saves recommendations.
        """
        campaign_uuid = config.campaign_id
        ad_account_uuid = config.ad_account_id
        
        # Fetch the campaign object
        stmt_c = (
            select(Campaign)
            .where(Campaign.id == campaign_uuid)
            .options(selectinload(Campaign.ad_sets).selectinload(AdSet.ads))
        )
        res_c = await db.execute(stmt_c)
        campaign = res_c.scalar_one_or_none()
        
        if not campaign:
            logger.warn("Campaign not found for AI Optimization config", campaign_id=campaign_uuid)
            return False

        # Gather metrics for past 14 days to compute current (last 7d) vs previous (7d before)
        today = date.today()
        start_date = today - timedelta(days=14)
        
        stmt_metrics = (
            select(CampaignDailyMetrics)
            .where(CampaignDailyMetrics.campaign_id == campaign_uuid)
            .where(CampaignDailyMetrics.date >= start_date)
            .order_by(CampaignDailyMetrics.date.desc())
        )
        res_metrics = await db.execute(stmt_metrics)
        daily_metrics = res_metrics.scalars().all()
        
        if not daily_metrics:
            logger.info("No daily metrics found for campaign optimization analysis", campaign_id=campaign_uuid)
            # Log audit trail for stale/waiting sync
            db.add(AIOptimizationLog(
                user_id=user_uuid,
                ad_account_id=ad_account_uuid,
                campaign_id=campaign_uuid,
                trigger_type="SYNC",
                gemini_model="gemini-1.5-flash",
                recommendations_generated=0,
                status="NO_CHANGE_DETECTED",
                error_message="Waiting for latest account sync / stale data."
            ))
            await db.commit()
            return False

        # Split metrics: current period (last 7 days) and previous period (previous 7 days)
        current_metrics = [m for m in daily_metrics if m.date >= today - timedelta(days=7)]
        previous_metrics = [m for m in daily_metrics if today - timedelta(days=14) <= m.date < today - timedelta(days=7)]
        
        # Compute aggregates
        cur_spend = sum(float(m.spend or 0.0) for m in current_metrics)
        cur_impressions = sum(m.impressions or 0 for m in current_metrics)
        cur_clicks = sum(m.clicks or 0 for m in current_metrics)
        cur_leads = sum(m.leads or 0 for m in current_metrics)
        cur_purchases = sum(m.purchases or 0 for m in current_metrics)
        cur_revenue = sum(float(m.revenue or 0.0) for m in current_metrics)
        
        prev_spend = sum(float(m.spend or 0.0) for m in previous_metrics)
        prev_impressions = sum(m.impressions or 0 for m in previous_metrics)
        prev_clicks = sum(m.clicks or 0 for m in previous_metrics)
        prev_leads = sum(m.leads or 0 for m in previous_metrics)
        prev_purchases = sum(m.purchases or 0 for m in previous_metrics)
        prev_revenue = sum(float(m.revenue or 0.0) for m in previous_metrics)
        
        # Derived KPI calculators
        def calc_kpis(spend, impressions, clicks, leads, purchases, revenue):
            cpl = spend / leads if leads > 0 else spend
            cpa = spend / purchases if purchases > 0 else spend
            roas = revenue / spend if spend > 0 else 0.0
            ctr = clicks / impressions if impressions > 0 else 0.0
            cpc = spend / clicks if clicks > 0 else 0.0
            cpm = (spend / impressions) * 1000.0 if impressions > 0 else 0.0
            return {
                "spend": spend,
                "impressions": impressions,
                "clicks": clicks,
                "leads": leads,
                "purchases": purchases,
                "revenue": revenue,
                "cpl": cpl,
                "cpa": cpa,
                "roas": roas,
                "ctr": ctr,
                "cpc": cpc,
                "cpm": cpm
            }

        cur_kpis = calc_kpis(cur_spend, cur_impressions, cur_clicks, cur_leads, cur_purchases, cur_revenue)
        prev_kpis = calc_kpis(prev_spend, prev_impressions, prev_clicks, prev_leads, prev_purchases, prev_revenue)
        
        # Calculate percentage changes (0.20 = 20% increase)
        def pct_change(cur, prev):
            if prev <= 0:
                return 0.0
            return (cur - prev) / prev

        cpl_change = pct_change(cur_kpis["cpl"], prev_kpis["cpl"])
        cpa_change = pct_change(cur_kpis["cpa"], prev_kpis["cpa"])
        roas_change = pct_change(cur_kpis["roas"], prev_kpis["roas"])
        ctr_change = pct_change(cur_kpis["ctr"], prev_kpis["ctr"])
        cpc_change = pct_change(cur_kpis["cpc"], prev_kpis["cpc"])
        spend_change = pct_change(cur_spend, prev_spend)
        
        # Fetch ad-level details to detect ad fatigue or creative opportunities
        stmt_ads = (
            select(AdDailyMetrics)
            .join(Ad, AdDailyMetrics.ad_id == Ad.id)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .where(AdSet.campaign_id == campaign_uuid)
            .where(AdDailyMetrics.date >= today - timedelta(days=7))
        )
        res_ads = await db.execute(stmt_ads)
        ad_daily = res_ads.scalars().all()
        
        # Aggregate ad performance
        ad_perf = {}
        for ad_m in ad_daily:
            if ad_m.ad_id not in ad_perf:
                ad_perf[ad_m.ad_id] = {"spend": 0.0, "leads": 0, "purchases": 0, "impressions": 0, "clicks": 0, "revenue": 0.0, "reach": 0}
            ad_perf[ad_m.ad_id]["spend"] += float(ad_m.spend or 0.0)
            ad_perf[ad_m.ad_id]["leads"] += ad_m.leads or 0
            ad_perf[ad_m.ad_id]["purchases"] += ad_m.purchases or 0
            ad_perf[ad_m.ad_id]["impressions"] += ad_m.impressions or 0
            ad_perf[ad_m.ad_id]["clicks"] += ad_m.clicks or 0
            ad_perf[ad_m.ad_id]["revenue"] += float(ad_m.revenue or 0.0)
            ad_perf[ad_m.ad_id]["reach"] += ad_m.reach or 0
            
        # Frequency indicator: Campaign level impressions/reach
        avg_frequency = sum(float(m.frequency or 0) for m in current_metrics) / len(current_metrics) if current_metrics else 1.0
        
        # Identify Winning and Losing Ads
        winning_ads = []
        losing_ads = []
        campaign_avg_cpl = cur_kpis["cpl"]
        
        for ad_id, stats in ad_perf.items():
            ad_spend = stats["spend"]
            ad_leads = stats["leads"]
            ad_purchases = stats["purchases"]
            
            ad_cpl = ad_spend / ad_leads if ad_leads > 0 else ad_spend
            ad_roas = stats["revenue"] / ad_spend if ad_spend > 0 else 0.0
            
            # Fetch actual ad name
            stmt_ad_obj = select(Ad).where(Ad.id == ad_id)
            res_ad_obj = await db.execute(stmt_ad_obj)
            ad_obj = res_ad_obj.scalar_one_or_none()
            ad_name = ad_obj.name if ad_obj else f"Ad {str(ad_id)[:8]}"
            
            # Criteria for winning ad: Spend > 10% of campaign spend, results > 2, and CPL 30% below avg (or ROAS > 3.5)
            if ad_spend > (cur_spend * 0.1) and ((ad_leads >= 2 and ad_cpl < (campaign_avg_cpl * 0.7)) or ad_roas > 3.5):
                winning_ads.append({"id": str(ad_id), "name": ad_name, "cpl": ad_cpl, "roas": ad_roas, "spend": ad_spend})
            # Criteria for losing ad: Spend > 20% of campaign spend, and 0 results
            elif ad_spend > (cur_spend * 0.15) and ad_leads == 0 and ad_purchases == 0:
                losing_ads.append({"id": str(ad_id), "name": ad_name, "spend": ad_spend})

        # ────────────────────────────────────────────────────────────
        # FIRST LAYER INTELLIGENCE GATE (Cost-Control Gate)
        # Check if there is a meaningful event worth reasoning over
        # ────────────────────────────────────────────────────────────
        meaningful_events = []
        
        if cpl_change > 0.15 and cur_kpis["cpl"] > 0:
            meaningful_events.append(f"CPL spike: increased by {cpl_change:.1%}")
        if roas_change < -0.10 and cur_kpis["roas"] > 0:
            meaningful_events.append(f"ROAS drop: declined by {roas_change:.1%}")
        if ctr_change < -0.20:
            meaningful_events.append(f"CTR drop: declined by {ctr_change:.1%}")
        if avg_frequency > 2.2 and ctr_change < -0.05:
            meaningful_events.append(f"Ad fatigue: frequency reached {avg_frequency:.2f} with declining CTR")
        if winning_ads:
            meaningful_events.append(f"Scaling opportunities: winning ad(s) detected ({len(winning_ads)})")
        if losing_ads:
            meaningful_events.append(f"Leaking budget: underperforming ad(s) draining spend ({len(losing_ads)})")
        if cur_spend > 0 and cur_leads == 0 and cur_purchases == 0:
            meaningful_events.append("Zero conversions: campaign is spending without yielding actions")

        # If no meaningful events detected, we exit and avoid Gemini cost
        if not meaningful_events:
            logger.info("AI Optimization gate: no performance change detected. Skipping AI reasoning.", campaign_id=campaign_uuid)
            db.add(AIOptimizationLog(
                user_id=user_uuid,
                ad_account_id=ad_account_uuid,
                campaign_id=campaign_uuid,
                trigger_type="SYNC",
                gemini_model="gemini-1.5-flash",
                recommendations_generated=0,
                status="NO_CHANGE_DETECTED",
                error_message="Campaign running smoothly. No performance anomalies or scaling opportunities detected."
            ))
            config.last_analysis_at = datetime.now(timezone.utc)
            db.add(config)
            await db.commit()
            return False

        logger.info("Meaningful events detected. Running Gemini Flash reasoning...", campaign_id=campaign_uuid, events=meaningful_events)
        
        # ────────────────────────────────────────────────────────────
        # STRUCTURED CONTEXT GENERATION (AI Context Layer)
        # ────────────────────────────────────────────────────────────
        context = {
            "campaign": {
                "id": str(campaign_uuid),
                "name": campaign.name,
                "objective": campaign.objective,
                "status": campaign.status,
                "budget": float(campaign.daily_budget or campaign.lifetime_budget or 0.0),
                "spend": cur_spend,
                "results": cur_leads or cur_purchases or cur_impressions,
                "primary_kpi": config.primary_kpi or ("ROAS" if "CONVERSIONS" in campaign.objective or cur_purchases > 0 else "CPL"),
                "target_cpl": float(config.target_cpl) if config.target_cpl else None,
                "target_cpa": float(config.target_cpa) if config.target_cpa else None,
                "target_roas": float(config.target_roas) if config.target_roas else None
            },
            "performance_7d": {
                "spend": cur_spend,
                "impressions": cur_impressions,
                "clicks": cur_clicks,
                "ctr": cur_kpis["ctr"],
                "cpc": cur_kpis["cpc"],
                "cpm": cur_kpis["cpm"],
                "leads": cur_leads,
                "cpl": cur_kpis["cpl"],
                "purchases": cur_purchases,
                "cpa": cur_kpis["cpa"],
                "roas": cur_kpis["roas"]
            },
            "performance_prev_7d": {
                "spend": prev_spend,
                "leads": prev_leads,
                "cpl": prev_kpis["cpl"],
                "purchases": prev_purchases,
                "cpa": prev_kpis["cpa"],
                "roas": prev_kpis["roas"],
                "ctr": prev_kpis["ctr"]
            },
            "trends": {
                "cpl_change": cpl_change,
                "cpa_change": cpa_change,
                "roas_change": roas_change,
                "ctr_change": ctr_change,
                "cpc_change": cpc_change,
                "spend_change": spend_change,
                "avg_frequency": avg_frequency
            },
            "detected_triggers": meaningful_events,
            "winning_ads": winning_ads,
            "losing_ads": losing_ads,
            "previous_memory": config.memory or {}
        }
        
        # ────────────────────────────────────────────────────────────
        # GEMINI / VERTEX AI CLIENT CALL WITH ROBUST DEV FALLBACK
        # ────────────────────────────────────────────────────────────
        ai_recommendation_dict = None
        gemini_model_used = "gemini-1.5-flash"
        
        # Check settings for API keys or service account to call Google
        token = None
        has_sa = False
        import os
        
        cert_path = settings.FIREBASE_PRIVATE_KEY_PATH or "./firebase-service-account.json"
        if os.path.exists(cert_path):
            try:
                from google.oauth2 import service_account
                from google.auth.transport.requests import Request
                scopes = ["https://www.googleapis.com/auth/cloud-platform"]
                creds = service_account.Credentials.from_service_account_file(cert_path, scopes=scopes)
                creds.refresh(Request())
                token = creds.token
                has_sa = True
            except Exception:
                has_sa = False

        if settings.AI_API_KEY:
            # Call standard Gemini Flash API directly
            api_key = settings.AI_API_KEY
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            prompt = cls._build_ai_prompt(context)
            payload = {
                "contents": {
                    "role": "user",
                    "parts": {
                        "text": prompt
                    }
                },
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            try:
                async with httpx.AsyncClient() as client:
                    r = await client.post(url, json=payload, headers=headers, timeout=25.0)
                    if r.status_code == 200:
                        raw_res = r.json()
                        text_res = raw_res["candidates"][0]["content"]["parts"][0]["text"]
                        ai_recommendation_dict = json.loads(text_res)
                        
                        # Log token counts in AIUsageRecord
                        usage = raw_res.get("usageMetadata", {})
                        in_tok = usage.get("promptTokenCount", 0)
                        out_tok = usage.get("candidatesTokenCount", 0)
                        tot_tok = usage.get("totalTokenCount", 0)
                        est_cost = (in_tok * 0.000000075) + (out_tok * 0.00000030)
                        
                        db.add(AIUsageRecord(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            model="gemini-1.5-flash",
                            request_type="ai_optimization",
                            input_tokens=in_tok,
                            output_tokens=out_tok,
                            total_tokens=tot_tok,
                            estimated_cost=est_cost,
                            credit_charged=0,
                            success=True
                        ))
                    else:
                        logger.error("Gemini direct API call returned error status", status=r.status_code, body=r.text)
                        db.add(AIUsageRecord(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            model="gemini-1.5-flash",
                            request_type="ai_optimization",
                            success=False,
                            error_code="GEMINI_API_ERROR",
                            credit_charged=0
                        ))
            except Exception as ex:
                logger.error("Gemini direct API call exception", error=str(ex))
                db.add(AIUsageRecord(
                    user_id=user_uuid,
                    ad_account_id=ad_account_uuid,
                    model="gemini-1.5-flash",
                    request_type="ai_optimization",
                    success=False,
                    error_code="GEMINI_API_EXCEPTION",
                    credit_charged=0
                ))
                
        elif has_sa and token:
            # Call Vertex AI REST API via service account
            project_id = settings.FIREBASE_PROJECT_ID
            url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{project_id}/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            prompt = cls._build_ai_prompt(context)
            payload = {
                "contents": {
                    "role": "user",
                    "parts": {
                        "text": prompt
                    }
                },
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            try:
                async with httpx.AsyncClient() as client:
                    r = await client.post(url, json=payload, headers=headers, timeout=25.0)
                    if r.status_code == 200:
                        raw_res = r.json()
                        text_res = raw_res["candidates"][0]["content"]["parts"][0]["text"]
                        ai_recommendation_dict = json.loads(text_res)
                        
                        # Log token counts in AIUsageRecord
                        usage = raw_res.get("usageMetadata", {})
                        in_tok = usage.get("promptTokenCount", 0)
                        out_tok = usage.get("candidatesTokenCount", 0)
                        tot_tok = usage.get("totalTokenCount", 0)
                        est_cost = (in_tok * 0.000000075) + (out_tok * 0.00000030)
                        
                        db.add(AIUsageRecord(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            model="gemini-1.5-flash",
                            request_type="ai_optimization",
                            input_tokens=in_tok,
                            output_tokens=out_tok,
                            total_tokens=tot_tok,
                            estimated_cost=est_cost,
                            credit_charged=0,
                            success=True
                        ))
                    else:
                        logger.error("Vertex AI REST API call returned error status", status=r.status_code, body=r.text)
                        db.add(AIUsageRecord(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            model="gemini-1.5-flash",
                            request_type="ai_optimization",
                            success=False,
                            error_code="VERTEX_API_ERROR",
                            credit_charged=0
                        ))
            except Exception as ex:
                logger.error("Vertex AI REST API call exception", error=str(ex))
                db.add(AIUsageRecord(
                    user_id=user_uuid,
                    ad_account_id=ad_account_uuid,
                    model="gemini-1.5-flash",
                    request_type="ai_optimization",
                    success=False,
                    error_code="VERTEX_API_EXCEPTION",
                    credit_charged=0
                ))

        # ────────────────────────────────────────────────────────────
        # HIGH-FIDELITY LOCAL REASONING ENGINE (fallback / local dev support)
        # Runs if Gemini returned errors or credentials aren't set
        # ────────────────────────────────────────────────────────────
        if ai_recommendation_dict is None:
            logger.info("Using local reasoning engine for AI Optimization recommendations")
            ai_recommendation_dict = cls._run_local_reasoning_engine(context, campaign)
            gemini_model_used = "local-simulated-flash"
            
            db.add(AIUsageRecord(
                user_id=user_uuid,
                ad_account_id=ad_account_uuid,
                model="local-simulated-flash",
                request_type="ai_optimization",
                input_tokens=150,
                output_tokens=220,
                total_tokens=370,
                estimated_cost=0.0,
                credit_charged=0,
                success=True
            ))

        # ────────────────────────────────────────────────────────────
        # DEDUPLICATION & REPLAY PROTECTION LAYER
        # ────────────────────────────────────────────────────────────
        recs_added = 0
        if ai_recommendation_dict and "recommendations" in ai_recommendation_dict:
            for rec_data in ai_recommendation_dict["recommendations"]:
                # Generate unique fingerprint to avoid spamming the same recommendation
                # Fingerprint: campaign_uuid + problem_type
                problem_type = rec_data.get("type", "GENERAL_OPTIMIZATION")
                fingerprint = f"{campaign_uuid}_{problem_type}"
                
                # Check if there is an active recommendation (status 'new' or 'viewed') with the same fingerprint
                stmt_dup = (
                    select(AIRecommendation)
                    .where(AIRecommendation.fingerprint == fingerprint)
                    .where(AIRecommendation.status.in_(["new", "viewed"]))
                )
                res_dup = await db.execute(stmt_dup)
                existing_rec = res_dup.scalar_one_or_none()
                
                if existing_rec:
                    # Update existing recommendation in place with fresh metrics/evidence, preventing duplicates
                    logger.info("Updating existing active recommendation rather than creating duplicate", fingerprint=fingerprint)
                    existing_rec.title = rec_data.get("title", existing_rec.title)
                    existing_rec.description = rec_data.get("recommendation", existing_rec.description)
                    existing_rec.reason = rec_data.get("reason", existing_rec.reason)
                    existing_rec.problem = rec_data.get("problem", existing_rec.problem)
                    existing_rec.evidence = rec_data.get("evidence", existing_rec.evidence)
                    existing_rec.expected_impact = rec_data.get("expected_impact", existing_rec.expected_impact)
                    existing_rec.confidence_score = float(rec_data.get("confidence", 0.85))
                    existing_rec.priority = rec_data.get("priority", "medium").lower()
                    existing_rec.supporting_metrics = {
                        "analyzed_at": datetime.now(timezone.utc).isoformat(),
                        "current_kpis": cur_kpis,
                        "previous_kpis": prev_kpis,
                        "trends": context["trends"]
                    }
                    db.add(existing_rec)
                else:
                    # Resolve targeted entities for link generation
                    resolved_entity_id = campaign_uuid
                    resolved_entity_type = "campaign"
                    resolved_adset_id = None
                    resolved_ad_id = None
                    
                    # If recommendation targets an adset or ad specifically
                    entity_ref = rec_data.get("entity", {})
                    target_name = entity_ref.get("name", "")
                    target_type = entity_ref.get("type", "").lower()
                    
                    if target_type == "adset" or target_type == "ad_set":
                        for as_obj in campaign.ad_sets:
                            if as_obj.name.lower() in target_name.lower() or target_name.lower() in as_obj.name.lower():
                                resolved_entity_id = as_obj.id
                                resolved_entity_type = "adset"
                                resolved_adset_id = as_obj.id
                                break
                    elif target_type == "ad":
                        for as_obj in campaign.ad_sets:
                            for ad_obj in as_obj.ads:
                                if ad_obj.name.lower() in target_name.lower() or target_name.lower() in ad_obj.name.lower():
                                    resolved_entity_id = ad_obj.id
                                    resolved_entity_type = "ad"
                                    resolved_adset_id = as_obj.id
                                    resolved_ad_id = ad_obj.id
                                    break
                            if resolved_ad_id:
                                break
                    
                    # Create new AI Recommendation
                    new_rec = AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type=resolved_entity_type,
                        entity_id=resolved_entity_id,
                        campaign_id=campaign_uuid,
                        adset_id=resolved_adset_id,
                        ad_id=resolved_ad_id,
                        recommendation_type="AI_OPTIMIZATION",
                        title=rec_data.get("title", "AI Performance Alert"),
                        description=rec_data.get("recommendation", "Optimize performance metrics."),
                        reason=rec_data.get("reason", "Detected performance change during sync."),
                        problem=rec_data.get("problem"),
                        evidence=rec_data.get("evidence"),
                        expected_impact=rec_data.get("expected_impact"),
                        confidence_score=float(rec_data.get("confidence", 0.80)),
                        priority=rec_data.get("priority", "medium").lower(),
                        supporting_metrics={
                            "analyzed_at": datetime.now(timezone.utc).isoformat(),
                            "current_kpis": cur_kpis,
                            "previous_kpis": prev_kpis,
                            "trends": context["trends"]
                        },
                        status="new",
                        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                        fingerprint=fingerprint
                    )
                    db.add(new_rec)
                    recs_added += 1
            
            # Update Campaign AI Memory
            config.memory = cls._update_campaign_memory(config.memory, ai_recommendation_dict, current_metrics, cur_kpis)
            config.last_analysis_at = datetime.now(timezone.utc)
            db.add(config)
            
            # Audit log for success
            db.add(AIOptimizationLog(
                user_id=user_uuid,
                ad_account_id=ad_account_uuid,
                campaign_id=campaign_uuid,
                trigger_type="SYNC",
                gemini_model=gemini_model_used,
                recommendations_generated=recs_added,
                status="SUCCESS"
            ))
            
            await db.commit()
            return True
            
        return False

    @staticmethod
    def _build_ai_prompt(context: dict) -> str:
        """
        Builds the structured text prompt to send to Gemini Flash.
        """
        return f"""
You are an expert Meta Ads optimization AI. Analyze the following campaign performance context and output optimization recommendations in valid JSON format.

CAMPAIGN DETAILS:
Objective: {context["campaign"]["objective"]}
Target KPI values: CPL={context["campaign"]["target_cpl"]}, CPA={context["campaign"]["target_cpa"]}, ROAS={context["campaign"]["target_roas"]}
Primary Metric: {context["campaign"]["primary_kpi"]}

CURRENT PERFORMANCE (Last 7 Days):
Spend: {context["performance_7d"]["spend"]}
Leads: {context["performance_7d"]["leads"]} (CPL: {context["performance_7d"]["cpl"]})
Purchases: {context["performance_7d"]["purchases"]} (CPA: {context["performance_7d"]["cpa"]})
ROAS: {context["performance_7d"]["roas"]}
CTR: {context["performance_7d"]["ctr"]:.2%}
CPC: {context["performance_7d"]["cpc"]}
CPM: {context["performance_7d"]["cpm"]}

PREVIOUS PERFORMANCE (7 Days Before):
Spend: {context["performance_prev_7d"]["spend"]}
Leads: {context["performance_prev_7d"]["leads"]} (CPL: {context["performance_prev_7d"]["cpl"]})
Purchases: {context["performance_prev_7d"]["purchases"]} (CPA: {context["performance_prev_7d"]["cpa"]})
ROAS: {context["performance_prev_7d"]["roas"]}
CTR: {context["performance_prev_7d"]["ctr"]:.2%}

PERFORMANCE CHANGES & DETECTED EVENTS:
{chr(10).join(context["detected_triggers"])}

BREAKDOWNS:
Winning Ads: {json.dumps(context["winning_ads"])}
Losing Ads: {json.dumps(context["losing_ads"])}

RESPONSE REQUIREMENT:
You must return a single JSON object containing a list of recommendations under the key "recommendations".
Each recommendation must contain:
1. "type": a unique code representing the problem type, e.g. "CPL_SPIKE", "ROAS_DROP", "AD_FATIGUE", "SCALING_OPPORTUNITY", "ZERO_CONVERSIONS".
2. "priority": "critical", "warning", "opportunity", or "info" based on urgency and priority.
3. "confidence": a float between 0.0 and 1.0 indicating your reasoning confidence.
4. "entity": an object specifying the targeted element: {{"type": "campaign" | "adset" | "ad", "name": "Exact Name of the campaign, adset, or ad referenced"}}.
5. "title": a short headline.
6. "problem": clear explanation of the performance issue or scaling chance.
7. "evidence": the metric evidence supporting your conclusion (e.g. "CPL increased by 43% from 150 to 215").
8. "reason": why this happened (fatigue, bid, budget, etc.).
9. "recommendation": step-by-step actionable optimization guidance (recommend actions, do not pause or edit automatically).
10. "expected_impact": expectation of recovery (e.g., "Reduce CPL by 15-20% and regain spend efficiency").

Return ONLY valid JSON. Do not include markdown code block tags.
"""

    @classmethod
    def _run_local_reasoning_engine(cls, context: dict, campaign: Campaign) -> dict:
        """
        Local simulated logic that acts as high-fidelity fallback when Gemini is offline.
        Uses identical thresholds and details to structure Pydantic-valid recommendations.
        """
        recommendations = []
        trends = context["trends"]
        cur_kpis = context["performance_7d"]
        prev_kpis = context["performance_prev_7d"]
        
        # 1. CPL Spike Rule
        if trends["cpl_change"] > 0.15 and cur_kpis["leads"] > 0:
            evidence_str = f"CPL spiked from ₹{prev_kpis['cpl']:.2f} to ₹{cur_kpis['cpl']:.2f} (+{trends['cpl_change']:.1%}) over the last 7 days."
            recommendations.append({
                "type": "CPL_SPIKE",
                "priority": "critical" if trends["cpl_change"] > 0.35 else "warning",
                "confidence": 0.92,
                "entity": {"type": "campaign", "name": campaign.name},
                "title": "Cost Per Lead (CPL) Increase Alert",
                "problem": "Campaign Cost Per Lead has risen significantly, exceeding acceptable thresholds.",
                "evidence": evidence_str,
                "reason": "Increased competition or ad delivery fatigue has pushed up acquisition costs.",
                "recommendation": "Review placement efficiency and consider shifting budget towards top-performing ad sets or pausing underperforming creatives.",
                "expected_impact": "Lower the Cost Per Lead (CPL) back to historical baselines by approximately 15-25%."
            })
            
        # 2. ROAS Drop Rule
        if trends["roas_change"] < -0.10 and cur_kpis["roas"] > 0:
            evidence_str = f"ROAS declined from {prev_kpis['roas']:.2f}x to {cur_kpis['roas']:.2f}x ({trends['roas_change']:.1%}) over the last 7 days."
            recommendations.append({
                "type": "ROAS_DROP",
                "priority": "critical" if trends["roas_change"] < -0.25 else "warning",
                "confidence": 0.88,
                "entity": {"type": "campaign", "name": campaign.name},
                "title": "ROAS Decline Detected",
                "problem": "Return on Ad Spend (ROAS) has dropped, indicating reduced purchase value relative to spend.",
                "evidence": evidence_str,
                "reason": "Conversion rates have cooled down or average order value has declined in the current period.",
                "recommendation": "Refine audience targeting parameters to focus on warm retargeting custom audiences or test high-order offer incentives.",
                "expected_impact": "Improve ROAS by approximately 10-20% through targeted purchasing conversion recovery."
            })

        # 3. Ad Fatigue Rule
        if trends["avg_frequency"] > 2.2 and trends["ctr_change"] < -0.05:
            evidence_str = f"Ad frequency reached {trends['avg_frequency']:.2f} with a {trends['ctr_change']:.1%} decline in Click-Through Rate (CTR)."
            recommendations.append({
                "type": "AD_FATIGUE",
                "priority": "warning",
                "confidence": 0.90,
                "entity": {"type": "campaign", "name": campaign.name},
                "title": "Ad Creative Fatigue Warning",
                "problem": "Audience saturation is occurring, causing click interest to decline as frequency rises.",
                "evidence": evidence_str,
                "reason": "The active target audience has seen the same creatives multiple times, leading to visual blindness.",
                "recommendation": "Launch fresh image or video creative assets to rotate with existing ones, or expand the target audience pool size.",
                "expected_impact": "Restore CTR by 20-30% and reduce acquisition cost inflation by introducing visual freshness."
            })

        # 4. Winning Ads Scaling Opportunity Rule
        for win_ad in context["winning_ads"]:
            evidence_str = f"Ad '{win_ad['name']}' is generating leads at ₹{win_ad['cpl']:.2f} CPL, which is significantly lower than campaign average."
            recommendations.append({
                "type": "SCALING_OPPORTUNITY",
                "priority": "opportunity",
                "confidence": 0.95,
                "entity": {"type": "ad", "name": win_ad["name"]},
                "title": "Scaling Opportunity: High Performer",
                "problem": "An individual ad is significantly outperforming the campaign baseline, presenting a scaling opportunity.",
                "evidence": evidence_str,
                "reason": "High creative relevance and message-to-audience match have resulted in very high conversion efficiency.",
                "recommendation": "Increase daily budget by 15-20% on the ad set hosting this creative, or duplicate the copy/concept to launch variation tests.",
                "expected_impact": "Scale conversion volume by 20-40% while maintaining low cost-per-acquisition efficiency."
            })

        # 5. Budget Leak / Losing Ads Rule
        for lose_ad in context["losing_ads"]:
            evidence_str = f"Ad '{lose_ad['name']}' has drained ₹{lose_ad['spend']:.2f} (>{cur_kpis['spend']*0.15:.0f}%) with zero lead conversions."
            recommendations.append({
                "type": "BUDGET_LEAK",
                "priority": "warning",
                "confidence": 0.94,
                "entity": {"type": "ad", "name": lose_ad["name"]},
                "title": "Budget Leak: Zero conversions ad",
                "problem": "Significant spend is being consumed by an underperforming ad creative with zero conversion results.",
                "evidence": evidence_str,
                "reason": "Low creative engagement or high cost-per-click has resulted in zero downstream conversions.",
                "recommendation": "Pause this specific creative asset to redirect budget automatically to other active top-performing creatives.",
                "expected_impact": "Immediately recover 15-20% of wasted daily spend to boost overall campaign efficiency."
            })

        # Fallback default if nothing triggered
        if not recommendations:
            recommendations.append({
                "type": "GENERAL_OPTIMIZATION",
                "priority": "info",
                "confidence": 0.80,
                "entity": {"type": "campaign", "name": campaign.name},
                "title": "AI Performance Diagnostics Run",
                "problem": "AI Optimization analyzed recent sync metrics and found performance within stable boundaries.",
                "evidence": f"Campaign checked. Current 7D spend is ₹{cur_kpis['spend']:.2f} with leads={cur_kpis['leads']}.",
                "reason": "Metrics show normal variance. No significant spikes or drops detected.",
                "recommendation": "Maintain current bidding and budget settings. Monitor CPC and frequency over the next sync cycles.",
                "expected_impact": "Verify steady delivery state."
            })

        return {"recommendations": recommendations}

    @staticmethod
    def _update_campaign_memory(memory: dict, ai_res: dict, current_metrics: list, cur_kpis: dict) -> dict:
        """
        Updates the campaign's persistent AI memory to maintain context for future sync runs.
        """
        if not memory:
            memory = {
                "first_analyzed_at": datetime.now(timezone.utc).isoformat(),
                "total_runs": 0,
                "historical_alerts": [],
                "target_history": []
            }
            
        memory["total_runs"] = memory.get("total_runs", 0) + 1
        memory["last_analyzed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Log basic historical performance snapshots
        perf_snap = {
            "date": date.today().isoformat(),
            "spend": cur_kpis["spend"],
            "leads": cur_kpis["leads"],
            "cpl": cur_kpis["cpl"],
            "roas": cur_kpis["roas"]
        }
        
        snaps = memory.get("performance_snapshots", [])
        snaps.append(perf_snap)
        # Cap performance snapshot list to last 10 entries to preserve DB storage
        memory["performance_snapshots"] = snaps[-10:]
        
        # Add generated recommendation details to memory
        if ai_res and "recommendations" in ai_res:
            alerts = memory.get("historical_alerts", [])
            for rec in ai_res["recommendations"]:
                alerts.append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "type": rec.get("type"),
                    "priority": rec.get("priority"),
                    "title": rec.get("title")
                })
            memory["historical_alerts"] = alerts[-20:] # Keep last 20 alert summaries
            
        return memory
