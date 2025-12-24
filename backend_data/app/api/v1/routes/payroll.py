from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.employees import Employee
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
    payment_date: Optional[datetime] = None

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

# ==================== ROUTES ====================

@router.get("", response_model=List[PayrollOut])
async def list_payroll(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    employee_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100
):
    """
    Xem bảng lương theo quyền:
    - Admin/HR Chung: Tất cả.
    - HR Phòng ban: Nhân viên trong phòng + chính mình.
    - Staff: Chỉ chính mình.
    """
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

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
            "basic_salary": float(p.basic_salary),
            "actual_days": float(p.actual_days),
            "overtime_hours": float(p.overtime_hours),
            "bonus": float(p.bonus),
            "deduction": float(p.deduction),
            "gross_salary": float(p.gross_salary),
            "net_salary": float(p.net_salary),
            "status": p.status,
            "payment_date": p.payment_date
        })
    return output

@router.post("")
async def create_payroll(
    payload: PayrollCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Tạo bảng lương (Admin/HR Chung)"""
    current_role = db.get(Role, current_employee.role_id)
    if current_role.role_level > 2:
        raise HTTPException(status_code=403, detail="Only Admin or HR General can create payroll")
        
    # Tính toán sơ bộ
    gross = payload.basic_salary + payload.bonus + payload.allowance
    net = gross - payload.deduction
    
    new_p = Payroll(
        employee_id=payload.employee_id,
        month=payload.month,
        year=payload.year,
        basic_salary=payload.basic_salary,
        actual_days=payload.actual_days,
        overtime_hours=payload.overtime_hours,
        bonus=payload.bonus,
        allowance=payload.allowance,
        deduction=payload.deduction,
        gross_salary=gross,
        net_salary=net,
        status="draft"
    )
    db.add(new_p)
    db.commit()
    return {"ok": True, "payroll_id": new_p.payroll_id}
