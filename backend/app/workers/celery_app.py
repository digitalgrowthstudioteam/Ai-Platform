"""
Digital Growth Studio — Celery Application Config
"""
from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

settings = get_settings()

# Initialize Celery Application
celery_app = Celery(
    "digital_growth_studio_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

# Optional configuration tune-up
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=False,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    
    # Celery Beat scheduling: run periodic checks
    beat_schedule={
        "trigger-periodic-syncs": {
            "task": "app.workers.tasks.trigger_all_active_syncs",
            "schedule": 900.0, # Every 15 minutes
        },
        "trigger-daily-force-sync": {
            "task": "app.workers.tasks.force_sync_all_accounts_task",
            "schedule": crontab(hour=0, minute=1), # Daily at 12:01 AM IST
        }
    }
)
