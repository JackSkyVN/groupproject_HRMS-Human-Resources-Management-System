from celery import Celery
from app.core.config import settings

# Include task modules để worker đăng ký chúng khi khởi động
celery_app = Celery(
    "hrms",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.backup",
        "app.tasks.email",
        "app.tasks.security",
        # Tải beat schedule
        "app.tasks.beat",
    ],
)
