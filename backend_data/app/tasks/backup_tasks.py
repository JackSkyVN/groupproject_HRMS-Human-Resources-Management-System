"""
Celery tasks for scheduled backups and email notifications
"""
from celery import Celery
from sqlalchemy.orm import Session
from app.db.base import SessionLocal
from app.services.backup_service import BackupService
from app.services.email_service import EmailService
from app.core.config import settings

celery_app = Celery(
    "hrms_backend",
    broker=settings.redis_url,
    backend=settings.redis_url
)


@celery_app.task
def scheduled_backup(backup_type: str = "full"):
    """Scheduled task to create database backup."""
    db = SessionLocal()
    try:
        backup_service = BackupService()
        backup_record = backup_service.create_backup(db, backup_type)
        
        if backup_record:
            # Send notification email
            email_service = EmailService()
            admin_emails = [settings.smtp_from_email] if settings.smtp_from_email else []
            
            if admin_emails:
                await email_service.send_backup_notification(
                    admin_emails=admin_emails,
                    backup_status=backup_record.status,
                    backup_file_path=backup_record.backup_file_path,
                    error_message=backup_record.error_message
                )
            
            return {"status": "success", "backup_id": backup_record.id}
        else:
            return {"status": "failed"}
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


@celery_app.task
def cleanup_old_backups():
    """Scheduled task to clean up old backup files."""
    db = SessionLocal()
    try:
        backup_service = BackupService()
        deleted_count = backup_service.cleanup_old_backups(db)
        return {"status": "success", "deleted_count": deleted_count}
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


@celery_app.task
def daily_validation_report():
    """Scheduled task to run daily attendance validation and send report."""
    from datetime import datetime, date
    from app.services.attendance_validation_service import AttendanceValidationService
    from app.db.models import AttendanceLog, AttendanceSnapshot
    
    db = SessionLocal()
    try:
        today = date.today()
        start_datetime = datetime.combine(today, datetime.min.time())
        end_datetime = datetime.combine(today, datetime.max.time())
        
        # Get all logs for today
        logs = db.query(AttendanceLog).filter(
            AttendanceLog.check_in_time >= start_datetime,
            AttendanceLog.check_in_time <= end_datetime
        ).all()
        
        # Get all snapshots for today
        snapshots = db.query(AttendanceSnapshot).filter(
            AttendanceSnapshot.capture_time >= start_datetime,
            AttendanceSnapshot.capture_time <= end_datetime
        ).all()
        
        validation_service = AttendanceValidationService()
        
        # Validate logs
        valid_logs = 0
        invalid_logs = 0
        errors = []
        
        for log in logs:
            result = validation_service.validate_attendance_log(db, log.id)
            if result["valid"]:
                valid_logs += 1
            else:
                invalid_logs += 1
                errors.extend([f"Log {log.id}: {e}" for e in result["errors"]])
        
        # Validate snapshots
        valid_snapshots = 0
        invalid_snapshots = 0
        
        for snapshot in snapshots:
            result = validation_service.validate_snapshot(db, snapshot.id)
            if result["valid"]:
                valid_snapshots += 1
            else:
                invalid_snapshots += 1
                errors.extend([f"Snapshot {snapshot.id}: {e}" for e in result["errors"]])
        
        # Send report email
        email_service = EmailService()
        admin_emails = [settings.smtp_from_email] if settings.smtp_from_email else []
        
        if admin_emails:
            report_data = {
                "date": today.isoformat(),
                "total_logs": len(logs),
                "valid_logs": valid_logs,
                "invalid_logs": invalid_logs,
                "total_snapshots": len(snapshots),
                "valid_snapshots": valid_snapshots,
                "invalid_snapshots": invalid_snapshots,
                "errors": errors[:50]  # Limit to first 50 errors
            }
            
            await email_service.send_validation_report(
                admin_emails=admin_emails,
                report_data=report_data
            )
        
        return {
            "status": "success",
            "date": today.isoformat(),
            "total_logs": len(logs),
            "valid_logs": valid_logs,
            "invalid_logs": invalid_logs
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

