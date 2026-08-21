"""
Digital Growth Studio — AI Ads Optimizer
FastAPI Application Entry Point
"""
import structlog
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import close_db
from app.api.v1.router import api_v1_router

settings = get_settings()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.APP_ENV == "development"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown events."""
    logger.info(
        "application_starting",
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )
    from app.core.firebase import initialize_firebase
    initialize_firebase(settings.FIREBASE_PRIVATE_KEY_PATH)

    # Seed admin pricing configurations dynamically
    from app.database import async_session_factory
    from app.services.config_seeder import seed_admin_configs
    async with async_session_factory() as db_session:
        try:
            await seed_admin_configs(db_session)
        except Exception as seed_err:
            logger.error("database_config_seeding_failed", error=seed_err)


    # Initialize background check task to run sync checks periodically (fallback if celery beat is offline)
    async def periodic_check_loop():
        # Pause briefly on startup to let server bind and resolve db connections
        await asyncio.sleep(30)
        from app.workers.tasks import trigger_all_active_syncs_async
        while True:
            try:
                logger.info("background_sync_interval_check_triggered")
                await trigger_all_active_syncs_async()
            except Exception as loop_err:
                logger.error("background_sync_interval_check_failed", error=str(loop_err))
            # Wait 15 minutes between check cycles
            await asyncio.sleep(900)

    sync_check_task = asyncio.create_task(periodic_check_loop())

    yield
    # Shutdown
    logger.info("application_shutting_down")
    sync_check_task.cancel()
    await close_db()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered Meta Ads analytics and optimization platform",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url="/redoc" if settings.APP_ENV == "development" else None,
    lifespan=lifespan,
)

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import Response

class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin")
        if request.method == "OPTIONS":
            response = Response(status_code=200)
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin, X-Requested-With, X-CSRF-Token"
            return response
        
        response = await call_next(request)
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

app.add_middleware(CustomCORSMiddleware)

# Mount API v1 router
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.APP_ENV == "development" else None,
    }
