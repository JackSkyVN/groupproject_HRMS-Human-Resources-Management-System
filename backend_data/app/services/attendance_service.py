from datetime import date, datetime, time
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.attendance import Attendance
from app.models.employees import Employee

def perform_check_in(db: Session, employee: Employee, snapshot_path: str = None, face_score: float = None):
    today = date.today()
    now = datetime.now()
    now_time = now.time()
    
    # 1. Lấy bản ghi hôm nay hoặc tạo mới
    att = db.query(Attendance).filter(
        Attendance.employee_id == employee.employee_id,
        Attendance.work_date == today
    ).first()
    
    if not att:
        att = Attendance(employee_id=employee.employee_id, work_date=today, status="absent", ot_status="absent")
        db.add(att)
        db.flush()

    # 2. Kiểm tra giới hạn 2 lần/ngày (Main + OT)
    if att.check_in_time and att.check_out_time and att.ot_check_in_time and att.ot_check_out_time:
        raise ValueError("Maximum check-in limit reached (2 shifts: Main + OT completed)")
    
    # 3. Phân loại Check-in theo giờ
    main_deadline = time(17, 50)
    
    if now_time < main_deadline:
        # Kiểm tra Main shift đã hoàn tất chưa
        if att.check_in_time and att.check_out_time:
            raise ValueError("Main shift already completed. Please wait for OT shift (after 17:50)")
        if att.check_in_time:
            raise ValueError("Main shift check-in already recorded")
        
        att.check_in_time = now
        att.snapshot_checkin = snapshot_path
        att.face_score_checkin = face_score
        # Tính đi muộn (shift start 08:30, grace 15 mins -> 08:45)
        shift_start = datetime.combine(today, time(8, 30))
        if now > datetime.combine(today, time(8, 45)):
            att.late_minutes = int((now - shift_start).total_seconds() / 60)
            att.status = "late"
        else:
            att.late_minutes = 0
            att.status = "present"
        
        db.commit()
        return {"ok": True, "type": "main", "check_in_time": now, "status": att.status}
    
    else:
        # Kiểm tra OT shift đã hoàn tất chưa
        if att.ot_check_in_time and att.ot_check_out_time:
            raise ValueError("OT shift already completed. Maximum 2 shifts per day (Main + OT)")
        if att.ot_check_in_time:
            raise ValueError("OT check-in already recorded")
        
        # Yêu cầu phải hoàn tất Main shift trước
        if not att.check_in_time or not att.check_out_time:
            raise ValueError("Please complete Main shift before starting OT")
        
        att.ot_check_in_time = now
        # OT check-in không cần snapshot riêng, dùng chung với main check-in
        att.ot_status = "present_ot"
        
        db.commit()
        return {"ok": True, "type": "ot", "ot_check_in_time": now, "ot_status": att.ot_status}

def perform_check_out(db: Session, employee: Employee, snapshot_path: str = None, face_score: float = None):
    today = date.today()
    now = datetime.now()
    now_time = now.time()
    
    att = db.query(Attendance).filter(
        Attendance.employee_id == employee.employee_id,
        Attendance.work_date == today
    ).first()
    
    if not att:
        raise ValueError("No attendance record for today")

    # 1. Ưu tiên Checkout cho Main Shift nếu đang chờ
    if att.check_in_time and not att.check_out_time:
        main_deadline = time(17, 50)
        
        if now_time > main_deadline:
            att.status = "absent"
            att.check_out_time = now
            db.commit()
            return {"ok": True, "type": "main", "message": "Late checkout - Marked as Absent", "status": "absent"}
        
        att.check_out_time = now
        att.snapshot_checkout = snapshot_path
        att.face_score_checkout = face_score
        shift_end = datetime.combine(today, time(17, 30))
        if now < shift_end:
            att.early_leave_minutes = int((shift_end - now).total_seconds() / 60)
        else:
            att.early_leave_minutes = 0

        delta = now - att.check_in_time
        att.work_hours = round(max(0, delta.total_seconds() / 3600), 2)
        db.commit()
        return {
            "ok": True, 
            "type": "main", 
            "check_out_time": now, 
            "work_hours": att.work_hours,
            "early_leave_minutes": att.early_leave_minutes
        }

    # 2. Checkout cho OT Shift
    if att.ot_check_in_time and not att.ot_check_out_time:
        ot_deadline = time(22, 30)
        
        if now_time > ot_deadline:
            att.ot_status = "absent_ot"
            att.ot_check_out_time = now
            db.commit()
            return {"ok": True, "type": "ot", "message": "Late OT checkout - Marked as Absent OT", "ot_status": "absent_ot"}
            
        att.ot_check_out_time = now
        delta = now - att.ot_check_in_time
        att.overtime_hours = round(max(0, delta.total_seconds() / 3600), 2)
        db.commit()
        return {"ok": True, "type": "ot", "ot_check_out_time": now, "overtime_hours": att.overtime_hours}

    raise ValueError("No pending check-out for Main or OT shift")
