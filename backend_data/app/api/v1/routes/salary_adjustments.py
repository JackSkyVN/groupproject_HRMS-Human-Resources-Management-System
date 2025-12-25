from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from app.core.database import get_db
from app.models.employees import Employee
from app.models.salary_adjustment import SalaryAdjustment
from app.models.roles import Role
from app.auth.deps import get_current_employee, require_role_level

router = APIRouter()

# ==================== SCHEMAS ====================

class SalaryAdjustmentBase(BaseModel):
    employee_id: int
    target_salary: float
    reason: Optional[str] = None
    effective_date: date

class SalaryAdjustmentCreate(SalaryAdjustmentBase):
    pass

class SalaryAdjustmentOut(SalaryAdjustmentBase):
    id: int
    requester_id: int
    current_salary: float
    status: str
    approved_by: Optional[int] = None
    created_at: datetime
    employee_name: Optional[str] = None
    requester_name: Optional[str] = None

    class Config:
        from_attributes = True

# ==================== ROUTES ====================

@router.post("/", response_model=SalaryAdjustmentOut)
def submit_adjustment_request(
    request: SalaryAdjustmentCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Submit a new Salary Increase/Decrease request"""
    # Check target employee
    target_emp = db.query(Employee).filter(Employee.employee_id == request.employee_id).first()
    if not target_emp:
        raise HTTPException(status_code=404, detail="Target employee not found")

    # Permissions: Admin, HR, or direct Manager
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4
    
    is_hr_admin = level <= 2
    is_manager = target_emp.manager_id == current_employee.employee_id
    
    if not (is_hr_admin or is_manager):
        raise HTTPException(status_code=403, detail="Not authorized to request adjustment for this employee")

    new_adj = SalaryAdjustment(
        employee_id=request.employee_id,
        requester_id=current_employee.employee_id,
        current_salary=float(target_emp.salary or 0),
        target_salary=request.target_salary,
        reason=request.reason,
        effective_date=request.effective_date,
        status="pending"
    )
    
    db.add(new_adj)
    db.commit()
    db.refresh(new_adj)
    
    # Add names for response
    new_adj.employee_name = target_emp.full_name
    new_adj.requester_name = current_employee.full_name
    
    return new_adj

@router.get("/", response_model=List[SalaryAdjustmentOut])
def list_adjustment_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """List salary adjustment requests based on role"""
    query = db.query(SalaryAdjustment)
    
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4
    
    if level > 2:
        # Non-HR/Admin see only their own requests or requests for them
        query = query.filter(
            (SalaryAdjustment.requester_id == current_employee.employee_id) | 
            (SalaryAdjustment.employee_id == current_employee.employee_id)
        )
    
    if status:
        query = query.filter(SalaryAdjustment.status == status)
        
    results = query.order_by(SalaryAdjustment.created_at.desc()).all()
    
    # Map names manually for the out schema
    for r in results:
        r.employee_name = r.employee.full_name
        r.requester_name = r.requester.full_name
        
    return results

@router.patch("/{id}/approve")
def approve_adjustment_request(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role_level(2))
):
    """Approve and apply salary adjustment (HR General or Admin only)"""
    adj = db.query(SalaryAdjustment).filter(SalaryAdjustment.id == id).first()
    if not adj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if adj.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Apply change to employee
    target_emp = db.query(Employee).filter(Employee.employee_id == adj.employee_id).first()
    if target_emp:
        target_emp.salary = int(adj.target_salary)
    
    adj.status = "approved"
    adj.approved_by = current_employee.employee_id
    
    db.commit()
    return {"message": f"Salary adjusted to ${adj.target_salary} for {target_emp.full_name}"}

@router.patch("/{id}/reject")
def reject_adjustment_request(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role_level(2))
):
    """Reject salary adjustment request"""
    adj = db.query(SalaryAdjustment).filter(SalaryAdjustment.id == id).first()
    if not adj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if adj.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    adj.status = "rejected"
    adj.approved_by = current_employee.employee_id
    
    db.commit()
    return {"message": "Salary adjustment request rejected"}
