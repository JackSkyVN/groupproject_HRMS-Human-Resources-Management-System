from celery.schedules import crontab
from app.tasks.worker import celery_app
import app.tasks.backup  # noqa: F401 - ensure task registration

celery_app.conf.beat_schedule = {
    "nightly-backup": {
        "task": "nightly_backup",
        "schedule": crontab(hour=2, minute=0),
    },
    "verify-attendance-logs": {
        "task": "verify_attendance_logs",
        "schedule": crontab(minute="*/10"),  # Chạy mỗi 10 phút
    },
}
