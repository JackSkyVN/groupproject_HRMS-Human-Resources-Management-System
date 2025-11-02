from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.email_schema import (
    EmailSendRequest,
    AttendanceNotificationRequest,
    BackupNotificationRequest,
    ValidationReportRequest
)
from app.middleware.rbac_middleware import get_current_user, require_edit
from app.services.email_service import EmailService

router = APIRouter(prefix="/email", tags=["Email"])


@router.post("/send")
async def send_email(
    email_data: EmailSendRequest,
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """Send a custom email (requires edit permission on system)."""
    email_service = EmailService()
    success = await email_service.send_email(
        to_emails=[str(email) for email in email_data.to_emails],
        subject=email_data.subject,
        body_text=email_data.body_text,
        body_html=email_data.body_html,
        cc_emails=[str(email) for email in email_data.cc_emails] if email_data.cc_emails else None,
        bcc_emails=[str(email) for email in email_data.bcc_emails] if email_data.bcc_emails else None
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )
    
    return {"message": "Email sent successfully"}


@router.post("/attendance-notification")
async def send_attendance_notification(
    notification_data: AttendanceNotificationRequest,
    current_user: dict = Depends(require_edit("attendance")),
    db: Session = Depends(get_db)
):
    """Send attendance notification email (requires edit permission on attendance)."""
    email_service = EmailService()
    success = await email_service.send_attendance_notification(
        employee_email=str(notification_data.employee_email),
        employee_name=notification_data.employee_name,
        check_in_time=notification_data.check_in_time,
        status=notification_data.status
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send attendance notification"
        )
    
    return {"message": "Attendance notification sent successfully"}


@router.post("/backup-notification")
async def send_backup_notification(
    notification_data: BackupNotificationRequest,
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """Send backup notification email (requires edit permission on system)."""
    email_service = EmailService()
    success = await email_service.send_backup_notification(
        admin_emails=[str(email) for email in notification_data.admin_emails],
        backup_status=notification_data.backup_status,
        backup_file_path=notification_data.backup_file_path,
        error_message=notification_data.error_message
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send backup notification"
        )
    
    return {"message": "Backup notification sent successfully"}


@router.post("/validation-report")
async def send_validation_report(
    report_data: ValidationReportRequest,
    current_user: dict = Depends(require_edit("system")),
    db: Session = Depends(get_db)
):
    """Send attendance validation report email (requires edit permission on system)."""
    email_service = EmailService()
    success = await email_service.send_validation_report(
        admin_emails=[str(email) for email in report_data.admin_emails],
        report_data=report_data.report_data
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send validation report"
        )
    
    return {"message": "Validation report sent successfully"}

