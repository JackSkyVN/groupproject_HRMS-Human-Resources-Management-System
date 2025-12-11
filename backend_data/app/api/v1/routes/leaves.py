from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.models.org import Employee
from app.models.rbac import User, Role, UserRole
from app.models.leaves import LeaveRequest, LeaveBalance
from app.auth.deps import require_permission, get_current_user

router = APIRouter()

# --- Pydantic Models ---
class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveRequestOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None # Helper
    leave_type: str
    start_date: date
    end_date: date
    days: int
    reason: Optional[str] = None
    approval_status: str
    approver_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LeaveStatusUpdate(BaseModel):
    status: str

# --- Routes ---

@router.post("/leaves", response_model=LeaveRequestOut)
def submit_leave_request(
    payload: LeaveRequestCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("attendance.view")) # grant minimal permissions
):
    # Lấy ID nhân viên từ User
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    # Xác thực ngày tháng
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date")
    
    # Tính số ngày
    days = (payload.end_date - payload.start_date).days + 1
    
    # Kiểm tra số dư phép
    
    new_leave = LeaveRequest(
        employee_id=employee.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        approval_status="Pending"
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    
    return {
        "id": new_leave.id,
        "employee_id": new_leave.employee_id,
        "employee_name": employee.full_name,
        "leave_type": new_leave.leave_type,
        "start_date": new_leave.start_date,
        "end_date": new_leave.end_date,
        "days": days,
        "reason": new_leave.reason,
        "approval_status": new_leave.approval_status,
        "approver_id": new_leave.approver_id,
        "created_at": new_leave.created_at
    }

@router.get("/leaves", response_model=list[LeaveRequestOut])
def list_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Kiểm tra Admin
    is_admin = False
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role and db.query(UserRole).filter(UserRole.user_id == current_user.id, UserRole.role_id == admin_role.id).first():
        is_admin = True
        
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()

    stmt = select(LeaveRequest).order_by(desc(LeaveRequest.created_at))
    
    if not is_admin:
        if not employee:
            return []
        stmt = stmt.where(LeaveRequest.employee_id == employee.id)
        
    leaves = db.execute(stmt).scalars().all()
    
    results = []
    for leave in leaves:
        emp_name = "Unknown"
        if leave.employee: 
            emp_name = leave.employee.full_name or leave.employee.email
        
        days = (leave.end_date - leave.start_date).days + 1
        
        results.append({
            "id": leave.id,
            "employee_id": leave.employee_id,
            "employee_name": emp_name,
            "leave_type": leave.leave_type,
            "start_date": leave.start_date,
            "end_date": leave.end_date,
            "days": days,
            "reason": leave.reason,
            "approval_status": leave.approval_status,
            "approver_id": leave.approver_id,
            "created_at": leave.created_at
        })
        
    return results

@router.put("/leaves/{leave_id}/status")
def update_leave_status(
    leave_id: int,
    payload: LeaveStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employee.create")) # Quyền Admin/Quản lý
):
    # Lấy yêu cầu
    leave = db.get(LeaveRequest, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    # Lấy ID nhân viên phê duyệt
    approver = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    
    leave.approval_status = payload.status
    if approver:
        leave.approver_id = approver.id
        
    db.commit()
    return {"message": f"Leave request {payload.status}"}
