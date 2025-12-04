from celery import Celery
from app.core.config import settings

# Include task modules so the worker registers them on startup
celery_app = Celery(
    "hrms",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.backup",
        "app.tasks.email",
        "app.tasks.security",
        # Load beat schedule configuration
        "app.tasks.beat",
    ],
)
