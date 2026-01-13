import smtplib
from email.message import EmailMessage
from app.tasks.worker import celery_app

@celery_app.task(name="send_email")
def send_email(to_addr: str, subject: str, body: str):
    from app.core.config import settings
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_addr
    msg.set_content(body)
    
    # Sử dụng settings cho SMTP
    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as s:
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                s.starttls()
                s.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            s.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")
