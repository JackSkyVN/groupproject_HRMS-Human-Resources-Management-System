from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
import math

from app.core.database import get_db
from app.models.employees import Employee
from app.models.attendance import Attendance
from app.models.payroll import Payroll
from app.models.roles import Role
from app.auth.deps import get_current_employee

router = APIRouter()

# ==================== SCHEMAS ====================

class PayrollOut(BaseModel):
    payroll_id: int
    employee_id: int
    employee_name: str
    month: int
    year: int
    basic_salary: float
    actual_days: float
    overtime_hours: float
    bonus: float
    deduction: float
    gross_salary: float
    net_salary: float
    status: str
    payment_date: Optional[date] = None

    class Config:
        from_attributes = True

class PayrollCreate(BaseModel):
    employee_id: int
    month: int
    year: int
    basic_salary: float
    actual_days: float = 0
    overtime_hours: float = 0
    bonus: float = 0
    allowance: float = 0
    deduction: float = 0

# ==================== HELPERS ====================

def sync_employee_payroll(db: Session, emp: Employee, month: int, year: int):
    """
    Automatic salary calculation helper based on strict USD rules:
    - Standard month: 24 days
    - Actual Days = Work Days + Approved Paid Leave Days (Max 3)
    - OT: $20/hr
    - Penalty (Lateness): Arithmetic Progression ($1+$2+$3...) per 5min block.
    - Penalty (Absence): 1st: 2 days deduction, 2nd: 5 days deduction.
    - Allowance: $80
    - Tax: 10%
    """
    from app.models.leave_request import LeaveRequest
    from app.models.leave_type import LeaveType

    start_date = date(year, month, 1)
    if month == 12: end_date = date(year + 1, 1, 1)
    else: end_date = date(year, month + 1, 1)
        
    attendance_records = db.query(Attendance).filter(
        Attendance.employee_id == emp.employee_id,
        Attendance.work_date >= start_date,
        Attendance.work_date < end_date
    ).order_by(Attendance.work_date).all()
    
    # 1. Base Metrics
    work_days = len([a for a in attendance_records if a.check_in_time and a.status != 'absent'])
    total_ot_hours = sum([float(a.overtime_hours or 0) for a in attendance_records])
    
    # 2. Integrate Approved Paid Leave (Max 3 days/month)
    leave_stmt = select(func.sum(LeaveRequest.total_days)).join(LeaveType).where(
        LeaveRequest.employee_id == emp.employee_id,
        LeaveRequest.status == 'approved',
        LeaveType.is_paid == True,
        func.extract('month', LeaveRequest.start_date) == month,
        func.extract('year', LeaveRequest.start_date) == year
    )
    paid_leave_days = float(db.execute(leave_stmt).scalar() or 0)
    if paid_leave_days > 3.0: paid_leave_days = 3.0 # Cap at 3
    
    actual_days = work_days + paid_leave_days
    
    base_contract = float(emp.salary or 2000)
    daily_rate = base_contract / 24.0
    
    # 3. Penalties
    violations = [a for a in attendance_records if (a.late_minutes or 0) > 0 or (a.early_leave_minutes or 0) > 0]
    total_penalty = 0.0
    for i, v in enumerate(violations):
        if i == 0: continue
        total_minutes = (v.late_minutes or 0) + (v.early_leave_minutes or 0)
        if total_minutes > 0:
            blocks = math.ceil(total_minutes / 5.0)
            total_penalty += (blocks * (blocks + 1)) / 2.0
    
    # Absence calculation: No check-in AND no approved leave (paid or unpaid)
    # Get all approved leave dates in this month
    approved_leave_dates = db.query(LeaveRequest.start_date, LeaveRequest.end_date).where(
        LeaveRequest.employee_id == emp.employee_id,
        LeaveRequest.status == 'approved',
        func.extract('month', LeaveRequest.start_date) == month,
        func.extract('year', LeaveRequest.start_date) == year
    ).all()
    
    leave_date_range = []
    for start, end in approved_leave_dates:
        curr = start
        while curr <= end:
            leave_date_range.append(curr)
            curr += timedelta(days=1)
            
    absences = [a for a in attendance_records if a.status == 'absent' and not a.check_in_time and a.work_date not in leave_date_range]
    absence_count = len(absences)
    absence_deduction = 0.0
    if absence_count == 1: absence_deduction = 2.0 * daily_rate
    elif absence_count >= 2: absence_deduction = 7.0 * daily_rate # 2 + 5
            
    # 4. Final Calculation
    base_earned = actual_days * daily_rate
    ot_pay = total_ot_hours * 20.0
    allowance = 80.0
    total_deduction = total_penalty + absence_deduction
    
    gross = base_earned + ot_pay + allowance - total_deduction
    if gross < 0: gross = 0
    net = gross * 0.9
    
    existing = db.query(Payroll).filter(
        Payroll.employee_id == emp.employee_id,
        Payroll.month == month,
        Payroll.year == year
    ).first()
    
    if existing:
        if existing.status == 'paid': return existing # Don't update paid ones
        existing.basic_salary = base_contract
        existing.actual_days = actual_days
        existing.overtime_hours = total_ot_hours
        existing.bonus = ot_pay
        existing.allowance = allowance
        existing.deduction = total_deduction
        existing.gross_salary = round(gross, 2)
        existing.net_salary = round(net, 2)
        return existing
    else:
        new_p = Payroll(
            employee_id=emp.employee_id,
            month=month,
            year=year,
            basic_salary=base_contract,
            actual_days=actual_days,
            overtime_hours=total_ot_hours,
            bonus=ot_pay,
            allowance=allowance,
            deduction=total_deduction,
            gross_salary=round(gross, 2),
            net_salary=round(net, 2),
            status="draft"
        )
        db.add(new_p)
        return new_p

# ==================== ROUTES ====================

@router.get("")
async def list_payroll(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    employee_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 200 # Increased limit for better auto-rendering
):
    """List payroll with Automatic Refresh/Generation"""
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    # --- AUTO SYNC FOR TARGET MONTH ---
    target_month = month or datetime.now().month
    target_year = year or datetime.now().year
    
    if level <= 2: # Admins sync ALL active employees
        employees = db.query(Employee).filter(Employee.status == 'active').all()
        for emp in employees:
            sync_employee_payroll(db, emp, target_month, target_year)
    else: # Staff syncs only SELF
        sync_employee_payroll(db, current_employee, target_month, target_year)
    
    db.commit()

    # --- QUERY RESULTS ---
    stmt = select(Payroll, Employee).join(Employee, Payroll.employee_id == Employee.employee_id)

    if level == 1 or level == 2:
        pass
    elif level == 3:
        stmt = stmt.where(Employee.department_id == current_employee.department_id)
    else:
        stmt = stmt.where(Payroll.employee_id == current_employee.employee_id)

    if employee_id:
        stmt = stmt.where(Payroll.employee_id == employee_id)
    if month:
        stmt = stmt.where(Payroll.month == month)
    if year:
        stmt = stmt.where(Payroll.year == year)

    results = db.execute(stmt.order_by(desc(Payroll.year), desc(Payroll.month)).offset(skip).limit(limit)).all()
    
    output = []
    for p, emp in results:
        output.append({
            "payroll_id": p.payroll_id,
            "employee_id": emp.employee_id,
            "employee_name": emp.full_name,
            "month": p.month,
            "year": p.year,
            "basic_salary": float(p.basic_salary or 0),
            "actual_days": float(p.actual_days or 0),
            "overtime_hours": float(p.overtime_hours or 0),
            "bonus": float(p.bonus or 0),
            "deduction": float(p.deduction or 0),
            "gross_salary": float(p.gross_salary or 0),
            "net_salary": float(p.net_salary or 0),
            "status": p.status,
            "payment_date": p.payment_date
        })
    return output

@router.post("/generate")
async def generate_payroll_batch(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Replaced by Auto-Sync in list_payroll. Kept for legacy compatibility if needed."""
    return {"ok": True, "message": "Payroll is now automatically processed upon viewing."}

@router.patch("/{payroll_id}/pay")
async def pay_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Mark payroll as paid"""
    current_role = db.get(Role, current_employee.role_id)
    if current_role.role_level > 2:
        raise HTTPException(status_code=403, detail="Only Admin or HR General can mark payroll as paid")

    p = db.get(Payroll, payroll_id)
    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    p.status = "paid"
    p.payment_date = date.today()
    db.commit()
    return {"ok": True, "message": "Payroll marked as paid"}
