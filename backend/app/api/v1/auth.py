"""
Digital Growth Studio — Authentication Router
Endpoints for verifying user identity.
"""
import structlog
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas.auth import UserMeResponse

logger = structlog.get_logger()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserMeResponse)
async def get_my_profile(claims: dict = Depends(get_current_user)):
    """
    Get current logged-in user profile from Firebase token claims.
    Secured route.
    """
    logger.info("get_profile_called", uid=claims.get("uid"))
    
    return {
        "uid": claims.get("uid"),
        "email": claims.get("email"),
        "name": claims.get("name"),
        "picture": claims.get("picture"),
    }
