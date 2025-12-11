from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.org import Employee
from app.models.rbac import User, Role, UserRole
from app.models.payroll import PayrollRecord
from app.auth.deps import require_permission, get_current_user

router = APIRouter()

#                                                               --- Schemas ---
class PayrollCreate(BaseModel):
    employee_id: int
    month: str
    base_salary: float
    bonus: float = 0
    benefits: float = 0
    deductions: float = 0

class PayrollOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str]
    month: str
    base_salary: float
    bonus: float
    benefits: float
    deductions: float
    tax: float
    net_salary: float
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

#                                                               --- Routes ---

@router.post("/payroll", response_model=PayrollOut)
def generate_payroll(
    payload: PayrollCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("system.manage")) # Chỉ Admin
):
    emp = db.get(Employee, payload.employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Tự động tính thuế 
    gross = payload.base_salary + payload.bonus + payload.benefits
    tax = (gross - payload.deductions) * 0.1 
    if tax < 0: tax = 0
    
    net = gross - payload.deductions - tax
    
    record = PayrollRecord(
        employee_id=emp.id,
        month=payload.month,
        base_salary=payload.base_salary,
        bonus=payload.bonus,
        benefits=payload.benefits,
        deductions=payload.deductions,
        tax=tax,
        net_salary=net,
        status="Processed"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "employee_name": emp.full_name,
        "month": record.month,
        "base_salary": record.base_salary,
        "bonus": record.bonus,
        "benefits": record.benefits,
        "deductions": record.deductions,
        "tax": record.tax,
        "net_salary": record.net_salary,
        "status": record.status,
        "created_at": record.created_at
    }

@router.get("/payroll", response_model=list[PayrollOut])
def list_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Kiểm tra Admin
    is_admin = False
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role and db.query(UserRole).filter(UserRole.user_id == current_user.id, UserRole.role_id == admin_role.id).first():
        is_admin = True
        
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()

    stmt = select(PayrollRecord).order_by(desc(PayrollRecord.month))
    
    if not is_admin:
        if not employee:
            return []
        stmt = stmt.where(PayrollRecord.employee_id == employee.id)
        
    records = db.execute(stmt).scalars().all()
    
    results = []
    for r in records:
        emp_name = "Unknown"
        if r.employee:
            emp_name = r.employee.full_name or r.employee.email
            
        results.append({
            "id": r.id,
            "employee_id": r.employee_id,
            "employee_name": emp_name,
            "month": r.month,
            "base_salary": r.base_salary,
            "bonus": r.bonus,
            "benefits": r.benefits,
            "deductions": r.deductions,
            "tax": r.tax,
            "net_salary": r.net_salary,
            "status": r.status,
            "created_at": r.created_at
        })
    return results
