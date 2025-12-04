import os
from typing import List, Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.core.config import settings
from pathlib import Path

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

class EmailService:
    @staticmethod
    async def send_email(
        subject: str,
        recipients: List[EmailStr],
        body: str,
        subtype: MessageType = MessageType.html
    ):
        """
        Send an email asynchronously.
        """
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body,
            subtype=subtype
        )

        fm = FastMail(conf)
        try:
            await fm.send_message(message)
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    @staticmethod
    async def send_security_alert(
        recipient_email: EmailStr,
        alert_type: str,
        details: str
    ):
        """
        Send a security alert email.
        """
        subject = f"SECURITY ALERT: {alert_type}"
        body = f"""
        <h1>Security Alert</h1>
        <p><strong>Type:</strong> {alert_type}</p>
        <p><strong>Details:</strong> {details}</p>
        <p>Please investigate immediately.</p>
        """
        await EmailService.send_email(
            subject=subject,
            recipients=[recipient_email],
            body=body
        )

    @staticmethod
    async def send_attendance_verification_failure(
        recipient_email: EmailStr,
        employee_id: str,
        reason: str
    ):
        """
        Send an alert for attendance verification failure.
        """
        subject = "Attendance Verification Failed"
        body = f"""
        <h1>Attendance Verification Failed</h1>
        <p><strong>Employee ID:</strong> {employee_id}</p>
        <p><strong>Reason:</strong> {reason}</p>
        <p>The system detected an anomaly in the attendance log.</p>
        """
        await EmailService.send_email(
            subject=subject,
            recipients=[recipient_email],
            body=body
        )
