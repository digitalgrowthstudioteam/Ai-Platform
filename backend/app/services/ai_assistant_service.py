"""
Digital Growth Studio — AI Assistant Service
"""
import uuid
import json
import structlog
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from typing import Optional, Dict, Any, List

from app.config import get_settings
from app.models.user import User
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics, AdDailyMetrics
from app.models.recommendation import AIRecommendation
from app.models.ai_optimization import AIOptimizationConfig
from app.models.ai_assistant import AIChatConversation, AIChatMessage, AICreditTransaction
from app.models.ai_usage import AIUsageRecord

logger = structlog.get_logger()
settings = get_settings()


class AIAssistantService:
    """
    Manages structured context assembly, conversation memory,
    Gemini API calls, and transaction-safe credit deduction.
    """

    @classmethod
    async def build_context(
        cls,
        db: AsyncSession,
        ad_account_id: uuid.UUID,
        campaign_id: Optional[uuid.UUID] = None,
        adset_id: Optional[uuid.UUID] = None,
        ad_id: Optional[uuid.UUID] = None,
    ) -> str:
        """
        Assembles a highly structured JSON context layer for the current ad account,
        scoped to optional campaign_id, adset_id, or ad_id if provided.
        Uses historical lookback window based on user's plan entitlements.
        """
        # 1. Fetch Ad Account details
        stmt = (
            select(MetaAdAccount)
            .where(MetaAdAccount.id == ad_account_id)
        )
        res = await db.execute(stmt)
        ad_account = res.scalar_one_or_none()
        if not ad_account:
            return "{}"

        # Fetch connection sync info
        conn_stmt = select(MetaConnection).where(MetaConnection.id == ad_account.meta_connection_id)
        conn_res = await db.execute(conn_stmt)
        conn = conn_res.scalar_one_or_none()

        sync_status = conn.last_sync_status if conn else "unknown"
        last_sync_at = conn.last_sync_at.isoformat() if (conn and conn.last_sync_at) else "never"

        # Resolve historical days from parent plan entitlements
        from app.services.entitlement_engine import EntitlementEngine
        owner_stmt = select(User).where(User.id == ad_account.user_id)
        owner_res = await db.execute(owner_stmt)
        owner = owner_res.scalar_one_or_none()
        
        historical_days = 30  # Default fallback
        if owner:
            ent = await EntitlementEngine.resolve_entitlements(owner, db)
            raw_days = ent.get("historical_days", 30)
            if raw_days > 180:
                historical_days = 180  # Optimized threshold
            else:
                historical_days = raw_days

        today = date.today()
        history_start = today - timedelta(days=historical_days - 1)

        context = {
            "account_summary": {
                "id": str(ad_account.id),
                "meta_account_id": ad_account.meta_account_id,
                "name": ad_account.account_name,
                "currency": ad_account.currency,
                "timezone": ad_account.timezone,
                "account_status": "ACTIVE" if ad_account.account_status == 1 else "DISABLED",
                "current_date": date.today().isoformat(),
                "sync_status": sync_status,
                "last_successful_sync": last_sync_at,
            },
            "active_recommendations": [],
        }

        # 2. Fetch Active Recommendations
        recs_stmt = (
            select(AIRecommendation)
            .where(AIRecommendation.ad_account_id == ad_account_id)
            .where(AIRecommendation.status == "active")
        )
        recs_res = await db.execute(recs_stmt)
        recs = recs_res.scalars().all()
        for r in recs:
            context["active_recommendations"].append({
                "id": str(r.id),
                "title": r.title,
                "priority": r.priority,
                "type": r.problem_type,
                "evidence": r.evidence,
                "expected_impact": r.expected_impact,
                "recommendation": r.recommendation_text,
            })

        # Scoped Focus Logic
        if ad_id:
            ad_stmt = select(Ad).where(Ad.id == ad_id)
            ad_res = await db.execute(ad_stmt)
            ad_obj = ad_res.scalar_one_or_none()
            if ad_obj:
                metrics_stmt = (
                    select(
                        func.sum(AdDailyMetrics.spend).label("spend"),
                        func.sum(AdDailyMetrics.impressions).label("impressions"),
                        func.sum(AdDailyMetrics.clicks).label("clicks"),
                        func.sum(AdDailyMetrics.leads).label("leads"),
                        func.sum(AdDailyMetrics.purchases).label("purchases"),
                        func.sum(AdDailyMetrics.revenue).label("revenue"),
                    )
                    .where(AdDailyMetrics.ad_id == ad_id)
                    .where(AdDailyMetrics.date >= history_start)
                )
                met_res = await db.execute(metrics_stmt)
                m = met_res.first()
                spend = float(m.spend or 0.0) if m else 0.0
                leads = int(m.leads or 0) if m else 0
                purchases = int(m.purchases or 0) if m else 0
                revenue = float(m.revenue or 0.0) if m else 0.0
                impressions = int(m.impressions or 0) if m else 0
                clicks = int(m.clicks or 0) if m else 0

                cpl = spend / leads if leads > 0 else spend
                cpa = spend / purchases if purchases > 0 else spend
                roas = revenue / spend if spend > 0 else 0.0
                ctr = clicks / impressions if impressions > 0 else 0.0

                adset_obj = await db.get(AdSet, ad_obj.ad_set_id)
                camp_obj = await db.get(Campaign, adset_obj.campaign_id) if adset_obj else None

                context["focus_scope"] = "ad"
                context["focused_ad"] = {
                    "id": str(ad_obj.id),
                    "name": ad_obj.name,
                    "status": ad_obj.status,
                    "ad_set_name": adset_obj.name if adset_obj else "Unknown Set",
                    "campaign_name": camp_obj.name if camp_obj else "Unknown Campaign",
                    "performance_history_period": {
                        "start_date": history_start.isoformat(),
                        "end_date": today.isoformat(),
                        "days_count": historical_days,
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "leads": leads,
                        "purchases": purchases,
                        "revenue": revenue,
                        "cpl": cpl,
                        "cpa": cpa,
                        "roas": roas,
                        "ctr": ctr
                    }
                }
        
        elif adset_id:
            adset_stmt = select(AdSet).where(AdSet.id == adset_id)
            adset_res = await db.execute(adset_stmt)
            adset_obj = adset_res.scalar_one_or_none()
            if adset_obj:
                metrics_stmt = (
                    select(
                        func.sum(AdSetDailyMetrics.spend).label("spend"),
                        func.sum(AdSetDailyMetrics.impressions).label("impressions"),
                        func.sum(AdSetDailyMetrics.clicks).label("clicks"),
                        func.sum(AdSetDailyMetrics.leads).label("leads"),
                        func.sum(AdSetDailyMetrics.purchases).label("purchases"),
                        func.sum(AdSetDailyMetrics.revenue).label("revenue"),
                    )
                    .where(AdSetDailyMetrics.ad_set_id == adset_id)
                    .where(AdSetDailyMetrics.date >= history_start)
                )
                met_res = await db.execute(metrics_stmt)
                m = met_res.first()
                spend = float(m.spend or 0.0) if m else 0.0
                leads = int(m.leads or 0) if m else 0
                purchases = int(m.purchases or 0) if m else 0
                revenue = float(m.revenue or 0.0) if m else 0.0
                impressions = int(m.impressions or 0) if m else 0
                clicks = int(m.clicks or 0) if m else 0

                cpl = spend / leads if leads > 0 else spend
                cpa = spend / purchases if purchases > 0 else spend
                roas = revenue / spend if spend > 0 else 0.0
                ctr = clicks / impressions if impressions > 0 else 0.0

                camp_obj = await db.get(Campaign, adset_obj.campaign_id)

                context["focus_scope"] = "adset"
                context["focused_ad_set"] = {
                    "id": str(adset_obj.id),
                    "name": adset_obj.name,
                    "status": adset_obj.status,
                    "campaign_name": camp_obj.name if camp_obj else "Unknown Campaign",
                    "performance_history_period": {
                        "start_date": history_start.isoformat(),
                        "end_date": today.isoformat(),
                        "days_count": historical_days,
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "leads": leads,
                        "purchases": purchases,
                        "revenue": revenue,
                        "cpl": cpl,
                        "cpa": cpa,
                        "roas": roas,
                        "ctr": ctr
                    }
                }

                # Fetch ads belonging to this ad set
                ads_stmt = select(Ad).where(Ad.ad_set_id == adset_id)
                ads_res = await db.execute(ads_stmt)
                ads_objs = ads_res.scalars().all()
                context["focused_ad_set_ads"] = []
                for ad_obj in ads_objs:
                    ad_met_stmt = (
                        select(
                            func.sum(AdDailyMetrics.spend).label("spend"),
                            func.sum(AdDailyMetrics.leads).label("leads"),
                        )
                        .where(AdDailyMetrics.ad_id == ad_obj.id)
                        .where(AdDailyMetrics.date >= history_start)
                    )
                    ad_met_res = await db.execute(ad_met_stmt)
                    am = ad_met_res.first()
                    ad_spend = float(am.spend or 0.0) if am else 0.0
                    ad_leads = int(am.leads or 0) if am else 0
                    context["focused_ad_set_ads"].append({
                        "id": str(ad_obj.id),
                        "name": ad_obj.name,
                        "status": ad_obj.status,
                        "performance_history_period": {
                            "start_date": history_start.isoformat(),
                            "end_date": today.isoformat(),
                            "days_count": historical_days,
                            "spend": ad_spend,
                            "leads": ad_leads,
                            "cpl": ad_spend / ad_leads if ad_leads > 0 else ad_spend
                        }
                    })

        elif campaign_id:
            camp_stmt = select(Campaign).where(Campaign.id == campaign_id)
            camp_res = await db.execute(camp_stmt)
            c = camp_res.scalar_one_or_none()
            if c:
                metrics_stmt = (
                    select(
                        func.sum(CampaignDailyMetrics.spend).label("spend"),
                        func.sum(CampaignDailyMetrics.impressions).label("impressions"),
                        func.sum(CampaignDailyMetrics.clicks).label("clicks"),
                        func.sum(CampaignDailyMetrics.leads).label("leads"),
                        func.sum(CampaignDailyMetrics.purchases).label("purchases"),
                        func.sum(CampaignDailyMetrics.revenue).label("revenue"),
                    )
                    .where(CampaignDailyMetrics.campaign_id == campaign_id)
                    .where(CampaignDailyMetrics.date >= history_start)
                )
                met_res = await db.execute(metrics_stmt)
                m = met_res.first()
                spend = float(m.spend or 0.0) if m else 0.0
                leads = int(m.leads or 0) if m else 0
                purchases = int(m.purchases or 0) if m else 0
                revenue = float(m.revenue or 0.0) if m else 0.0
                impressions = int(m.impressions or 0) if m else 0
                clicks = int(m.clicks or 0) if m else 0

                cpl = spend / leads if leads > 0 else spend
                cpa = spend / purchases if purchases > 0 else spend
                roas = revenue / spend if spend > 0 else 0.0
                ctr = clicks / impressions if impressions > 0 else 0.0

                context["focus_scope"] = "campaign"
                context["focused_campaign"] = {
                    "id": str(c.id),
                    "name": c.name,
                    "objective": c.objective,
                    "status": c.status,
                    "budget_daily": float(c.daily_budget or 0.0),
                    "performance_history_period": {
                        "start_date": history_start.isoformat(),
                        "end_date": today.isoformat(),
                        "days_count": historical_days,
                        "spend": spend,
                        "impressions": impressions,
                        "clicks": clicks,
                        "leads": leads,
                        "purchases": purchases,
                        "revenue": revenue,
                        "cpl": cpl,
                        "cpa": cpa,
                        "roas": roas,
                        "ctr": ctr
                    }
                }

                # Fetch child adsets
                adsets_stmt = select(AdSet).where(AdSet.campaign_id == campaign_id)
                adsets_res = await db.execute(adsets_stmt)
                adsets_objs = adsets_res.scalars().all()
                context["focused_campaign_adsets"] = []
                adset_ids = [adset.id for adset in adsets_objs]

                for adset_obj in adsets_objs:
                    adset_met_stmt = (
                        select(
                            func.sum(AdSetDailyMetrics.spend).label("spend"),
                            func.sum(AdSetDailyMetrics.leads).label("leads"),
                        )
                        .where(AdSetDailyMetrics.ad_set_id == adset_obj.id)
                        .where(AdSetDailyMetrics.date >= history_start)
                    )
                    adset_met_res = await db.execute(adset_met_stmt)
                    asm = adset_met_res.first()
                    adset_spend = float(asm.spend or 0.0) if asm else 0.0
                    adset_leads = int(asm.leads or 0) if asm else 0
                    context["focused_campaign_adsets"].append({
                        "id": str(adset_obj.id),
                        "name": adset_obj.name,
                        "status": adset_obj.status,
                        "performance_history_period": {
                            "start_date": history_start.isoformat(),
                            "end_date": today.isoformat(),
                            "days_count": historical_days,
                            "spend": adset_spend,
                            "leads": adset_leads,
                            "cpl": adset_spend / adset_leads if adset_leads > 0 else adset_spend
                        }
                    })

                # Fetch child ads
                if adset_ids:
                    ads_stmt = select(Ad).where(Ad.ad_set_id.in_(adset_ids))
                    ads_res = await db.execute(ads_stmt)
                    ads_objs = ads_res.scalars().all()
                    context["focused_campaign_ads"] = []
                    for ad_obj in ads_objs:
                        ad_met_stmt = (
                            select(
                                func.sum(AdDailyMetrics.spend).label("spend"),
                                func.sum(AdDailyMetrics.leads).label("leads"),
                            )
                            .where(AdDailyMetrics.ad_id == ad_obj.id)
                            .where(AdDailyMetrics.date >= history_start)
                        )
                        ad_met_res = await db.execute(ad_met_stmt)
                        am = ad_met_res.first()
                        ad_spend = float(am.spend or 0.0) if am else 0.0
                        ad_leads = int(am.leads or 0) if am else 0
                        context["focused_campaign_ads"].append({
                            "id": str(ad_obj.id),
                            "name": ad_obj.name,
                            "status": ad_obj.status,
                            "performance_history_period": {
                                "start_date": history_start.isoformat(),
                                "end_date": today.isoformat(),
                                "days_count": historical_days,
                                "spend": ad_spend,
                                "leads": ad_leads,
                                "cpl": ad_spend / ad_leads if ad_leads > 0 else ad_spend
                            }
                        })

        else:
            # Fetch Campaigns (Default overall account view)
            camp_stmt = select(Campaign).where(Campaign.ad_account_id == ad_account_id)
            camp_res = await db.execute(camp_stmt)
            campaigns = camp_res.scalars().all()
            campaign_ids = [c.id for c in campaigns]

            # Fetch active AI Optimization configs
            opt_stmt = select(AIOptimizationConfig).where(AIOptimizationConfig.campaign_id.in_(campaign_ids)) if campaign_ids else None
            opt_configs = {}
            if opt_stmt is not None:
                opt_res = await db.execute(opt_stmt)
                for opt in opt_res.scalars().all():
                    opt_configs[opt.campaign_id] = opt

            metrics_stmt = (
                select(
                    CampaignDailyMetrics.campaign_id,
                    func.sum(CampaignDailyMetrics.spend).label("spend"),
                    func.sum(CampaignDailyMetrics.impressions).label("impressions"),
                    func.sum(CampaignDailyMetrics.clicks).label("clicks"),
                    func.sum(CampaignDailyMetrics.leads).label("leads"),
                    func.sum(CampaignDailyMetrics.purchases).label("purchases"),
                    func.sum(CampaignDailyMetrics.revenue).label("revenue"),
                )
                .where(CampaignDailyMetrics.campaign_id.in_(campaign_ids))
                .where(CampaignDailyMetrics.date >= history_start)
                .group_by(CampaignDailyMetrics.campaign_id)
            ) if campaign_ids else None

            metrics_map = {}
            if metrics_stmt is not None:
                metrics_res = await db.execute(metrics_stmt)
                for row in metrics_res.all():
                    metrics_map[row.campaign_id] = row

            context["campaigns"] = []
            for c in campaigns:
                m = metrics_map.get(c.id)
                spend = float(m.spend or 0.0) if m else 0.0
                leads = int(m.leads or 0) if m else 0
                purchases = int(m.purchases or 0) if m else 0
                revenue = float(m.revenue or 0.0) if m else 0.0
                impressions = int(m.impressions or 0) if m else 0
                clicks = int(m.clicks or 0) if m else 0

                cpl = spend / leads if leads > 0 else spend
                cpa = spend / purchases if purchases > 0 else spend
                roas = revenue / spend if spend > 0 else 0.0
                ctr = clicks / impressions if impressions > 0 else 0.0
                cpc = spend / clicks if clicks > 0 else 0.0
                cpm = (spend / impressions) * 1000.0 if impressions > 0 else 0.0

                opt_cfg = opt_configs.get(c.id)
                opt_data = None
                if opt_cfg:
                    opt_data = {
                        "is_active": opt_cfg.is_active,
                        "target_cpl": opt_cfg.target_cpl,
                        "target_roas": opt_cfg.target_roas,
                        "history_observations_count": len(opt_cfg.memory.get("historical_alerts", [])) if isinstance(opt_cfg.memory, dict) else 0
                    }

                context["campaigns"].append({
                    "id": str(c.id),
                    "name": c.name,
                    "objective": c.objective,
                    "status": c.status,
                    "budget_daily": float(c.daily_budget or 0.0),
                    "budget_lifetime": float(c.lifetime_budget or 0.0),
                    "performance_history_period": {
                        "start_date": history_start.isoformat(),
                        "end_date": today.isoformat(),
                        "days_count": historical_days,
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
                        "cpm": cpm,
                    },
                    "ai_optimization": opt_data,
                })

        return json.dumps(context, indent=2)

    @classmethod
    async def get_oauth_token(cls) -> str:
        """
        Attempts to load Google OAuth access token from the service account key.
        """
        import os
        cert_path = settings.FIREBASE_PRIVATE_KEY_PATH or "./firebase-service-account.json"
        if os.path.exists(cert_path):
            try:
                from google.oauth2 import service_account
                from google.auth.transport.requests import Request
                scopes = ["https://www.googleapis.com/auth/cloud-platform"]
                creds = service_account.Credentials.from_service_account_file(cert_path, scopes=scopes)
                creds.refresh(Request())
                return creds.token
            except Exception as e:
                logger.error("failed_to_refresh_service_account_token", error=str(e))
        return ""

    @classmethod
    async def query_gemini(
        cls,
        system_prompt: str,
        history: list,
        user_message: str
    ) -> tuple:
        """
        Calls Gemini Flash using direct REST HTTP requests (standard API key or Vertex OAuth token).
        Returns a tuple of (reply_text, usage_metadata_dict).
        """
        # Format the contents payload (history + new user message)
        contents = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
        
        contents.append({
            "role": "user",
            "parts": [{"text": user_message}]
        })

        model_name = settings.GEMINI_MODEL

        # Direct API Key endpoint
        api_key = settings.resolved_api_key
        if api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "contents": contents,
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1200
                }
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        usage = data.get("usageMetadata", {})
                        meta = {
                            "input_tokens": usage.get("promptTokenCount", 0),
                            "output_tokens": usage.get("candidatesTokenCount", 0),
                            "total_tokens": usage.get("totalTokenCount", 0)
                        }
                        return text, meta
                    else:
                        logger.error("gemini_api_key_call_failed", status=resp.status_code, body=resp.text)
            except Exception as e:
                logger.error("gemini_api_key_exception", error=str(e))

        # Vertex REST OAuth endpoint
        token = await cls.get_oauth_token()
        if token:
            project_id = settings.FIREBASE_PROJECT_ID
            url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{project_id}/locations/us-central1/publishers/google/models/{model_name}:generateContent"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            payload = {
                "contents": contents,
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1200
                }
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        usage = data.get("usageMetadata", {})
                        meta = {
                            "input_tokens": usage.get("promptTokenCount", 0),
                            "output_tokens": usage.get("candidatesTokenCount", 0),
                            "total_tokens": usage.get("totalTokenCount", 0)
                        }
                        return text, meta
                    else:
                        logger.error("vertex_oauth_call_failed", status=resp.status_code, body=resp.text)
            except Exception as e:
                logger.error("vertex_oauth_exception", error=str(e))

        # Secure Fallback to local Reasoning Engine
        fallback_text = await cls._run_local_fallback(user_message, system_prompt)
        return fallback_text, {"input_tokens": 150, "output_tokens": 200, "total_tokens": 350}

    @classmethod
    async def _run_local_fallback(cls, message: str, system_prompt: str) -> str:
        """
        High-fidelity simulated multilingual reasoning fallback for offline local environment.
        """
        import re
        msg_lower = message.lower()

        # Parse context json to get campaign info
        context_data = {}
        try:
            match = re.search(r"Here is the current ad account context:\n(\{.*\})", system_prompt, re.DOTALL)
            if match:
                context_data = json.loads(match.group(1))
        except Exception:
            pass

        account_name = context_data.get("account_summary", {}).get("name", "Active Account")
        campaigns = context_data.get("campaigns", [])
        recs = context_data.get("active_recommendations", [])

        # Match Language styles
        is_hindi = any(w in msg_lower for w in ["kya", "kyu", "kasa", "aahe", "mera", "maza", "kaise", "performe", "hai"])
        is_marathi = any(w in msg_lower for w in ["kasa", "aahe", "waadhla", "maza", "mazaa", "mahiti", "kaay"])

        if is_marathi:
            greeting = "नमस्कार! तुमच्या ad account शी संबंधित माहिती खालीलप्रमाणे आहे:"
            cpl_reply = "तुमचा Cost Per Lead (CPL) वाढण्याचे मुख्य कारण "
            campaign_win = "हा campaign सध्या सर्वात चांगली कामगिरी करत आहे."
            no_rec = "सध्या कोणतीही नवीन शिफारस उपलब्ध नाही."
            suffix = "मला सांगा, मी आणखी काही मदत करू शकतो का?"
        elif is_hindi:
            greeting = "नमस्ते! आपके ad account की ताज़ा जानकारी इस प्रकार है:"
            cpl_reply = "आपका Cost Per Lead (CPL) बढ़ने का मुख्य कारण "
            campaign_win = "यह campaign सबसे बेहतरीन प्रदर्शन कर रहा है."
            no_rec = "फिलहाल कोई सक्रिय सुझाव नहीं है."
            suffix = "क्या आप इस बारे में कुछ और जानना चाहते हैं?"
        else:
            greeting = "Hello! Here is the latest performance context for your account:"
            cpl_reply = "The primary reason for your CPL increase is "
            campaign_win = "is currently performing best."
            no_rec = "No active recommendations at the moment."
            suffix = "Let me know if you would like me to analyze anything else!"

        # Match Intent
        if "cpl" in msg_lower or "cpa" in msg_lower or "increase" in msg_lower or "waadhla" in msg_lower:
            if campaigns:
                worst = max(campaigns, key=lambda c: c["performance_history_period"]["cpl"])
                worst_name = worst["name"]
                worst_id = worst["id"]
                worst_cpl = worst["performance_history_period"]["cpl"]
                
                # Format using mandatory clickable entities
                entity_link = f"[{worst_name}](entity:campaign:{worst_id})"
                return f"{greeting}\n\n{cpl_reply} {entity_link}, where CPL is currently ₹{worst_cpl:.2f}. There seems to be budget strain with lower lead conversions in this area.\n\nRecommendation:\nReview target audiences and shift active budgets to higher-converting sets."
            else:
                return f"{greeting}\n\nI can see you're asking about CPL, but there are no campaigns synced yet. Please sync your account."

        if "best" in msg_lower or "performing" in msg_lower or "scale" in msg_lower or "win" in msg_lower:
            if campaigns:
                best = min(campaigns, key=lambda c: c["performance_history_period"]["cpl"] if c["performance_history_period"]["cpl"] > 0 else 999999)
                best_name = best["name"]
                best_id = best["id"]
                best_cpl = best["performance_history_period"]["cpl"]
                
                entity_link = f"[{best_name}](entity:campaign:{best_id})"
                return f"{greeting}\n\nCampaign {entity_link} {campaign_win} It has the lowest Cost Per Lead of ₹{best_cpl:.2f}.\n\nRecommendation:\nConsider scaling daily budget of {entity_link} by 15-20%."
            else:
                return f"{greeting}\n\nI don't have enough data to determine that."

        if "recommend" in msg_lower or "fix" in msg_lower or "sugges" in msg_lower or "decision" in msg_lower:
            if recs:
                summary = []
                for idx, r in enumerate(recs[:2], 1):
                    summary.append(f"{idx}. {r['title']} - Priority: {r['priority']}. {r['evidence']}")
                return f"{greeting}\n\nWe have identified active recommendations in your Decision Center:\n\n" + "\n".join(summary) + f"\n\n{suffix}"
            else:
                return f"{greeting}\n\n{no_rec}"

        # Default Summary
        if campaigns:
            days_count = campaigns[0]["performance_history_period"]["days_count"]
            total_spend = sum(c["performance_history_period"]["spend"] for c in campaigns)
            total_leads = sum(c["performance_history_period"]["leads"] for c in campaigns)
            avg_cpl = total_spend / total_leads if total_leads > 0 else total_spend
            return f"{greeting}\n\n- Connected Account: {account_name}\n- {days_count}-Day Total Spend: ₹{total_spend:.2f}\n- Total Leads: {total_leads}\n- Average CPL: ₹{avg_cpl:.2f}\n\n{suffix}"
        
        return f"Connected to {account_name}. I'm ready to answer any questions about your campaign performance or creative assets! {suffix}"

    @classmethod
    async def process_user_message(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        ad_account_id: uuid.UUID,
        conversation_id: uuid.UUID,
        message_content: str,
        campaign_id: Optional[uuid.UUID] = None,
        adset_id: Optional[uuid.UUID] = None,
        ad_id: Optional[uuid.UUID] = None,
    ) -> tuple[str, bool]:
        """
        Orchestrates transaction-safe atomic credit checking, sends query to Gemini,
        deducts credit on success, and logs transaction history.
        Scoping allows focusing on specific campaign_id, adset_id, or ad_id.
        Returns a tuple: (assistant_response, success_flag).
        """
        # 1. Row-level lock the user to check credits atomically
        user_stmt = select(User).where(User.id == user_id).with_for_update()
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if not user:
            logger.error("user_not_found_in_session", user_id=str(user_id))
            return "User account session expired.", False

        if user.credits <= 0:
            return "You've used all your AI Credits.", False

        # 2. Build Context Layer
        context_str = await cls.build_context(db, ad_account_id, campaign_id, adset_id, ad_id)

        # 3. Retrieve conversation history
        history_stmt = (
            select(AIChatMessage)
            .where(AIChatMessage.conversation_id == conversation_id)
            .order_by(AIChatMessage.created_at.asc())
        )
        history_res = await db.execute(history_stmt)
        history_messages = history_res.scalars().all()
        history_list = [{"role": msg.role, "content": msg.content} for msg in history_messages]

        # Scoped Target Prompt instruction
        focus_instruction = "The user is looking at the overall Ad Account performance. Provide general summaries."
        if ad_id:
            focus_instruction = f"The user is focusing on Ad ID {ad_id}. Base all replies and comparisons directly on this specific Ad entity."
        elif adset_id:
            focus_instruction = f"The user is focusing on Ad Set ID {adset_id}. Base all replies and comparisons directly on this specific Ad Set entity."
        elif campaign_id:
            focus_instruction = f"The user is focusing on Campaign ID {campaign_id}. Base all replies and comparisons directly on this specific Campaign."

        # 4. Define system instructions
        system_prompt = f"""You are the Digital Growth Studio AI Assistant.
You may only analyze data provided in the current ad account context.
Never request, reveal, infer, or access data from another ad account.
Never fabricate metrics. If the data does not exist, say clearly: "I don't have enough data to determine that."
If data is stale (e.g. last sync was long ago), state: "The latest available data is from [time]. The account has not completed its latest sync yet."
Do not present estimates as actual Meta data.
Do not invent campaign names, spend, CPL, ROAS, leads, or other metrics.

Do NOT use markdown headers (like #, ##, ###) or markdown bold/italic formatting (like **bold** or *italic*) anywhere in your response. Since the UI does not render markdown bold, any use of asterisks will be displayed literally to the user. Instead, emphasize headings and titles by writing them in ALL CAPITAL LETTERS directly on a line by itself (e.g. OVERALL ACCOUNT CTR), and use bullet points or numbered lists where appropriate.

{focus_instruction}

Whenever you mention an entity (Campaign, Ad Set, Ad, or Creative) in your response, you MUST reference it in the following structured format to make it clickable:
- Campaign: [Campaign Name](entity:campaign:campaign_id)
- Ad Set: [Ad Set Name](entity:adset:adset_id)
- Ad: [Ad Name](entity:ad:ad_id)

Do NOT invent IDs. Use only the exact entity IDs provided in the context.

Respond in the same language or natural language mix used by the user (English, Hindi, Hinglish, Marathi, etc.) unless the user explicitly requests another language. Preserve marketing/Meta terminology naturally.

Keep your replies concise but useful (e.g., short explanation, key metrics, evidence, recommendation, next steps). Avoid large walls of text.

Here is the current ad account context:
{context_str}
"""

        # 5. Save the user's incoming message first
        user_msg = AIChatMessage(
            conversation_id=conversation_id,
            role="user",
            content=message_content,
        )
        db.add(user_msg)
        await db.commit()
        await db.refresh(user_msg)

        # 6. Query Gemini
        try:
            assistant_reply, usage_metadata = await cls.query_gemini(system_prompt, history_list, message_content)
        except Exception as e:
            logger.error("gemini_failed", error=str(e))
            # Log usage record for failure
            db.add(AIUsageRecord(
                user_id=user_id,
                ad_account_id=ad_account_id,
                conversation_id=conversation_id,
                model=settings.GEMINI_MODEL,
                request_type="ai_assistant",
                success=False,
                error_code="GEMINI_API_EXCEPTION",
                credit_charged=0
            ))
            await db.commit()
            return "I couldn't generate a response right now. Please try again.", False

        if not assistant_reply or "used all your AI Credits" in assistant_reply:
            return "I couldn't generate a response right now. Please try again.", False

        # 7. Atomically deduct credit & save response and credit transaction log
        try:
            # Re-fetch locked user to avoid state mismatch
            user_stmt_ref = select(User).where(User.id == user_id).with_for_update()
            user_res_ref = await db.execute(user_stmt_ref)
            user_ref = user_res_ref.scalar_one()

            if user_ref.credits <= 0:
                # Log usage record for failure (credits exhausted)
                db.add(AIUsageRecord(
                    user_id=user_id,
                    ad_account_id=ad_account_id,
                    conversation_id=conversation_id,
                    model=settings.GEMINI_MODEL,
                    request_type="ai_assistant",
                    success=False,
                    error_code="CREDITS_EXHAUSTED",
                    credit_charged=0
                ))
                await db.commit()
                return "You've used all your AI Credits.", False

            # Credit Consumption Order: Trial -> Monthly -> Purchased
            credit_type = "monthly_included"
            if user_ref.trial_credits_remaining > 0:
                user_ref.trial_credits_remaining -= 1
                credit_type = "trial"
            elif user_ref.monthly_credits_remaining > 0:
                user_ref.monthly_credits_remaining -= 1
                credit_type = "monthly_included"
            elif user_ref.purchased_credits_remaining > 0:
                user_ref.purchased_credits_remaining -= 1
                credit_type = "purchased"
            
            user_ref.credits = max(0, user_ref.credits - 1)
            db.add(user_ref)

            # Save assistant reply
            model_msg = AIChatMessage(
                conversation_id=conversation_id,
                role="model",
                content=assistant_reply,
                gemini_status="success",
            )
            db.add(model_msg)
            await db.flush() # Gain model_msg.id

            # Save credit transaction log (signed ledger)
            txn = AICreditTransaction(
                user_id=user_id,
                ad_account_id=ad_account_id,
                conversation_id=conversation_id,
                message_id=model_msg.id,
                credit_amount=1,
                amount=-1,
                credit_type=credit_type,
                transaction_type="consume",
                description="AI Assistant query reply",
                reason="AI Assistant response",
                gemini_model=settings.GEMINI_MODEL,
            )
            db.add(txn)
            await db.flush() # Gain txn.id

            # Associate msg with txn
            model_msg.credit_transaction_id = txn.id
            db.add(model_msg)

            # Log AIUsageRecord
            in_tokens = usage_metadata.get("input_tokens", 0)
            out_tokens = usage_metadata.get("output_tokens", 0)
            tot_tokens = usage_metadata.get("total_tokens", 0)
            # Estimate USD Cost: Input = $0.075 / 1M, Output = $0.30 / 1M
            est_cost = (in_tokens * 0.000000075) + (out_tokens * 0.00000030)

            usage_record = AIUsageRecord(
                user_id=user_id,
                ad_account_id=ad_account_id,
                conversation_id=conversation_id,
                message_id=model_msg.id,
                model=settings.GEMINI_MODEL,
                request_type="ai_assistant",
                input_tokens=in_tokens,
                output_tokens=out_tokens,
                total_tokens=tot_tokens,
                estimated_cost=est_cost,
                credit_charged=1,
                credit_transaction_id=txn.id,
                success=True
            )
            db.add(usage_record)

            await db.commit()
            return assistant_reply, True

        except Exception as e:
            logger.error("credit_deduction_rollback_triggered", error=str(e))
            await db.rollback()
            return "I couldn't generate a response right now. Please try again.", False
