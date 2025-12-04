from app.tasks.worker import celery_app
from app.services.backup_service import backup_to_file

@celery_app.task(name="nightly_backup")
def nightly_backup():
    return backup_to_file("backups")
