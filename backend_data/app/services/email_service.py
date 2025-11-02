import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict
from jinja2 import Template
from app.core.config import settings
from pathlib import Path
import os


class EmailService:
    """Email Automation Service"""
    
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email or settings.smtp_username
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        attachments: Optional[List[Dict]] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> bool:
        """Send an email."""
        if not self.smtp_username or not self.smtp_password:
            print("Email credentials not configured. Skipping email send.")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = self.from_email
            message["To"] = ", ".join(to_emails)
            message["Subject"] = subject
            
            if cc_emails:
                message["Cc"] = ", ".join(cc_emails)
            
            # Add text and HTML parts
            text_part = MIMEText(body_text, "plain")
            message.attach(text_part)
            
            if body_html:
                html_part = MIMEText(body_html, "html")
                message.attach(html_part)
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    self._add_attachment(message, attachment)
            
            # Send email
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=settings.smtp_use_tls
            ) as smtp:
                await smtp.login(self.smtp_username, self.smtp_password)
                recipients = to_emails.copy()
                if cc_emails:
                    recipients.extend(cc_emails)
                if bcc_emails:
                    recipients.extend(bcc_emails)
                
                await smtp.send_message(message, recipients=recipients)
            
            return True
        
        except Exception as e:
            print(f"Error sending email: {e}")
            return False
    
    def _add_attachment(self, message: MIMEMultipart, attachment: Dict):
        """Add an attachment to the email message."""
        file_path = attachment.get("path")
        filename = attachment.get("filename")
        
        if not file_path or not Path(file_path).exists():
            return
        
        if not filename:
            filename = Path(file_path).name
        
        with open(file_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
        
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f"attachment; filename= {filename}"
        )
        message.attach(part)
    
    async def send_attendance_notification(
        self,
        employee_email: str,
        employee_name: str,
        check_in_time: str,
        status: str = "checked_in"
    ) -> bool:
        """Send attendance check-in/out notification."""
        subject = f"Attendance {status.replace('_', ' ').title()} - {employee_name}"
        
        body_text = f"""
        Hello {employee_name},
        
        Your attendance has been recorded:
        - Time: {check_in_time}
        - Status: {status.replace('_', ' ').title()}
        
        Thank you for using HRMS.
        """
        
        body_html = f"""
        <html>
        <body>
            <h2>Attendance Notification</h2>
            <p>Hello {employee_name},</p>
            <p>Your attendance has been recorded:</p>
            <ul>
                <li><strong>Time:</strong> {check_in_time}</li>
                <li><strong>Status:</strong> {status.replace('_', ' ').title()}</li>
            </ul>
            <p>Thank you for using HRMS.</p>
        </body>
        </html>
        """
        
        return await self.send_email(
            to_emails=[employee_email],
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )
    
    async def send_backup_notification(
        self,
        admin_emails: List[str],
        backup_status: str,
        backup_file_path: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """Send backup completion/failure notification."""
        subject = f"Database Backup {backup_status.title()}"
        
        if backup_status == "completed":
            body_text = f"""
            Database backup has been completed successfully.
            
            Backup file: {backup_file_path}
            
            Please verify the backup file is accessible.
            """
            
            body_html = f"""
            <html>
            <body>
                <h2>Database Backup Completed</h2>
                <p>Database backup has been completed successfully.</p>
                <p><strong>Backup file:</strong> {backup_file_path}</p>
                <p>Please verify the backup file is accessible.</p>
            </body>
            </html>
            """
        else:
            body_text = f"""
            Database backup has failed.
            
            Error: {error_message}
            
            Please check the backup system immediately.
            """
            
            body_html = f"""
            <html>
            <body>
                <h2>Database Backup Failed</h2>
                <p>Database backup has failed.</p>
                <p><strong>Error:</strong> {error_message}</p>
                <p>Please check the backup system immediately.</p>
            </body>
            </html>
            """
        
        return await self.send_email(
            to_emails=admin_emails,
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )
    
    async def send_validation_report(
        self,
        admin_emails: List[str],
        report_data: Dict
    ) -> bool:
        """Send attendance validation report."""
        subject = "Daily Attendance Validation Report"
        
        body_html = f"""
        <html>
        <body>
            <h2>Daily Attendance Validation Report</h2>
            <p><strong>Date:</strong> {report_data.get('date', 'N/A')}</p>
            <p><strong>Total Logs Checked:</strong> {report_data.get('total_logs', 0)}</p>
            <p><strong>Valid Logs:</strong> {report_data.get('valid_logs', 0)}</p>
            <p><strong>Invalid Logs:</strong> {report_data.get('invalid_logs', 0)}</p>
            <p><strong>Total Snapshots Checked:</strong> {report_data.get('total_snapshots', 0)}</p>
            <p><strong>Valid Snapshots:</strong> {report_data.get('valid_snapshots', 0)}</p>
            <p><strong>Invalid Snapshots:</strong> {report_data.get('invalid_snapshots', 0)}</p>
            
            <h3>Issues Found:</h3>
            <ul>
                {''.join([f'<li>{error}</li>' for error in report_data.get('errors', [])])}
            </ul>
        </body>
        </html>
        """
        
        body_text = f"""
        Daily Attendance Validation Report
        
        Date: {report_data.get('date', 'N/A')}
        Total Logs Checked: {report_data.get('total_logs', 0)}
        Valid Logs: {report_data.get('valid_logs', 0)}
        Invalid Logs: {report_data.get('invalid_logs', 0)}
        
        Issues Found:
        {chr(10).join(report_data.get('errors', []))}
        """
        
        return await self.send_email(
            to_emails=admin_emails,
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )
    
    async def send_template_email(
        self,
        to_emails: List[str],
        subject: str,
        template_path: str,
        template_vars: Dict
    ) -> bool:
        """Send email using a Jinja2 template."""
        if not Path(template_path).exists():
            print(f"Template file not found: {template_path}")
            return False
        
        with open(template_path, "r") as f:
            template_content = f.read()
        
        template = Template(template_content)
        body_html = template.render(**template_vars)
        
        # Generate plain text version (simple strip of HTML tags)
        body_text = body_html.replace("<p>", "").replace("</p>", "\n")
        body_text = body_text.replace("<br>", "\n").replace("<br/>", "\n")
        
        return await self.send_email(
            to_emails=to_emails,
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )

