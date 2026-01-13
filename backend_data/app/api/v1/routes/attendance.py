from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, time

from app.core.database import get_db
from app.models.employees import Employee
from app.models.attendance import Attendance
from app.models.roles import Role
from app.models.departments import Department
from app.models.positions import Position
from app.auth.deps import get_current_employee

router = APIRouter()

# ==================== SCHEMAS ====================

class AttendanceOut(BaseModel):
    attendance_id: int
    employee_id: int
    employee_name: str
    work_date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    ot_check_in_time: Optional[datetime] = None
    ot_check_out_time: Optional[datetime] = None
    status: str
    ot_status: str
    late_minutes: int
    early_leave_minutes: int
    overtime_hours: float
    work_hours: float
    snapshot_checkin: Optional[str] = None
    snapshot_checkout: Optional[str] = None
    face_score_checkin: Optional[float] = None
    face_score_checkout: Optional[float] = None

    class Config:
        from_attributes = True

class AttendanceUpdate(BaseModel):
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    ot_check_in_time: Optional[datetime] = None
    ot_check_out_time: Optional[datetime] = None
    status: Optional[str] = None

# ==================== ROUTES ====================

@router.get("")
async def list_attendance(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 100
):
    """List attendance records with filters."""
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    # Sử dụng db.query để lấy dữ liệu điểm danh
    query = db.query(Attendance).join(Employee, Attendance.employee_id == Employee.employee_id)

    if level > 3:
        # Staff chỉ được xem của chính mình
        query = query.filter(Attendance.employee_id == current_employee.employee_id)
        # BUSINESS LOGIC: Chỉ hiện attendance từ ngày hire trở đi
        if current_employee.hire_date:
            query = query.filter(Attendance.work_date >= current_employee.hire_date)

    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
        # BUSINESS LOGIC: Filter theo hire date của employee được chọn
        target_emp = db.get(Employee, employee_id)
        if target_emp and target_emp.hire_date:
            query = query.filter(Attendance.work_date >= target_emp.hire_date)
    if date_from:
        query = query.filter(Attendance.work_date >= date_from)
    if date_to:
        query = query.filter(Attendance.work_date <= date_to)

    results = query.order_by(Attendance.work_date.desc(), Attendance.attendance_id.desc())\
                   .offset(skip).limit(limit).all()
    
    output = []
    for att in results:
        emp = att.employee
        output.append({
            "attendance_id": att.attendance_id,
            "employee_id": emp.employee_id,
            "employee_name": emp.full_name,
            "work_date": att.work_date,
            "check_in_time": att.check_in_time,
            "check_out_time": att.check_out_time,
            "ot_check_in_time": att.ot_check_in_time,
            "ot_check_out_time": att.ot_check_out_time,
            "status": att.status,
            "ot_status": att.ot_status,
            "late_minutes": att.late_minutes or 0,
            "early_leave_minutes": att.early_leave_minutes or 0,
            "overtime_hours": float(att.overtime_hours or 0),
            "work_hours": float(att.work_hours or 0),
            "snapshot_checkin": att.snapshot_checkin,
            "snapshot_checkout": att.snapshot_checkout,
            "face_score_checkin": float(att.face_score_checkin) if att.face_score_checkin else None,
            "face_score_checkout": float(att.face_score_checkout) if att.face_score_checkout else None
        })
    return output

@router.post("/check-in-manual")
async def check_in_manual(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Record a manual check-in (Main or OT)."""
    today = date.today()
    now = datetime.now()
    now_time = now.time()
    
    # 0. BẢO MẬT: Kiểm tra Face ID (Trừ Admin)
    current_role = db.get(Role, current_employee.role_id)
    if (not current_employee.face_embedding or not current_employee.face_registered_at) and current_role.role_level > 1:
        raise HTTPException(status_code=400, detail="Vui lòng đăng ký Face ID trước khi thực hiện điểm danh.")

    # 1. Lấy bản ghi hôm nay hoặc tạo mới
    att = db.query(Attendance).filter(
        Attendance.employee_id == current_employee.employee_id,
        Attendance.work_date == today
    ).first()
    
    if not att:
        att = Attendance(employee_id=current_employee.employee_id, work_date=today, status="absent", ot_status="absent")
        db.add(att)
        db.flush()

    # 2. Phân loại Check-in theo giờ
    # Giờ hành chính: Sáng đến trước 17:50 (vì 17:50 là hết hạn checkout hành chính)
    main_deadline = time(17, 50)
    ot_start_threshold = time(17, 51)
    
    if now_time < main_deadline:
        if att.check_in_time:
            raise HTTPException(status_code=400, detail="Main shift check-in already recorded")
        
        att.check_in_time = now
        # Tính đi muộn (shift start 08:30, grace 15 mins -> 08:45)
        shift_start = datetime.combine(today, time(8, 30))
        if now > datetime.combine(today, time(8, 45)):
            att.late_minutes = int((now - shift_start).total_seconds() / 60)
            att.status = "late"
        else:
            att.status = "present"
        
        db.commit()
        return {"ok": True, "type": "main", "check_in_time": now, "status": att.status}
    
    # Giờ OT: Sau 17:50 (thường là từ 18:00)
    else:
        if att.ot_check_in_time:
            raise HTTPException(status_code=400, detail="OT check-in already recorded")
        
        att.ot_check_in_time = now
        att.ot_status = "present_ot"
        
        db.commit()
        return {"ok": True, "type": "ot", "ot_check_in_time": now, "ot_status": att.ot_status}

@router.post("/check-out-manual")
async def check_out_manual(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Record a manual check-out (Main or OT)."""
    today = date.today()
    now = datetime.now()
    now_time = now.time()
    
    # 0. BẢO MẬT: Kiểm tra Face ID (Trừ Admin)
    current_role = db.get(Role, current_employee.role_id)
    if (not current_employee.face_embedding or not current_employee.face_registered_at) and current_role.role_level > 1:
        raise HTTPException(status_code=400, detail="Vui lòng đăng ký Face ID trước khi thực hiện điểm danh.")

    att = db.query(Attendance).filter(
        Attendance.employee_id == current_employee.employee_id,
        Attendance.work_date == today
    ).first()
    
    if not att:
        raise HTTPException(status_code=400, detail="No attendance record for today")

    # 1. Ưu tiên Checkout cho Main Shift nếu đang chờ
    if att.check_in_time and not att.check_out_time:
        main_deadline = time(17, 50)
        
        if now_time > main_deadline:
            # Quá hạn 17:50 -> Vắng (ngoại trừ khi admin sửa tay sau này)
            att.status = "absent"
            att.check_out_time = now # Vẫn lưu giờ nhưng mark absent
            db.commit()
            return {"ok": True, "type": "main", "message": "Checked out after 17:50 - Marked as Absent", "status": "absent"}
        
        att.check_out_time = now
        
        # Tính về sớm (Shift end 17:30)
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
            return {"ok": True, "type": "ot", "message": "Checked out after 22:30 - Marked as Absent OT", "ot_status": "absent_ot"}
            
        att.ot_check_out_time = now
        delta = now - att.ot_check_in_time
        att.overtime_hours = round(max(0, delta.total_seconds() / 3600), 2)
        db.commit()
        return {"ok": True, "type": "ot", "ot_check_out_time": now, "overtime_hours": att.overtime_hours}

    raise HTTPException(status_code=400, detail="No pending check-out for Main or OT shift")

@router.put("/{attendance_id}")
async def override_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Override and recalculate attendance metrics."""
    att = db.get(Attendance, attendance_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    current_role = db.get(Role, current_employee.role_id)
    target_emp = db.get(Employee, att.employee_id)
    target_role = db.get(Role, target_emp.role_id)

    # Logic Override: L1/L2 có thể sửa lẫn nhau, nhưng KHÔNG AI tự sửa của mình
    if current_employee.employee_id == target_emp.employee_id:
        raise HTTPException(status_code=403, detail="You cannot edit your own attendance record.")

    allowed = False
    # 1. Standard Tiered Override
    if current_role.role_level < target_role.role_level:
        if current_role.role_level == 3:
            # L3 chỉ cho phòng ban của họ
            if target_emp.department_id == current_employee.department_id:
                allowed = True
        else:
            allowed = True
    
    # 2. Phê duyệt chéo cho L1 & L2 (Cross-Approval)
    elif current_role.role_level in [1, 2] and target_role.role_level in [1, 2]:
        allowed = True

    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions: You can only edit attendance for subordinates or peer top-level leaders.")

    # Cập nhật timestamps nếu có
    if data.check_in_time is not None: att.check_in_time = data.check_in_time
    if data.check_out_time is not None: att.check_out_time = data.check_out_time
    if data.ot_check_in_time is not None: att.ot_check_in_time = data.ot_check_in_time
    if data.ot_check_out_time is not None: att.ot_check_out_time = data.ot_check_out_time
    if data.status: att.status = data.status

    # Tính toán lại
    today = att.work_date
    
    # 1. Main Shift Metrics
    if att.check_in_time:
        shift_start = datetime.combine(today, time(8, 30))
        grace_start = datetime.combine(today, time(8, 45))
        if att.check_in_time > grace_start:
            att.late_minutes = int((att.check_in_time - shift_start).total_seconds() / 60)
            if not data.status: att.status = "late"
        else:
            att.late_minutes = 0
            if not data.status: att.status = "present"

        if att.check_out_time:
            shift_end = datetime.combine(today, time(17, 30))
            if att.check_out_time < shift_end:
                att.early_leave_minutes = int((shift_end - att.check_out_time).total_seconds() / 60)
            else:
                att.early_leave_minutes = 0
            
            delta = att.check_out_time - att.check_in_time
            att.work_hours = round(max(0, delta.total_seconds() / 3600), 2)

    # 2. OT Shift Metrics
    if att.ot_check_in_time and att.ot_check_out_time:
        delta_ot = att.ot_check_out_time - att.ot_check_in_time
        att.overtime_hours = round(max(0, delta_ot.total_seconds() / 3600), 2)
        att.ot_status = "present_ot"

    db.commit()
    return {"ok": True, "message": "Attendance record updated and metrics recalculated"}
