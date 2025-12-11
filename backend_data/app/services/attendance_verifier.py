from sqlalchemy.orm import Session
from app.models.attendance import Attendance

class AttendanceVerifier:
    @staticmethod
    def verify_basic_rules(log: Attendance) -> tuple[bool, str | None]:
        if log.check_in_time is None:
            return False, "missing_check_in"
        if log.check_out_time and log.check_out_time < log.check_in_time:
            return False, "checkout_before_checkin"
        return True, None

    @staticmethod
    def verify_same_day_snapshot(log: Attendance, ai_match: bool | None) -> tuple[bool, str | None]:
        if log.snapshot_path is None:
            return False, "no_snapshot"
        if ai_match is False:
            return False, "snapshot_mismatch"
        return True, None


def verify_log(db: Session, log: Attendance, ai_match: bool | None) -> Attendance:
    ok, reason = AttendanceVerifier.verify_basic_rules(log)
    if not ok:
        log.verified = False
        log.verification_reason = reason
        from app.tasks.email import send_email
        send_email.delay(
            to_addr="admin@example.com",
            subject="Attendance Verification Failed",
            body=f"Employee ID: {log.employee_id}\nReason: {reason}"
        )
        return log
    
    ok, reason = AttendanceVerifier.verify_same_day_snapshot(log, ai_match)
    log.verified = ok
    log.verification_reason = reason
    
    if not ok:
        from app.tasks.email import send_email
        send_email.delay(
            to_addr="admin@example.com",
            subject="Attendance Verification Failed",
            body=f"Employee ID: {log.employee_id}\nReason: {reason}"
        )

    return log
