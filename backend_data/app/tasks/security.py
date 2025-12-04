from app.tasks.worker import celery_app
from app.core.database import SessionLocal
from app.models.attendance import Attendance
from app.services.attendance_verifier import verify_log
from sqlalchemy import select

@celery_app.task(name="verify_attendance_logs")
def verify_attendance_logs():
    """
    Periodically checks for unverified attendance logs and verifies them.
    """
    db = SessionLocal()
    try:
        # Find logs that are not verified yet (verified=False)
        stmt = select(Attendance).where(
            Attendance.verified == False,
            Attendance.verification_reason == None
        )
        logs = db.execute(stmt).scalars().all()
        
        for log in logs:
            # TODO: Integrate with AI service for snapshot matching
            ai_match_result = True # Placeholder
            
            verify_log(db, log, ai_match=ai_match_result)
            db.add(log)
        
        db.commit()
    finally:
        db.close()
