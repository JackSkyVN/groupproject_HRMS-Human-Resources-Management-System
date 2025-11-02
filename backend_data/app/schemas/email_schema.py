from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict


class EmailSendRequest(BaseModel):
    to_emails: List[EmailStr]
    subject: str
    body_text: str
    body_html: Optional[str] = None
    cc_emails: Optional[List[EmailStr]] = None
    bcc_emails: Optional[List[EmailStr]] = None


class AttendanceNotificationRequest(BaseModel):
    employee_email: EmailStr
    employee_name: str
    check_in_time: str
    status: str = "checked_in"


class BackupNotificationRequest(BaseModel):
    admin_emails: List[EmailStr]
    backup_status: str
    backup_file_path: Optional[str] = None
    error_message: Optional[str] = None


class ValidationReportRequest(BaseModel):
    admin_emails: List[EmailStr]
    report_data: Dict

