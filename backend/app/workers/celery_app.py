"""
Digital Growth Studio — Celery Application Config
"""
from celery import Celery
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
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    
    # Celery Beat scheduling: run daily
    beat_schedule={
        "trigger-daily-syncs": {
            "task": "app.workers.tasks.trigger_all_active_syncs",
            "schedule": 86400.0, # Every 24 hours
        }
    }
)
