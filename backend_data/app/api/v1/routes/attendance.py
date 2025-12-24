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
    status: str
    late_minutes: int
    overtime_hours: float
    work_hours: float

    class Config:
        from_attributes = True

# ==================== ROUTES ====================

@router.get("", response_model=list[AttendanceOut])
async def list_attendance(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 100
):
    """
    Xem danh sách chấm công theo quyền:
    - Admin/HR Chung: Tất cả.
    - HR Phòng ban: Nhân viên trong phòng.
    - Staff: Chỉ chính mình.
    """
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    stmt = select(Attendance, Employee).\
        join(Employee, Attendance.employee_id == Employee.employee_id)

    if level == 1 or level == 2:
        pass
    elif level == 3:
        stmt = stmt.where(Employee.department_id == current_employee.department_id)
    else:
        stmt = stmt.where(Attendance.employee_id == current_employee.employee_id)

    if employee_id:
        stmt = stmt.where(Attendance.employee_id == employee_id)
    if date_from:
        stmt = stmt.where(Attendance.work_date >= date_from)
    if date_to:
        stmt = stmt.where(Attendance.work_date <= date_to)

    results = db.execute(stmt.offset(skip).limit(limit)).all()
    
    output = []
    for att, emp in results:
        output.append({
            "attendance_id": att.attendance_id,
            "employee_id": emp.employee_id,
            "employee_name": emp.full_name,
            "work_date": att.work_date,
            "check_in_time": att.check_in_time,
            "check_out_time": att.check_out_time,
            "status": att.status,
            "late_minutes": att.late_minutes,
            "overtime_hours": float(att.overtime_hours),
            "work_hours": float(att.work_hours)
        })
    return output

@router.post("/check-in-manual")
async def check_in_manual(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Điểm danh vào (Manual)"""
    today = date.today()
    now = datetime.now()
    
    # Check if exists
    existing = db.query(Attendance).filter(
        Attendance.employee_id == current_employee.employee_id,
        Attendance.work_date == today
    ).first()
    
    if existing and existing.check_in_time:
        raise HTTPException(status_code=400, detail="Already checked in today")
        
    # Logic tính muộn (deadline 08:35)
    shift_start = datetime.combine(today, time(8, 30))
    late_mins = 0
    status = "present"
    
    if now > datetime.combine(today, time(8, 35)):
        late_mins = int((now - shift_start).total_seconds() / 60)
        status = "late"

    if existing:
        existing.check_in_time = now
        existing.status = status
        existing.late_minutes = late_mins
    else:
        new_att = Attendance(
            employee_id=current_employee.employee_id,
            work_date=today,
            check_in_time=now,
            status=status,
            late_minutes=late_mins
        )
        db.add(new_att)
        
    db.commit()
    return {"ok": True, "check_in_time": now, "status": status}

@router.post("/check-out-manual")
async def check_out_manual(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Điểm danh ra (Manual)"""
    today = date.today()
    now = datetime.now()
    
    att = db.query(Attendance).filter(
        Attendance.employee_id == current_employee.employee_id,
        Attendance.work_date == today
    ).first()
    
    if not att or not att.check_in_time:
        raise HTTPException(status_code=400, detail="Please check in first")
        
    if att.check_out_time:
        raise HTTPException(status_code=400, detail="Already checked out today")
        
    att.check_out_time = now
    
    # Tính giờ làm việc
    delta = now - att.check_in_time
    att.work_hours = round(delta.total_seconds() / 3600, 2)
    
    # Tính OT (giả sử sau 17:30 là OT)
    shift_end = datetime.combine(today, time(17, 30))
    if now > shift_end:
        ot_delta = now - shift_end
        att.overtime_hours = round(ot_delta.total_seconds() / 3600, 2)
        
    db.commit()
    return {"ok": True, "check_out_time": now, "work_hours": att.work_hours}
