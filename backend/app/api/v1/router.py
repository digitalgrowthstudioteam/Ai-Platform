"""
Digital Growth Studio — API v1 Router
Aggregates all v1 API routes.
"""
from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.meta import router as meta_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.ads import router as ads_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.billing import router as billing_router
from app.api.v1.admin import router as admin_router
from app.api.v1.team import router as team_router
from app.api.v1.support import router as support_router
from app.api.v1.notification import router as notification_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.funnel import router as funnel_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(meta_router, prefix="/meta", tags=["Meta Ads Connection"])
api_v1_router.include_router(dashboard_router, tags=["Dashboard Analytics"])
api_v1_router.include_router(campaigns_router, tags=["Campaigns"])
api_v1_router.include_router(ads_router, tags=["Ads"])
api_v1_router.include_router(recommendations_router, tags=["AI Recommendations"])
api_v1_router.include_router(billing_router, tags=["Billing & Subscriptions"])
api_v1_router.include_router(admin_router, tags=["Admin Control Panel"])
api_v1_router.include_router(team_router, tags=["Team Management"])
api_v1_router.include_router(support_router, tags=["Help & Support Tickets"])
api_v1_router.include_router(notification_router, tags=["Notifications"])
api_v1_router.include_router(assistant_router, tags=["AI Assistant"])
api_v1_router.include_router(funnel_router, tags=["Lead Acquisition Funnel"])


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────
@api_v1_router.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Digital Growth Studio API",
        "version": "1.0.0",
    }


# ──────────────────────────────────────────────
# Future route imports will be added here per phase:
#
# Phase 1: from app.api.v1.auth import router as auth_router
# Phase 4: from app.api.v1.meta import router as meta_router
# Phase 6: from app.api.v1.dashboard import router as dashboard_router
# Phase 6: from app.api.v1.campaigns import router as campaigns_router
# Phase 6: from app.api.v1.adsets import router as adsets_router
# Phase 6: from app.api.v1.ads import router as ads_router
# Phase 6: from app.api.v1.creatives import router as creatives_router
# Phase 6: from app.api.v1.insights import router as insights_router
# Phase 8: from app.api.v1.recommendations import router as recommendations_router
# Phase 9: from app.api.v1.billing import router as billing_router
# Phase 10: from app.api.v1.admin import router as admin_router
# ──────────────────────────────────────────────
