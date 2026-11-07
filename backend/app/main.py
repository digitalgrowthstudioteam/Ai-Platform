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

    # Ensure platform tables and newly added schema fields exist in production database
    from app.database import engine, Base
    import sqlalchemy as sa
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            migration_statements = [
                "ALTER TABLE platform_products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES platform_product_variants(id) ON DELETE SET NULL;",
                "ALTER TABLE platform_order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255);",
                "ALTER TABLE platform_vendors ADD COLUMN IF NOT EXISTS free_shipping_threshold DOUBLE PRECISION;",
                "ALTER TABLE platform_vendors ADD COLUMN IF NOT EXISTS standard_shipping_fee DOUBLE PRECISION NOT NULL DEFAULT 0.0;",
                "ALTER TABLE platform_vendors ADD COLUMN IF NOT EXISTS cod_handling_fee DOUBLE PRECISION NOT NULL DEFAULT 0.0;",
                "ALTER TABLE platform_vendors ADD COLUMN IF NOT EXISTS min_order_value DOUBLE PRECISION NOT NULL DEFAULT 0.0;",
                "ALTER TABLE platform_vendors ADD COLUMN IF NOT EXISTS allowed_countries TEXT NOT NULL DEFAULT 'India';",
                "ALTER TABLE platform_vendors ADD COLUMN IF NOT EXISTS estimated_delivery_days VARCHAR(100) NOT NULL DEFAULT '3-5 Business Days';",
                "ALTER TABLE platform_vendors ADD COLUMN IF NOT EXISTS serviceable_pincodes TEXT;",
                "ALTER TABLE platform_vendor_profiles ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);",
                "ALTER TABLE platform_vendor_profiles ADD COLUMN IF NOT EXISTS brand_name_locked BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_vendor_profiles ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);",
                "ALTER TABLE platform_vendor_profiles ADD COLUMN IF NOT EXISTS whatsapp_business_name VARCHAR(255);",
                "ALTER TABLE platform_vendor_profiles ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);",
                "ALTER TABLE platform_vendor_profiles ADD COLUMN IF NOT EXISTS has_payment_gateway VARCHAR(50) DEFAULT 'No';",
                "ALTER TABLE platform_vendor_profiles ADD COLUMN IF NOT EXISTS needs_delivery_help VARCHAR(50) DEFAULT 'No';",
                "ALTER TABLE platform_vendor_app_configs ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_plans ADD COLUMN IF NOT EXISTS setup_fee_sale_price_inr DOUBLE PRECISION NOT NULL DEFAULT 2000.0;",
                "ALTER TABLE platform_plans ADD COLUMN IF NOT EXISTS yearly_price_inr DOUBLE PRECISION NOT NULL DEFAULT 4990.0;",
                "ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_waived BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_custom_price_inr DOUBLE PRECISION;",
                "ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_paid_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);",
                "ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);",
                "ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(100);",
                "ALTER TABLE platform_vendor_app_configs ADD COLUMN IF NOT EXISTS apk_download_url VARCHAR(500);",
                "ALTER TABLE platform_vendor_app_configs ADD COLUMN IF NOT EXISTS apk_submitted_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE platform_vendor_app_configs ADD COLUMN IF NOT EXISTS apk_user_approved BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_vendor_app_configs ADD COLUMN IF NOT EXISTS apk_user_approved_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE platform_vendor_app_configs ADD COLUMN IF NOT EXISTS subscription_auto_debit_active BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);",
                "ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);",
                "ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS tracking_url VARCHAR(500);",
                "ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE platform_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE platform_vendor_profiles ALTER COLUMN logo_url TYPE TEXT;",
                "ALTER TABLE platform_stores ALTER COLUMN logo_url TYPE TEXT;",
                "ALTER TABLE platform_stores ALTER COLUMN banner_url TYPE TEXT;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS razorpay_key_secret VARCHAR(255);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS razorpay_verified BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS privacy_policy TEXT;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS shipping_policy TEXT;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS refund_policy TEXT;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS meta_pixel_id VARCHAR(100);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS gtm_id VARCHAR(100);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS ga4_id VARCHAR(100);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS custom_domain_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS custom_domain_status VARCHAR(50) NOT NULL DEFAULT 'UNCONFIGURED';",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS custom_domain_ssl_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS custom_domain_dns_target VARCHAR(255) NOT NULL DEFAULT 'cname.digitalgrowthstudio.in';",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS email_provider VARCHAR(50) NOT NULL DEFAULT 'PLATFORM';",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS smtp_from_email VARCHAR(255);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255);",
                "ALTER TABLE platform_customers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);",
                "ALTER TABLE platform_customers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);",
                "ALTER TABLE platform_customers ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100);",
                "ALTER TABLE platform_customers ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;",
                "ALTER TABLE platform_coupons ADD COLUMN IF NOT EXISTS addon_id UUID REFERENCES platform_addons(id) ON DELETE SET NULL;",
                "ALTER TABLE platform_coupons ADD COLUMN IF NOT EXISTS one_time_per_vendor BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_vendor_app_configs ALTER COLUMN app_logo_url TYPE TEXT;",
                "ALTER TABLE platform_vendor_app_configs ALTER COLUMN splash_screen_url TYPE TEXT;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_gateway_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_provider VARCHAR(50) NOT NULL DEFAULT 'FAST2SMS';",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_api_key VARCHAR(255);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_sender_id VARCHAR(50);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_custom_url VARCHAR(500);",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_order_placed_active BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_order_dispatched_active BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_welcome_active BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_otp_active BOOLEAN NOT NULL DEFAULT TRUE;",
                "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS whatsapp_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
            ]
            for stmt in migration_statements:
                try:
                    await conn.execute(sa.text(stmt))
                except Exception as stmt_err:
                    logger.warning("column_migration_notice", statement=stmt, error=str(stmt_err))
    except Exception as db_sync_err:
        logger.error("database_table_sync_failed", error=str(db_sync_err))

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

from fastapi.middleware.cors import CORSMiddleware

# Official ASGI CORSMiddleware ensuring all preflight, normal, and error responses include full CORS headers
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount API v1 router
app.include_router(api_v1_router, prefix="/api/v1")

# Direct mount for public store & Android app endpoints (/api/store/{slug}/*)
from app.api.store.endpoints import router as public_store_router
app.include_router(public_store_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.APP_ENV == "development" else None,
    }


@app.get("/health", tags=["Health"])
@app.get("/api/v1/ping", tags=["Health"])
async def health_ping():
    """Lightweight 24/7 keep-alive and health check endpoint."""
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "service": "digital-growth-studio-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "warm": True,
    }
