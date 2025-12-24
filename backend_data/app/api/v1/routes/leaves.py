from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, or_
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.models.employees import Employee
from app.models.leave_request import LeaveRequest
from app.models.leave_type import LeaveType
from app.models.roles import Role
from app.models.notification import Notification
from app.auth.deps import get_current_employee

router = APIRouter()

# ==================== SCHEMAS ====================

class LeaveRequestCreate(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveRequestOut(BaseModel):
    request_id: int
    employee_id: int
    employee_name: str
    leave_type_name: str
    start_date: date
    end_date: date
    total_days: float
    reason: Optional[str] = None
    status: str
    approver_id: Optional[int] = None
    approver_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LeaveStatusUpdate(BaseModel):
    status: str  # approved, rejected

# ==================== ROUTES ====================

@router.post("", response_model=LeaveRequestOut)
async def submit_leave_request(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Gửi đơn xin nghỉ phép"""
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date")
        
    days = (payload.end_date - payload.start_date).days + 1
    
    new_request = LeaveRequest(
        employee_id=current_employee.employee_id,
        leave_type_id=payload.leave_type_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_days=days,
        reason=payload.reason,
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return await get_leave_details(new_request.request_id, db)

@router.get("", response_model=list[LeaveRequestOut])
async def list_leaves(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100
):
    """
    Xem danh sách nghỉ phép theo quyền:
    - Admin/HR Chung: Tất cả.
    - HR Phòng ban: Nhân viên trong phòng + chính mình.
    - Staff: Chỉ chính mình.
    """
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    stmt = select(LeaveRequest, Employee, LeaveType).\
        join(Employee, LeaveRequest.employee_id == Employee.employee_id).\
        join(LeaveType, LeaveRequest.leave_type_id == LeaveType.leave_type_id)

    if level == 1 or level == 2:
        pass
    elif level == 3:
        stmt = stmt.where(or_(
            Employee.department_id == current_employee.department_id,
            LeaveRequest.employee_id == current_employee.employee_id
        ))
    else:
        stmt = stmt.where(LeaveRequest.employee_id == current_employee.employee_id)

    if employee_id:
        stmt = stmt.where(LeaveRequest.employee_id == employee_id)
    if status:
        stmt = stmt.where(LeaveRequest.status == status)

    results = db.execute(stmt.order_by(desc(LeaveRequest.created_at)).offset(skip).limit(limit)).all()
    
    output = []
    for req, emp, ltype in results:
        approver = db.get(Employee, req.approver_id) if req.approver_id else None
        output.append({
            "request_id": req.request_id,
            "employee_id": emp.employee_id,
            "employee_name": emp.full_name,
            "leave_type_name": ltype.type_name,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "total_days": float(req.total_days),
            "reason": req.reason,
            "status": req.status,
            "approver_id": req.approver_id,
            "approver_name": approver.full_name if approver else None,
            "created_at": req.created_at
        })
    return output

@router.put("/{id}/status")
async def update_leave_status(
    id: int,
    payload: LeaveStatusUpdate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Duyệt/Từ chối đơn nghỉ phép (Tiered Approval)"""
    req = db.get(LeaveRequest, id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    target_emp = db.get(Employee, req.employee_id)
    target_role = db.get(Role, target_emp.role_id)
    current_role = db.get(Role, current_employee.role_id)
    
    # Tiered Approval Logic
    allowed = False
    if current_role.role_level == 1 and target_role.role_level == 2: allowed = True
    elif current_role.role_level == 2 and target_role.role_level == 3: allowed = True
    elif current_role.role_level == 3 and target_role.role_level == 4:
        if target_emp.department_id == current_employee.department_id:
            allowed = True
            
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions for tiered approval")

    req.status = payload.status
    req.approver_id = current_employee.employee_id
    req.approved_at = datetime.now()
    
    # Notification
    notif = Notification(
        title=f"Đơn nghỉ phép {payload.status}",
        message=f"Đơn nghỉ phép của bạn từ {req.start_date} đến {req.end_date} đã được {payload.status}.",
        type="leave_status",
        sender_id=current_employee.employee_id,
        target_type="individual"
    )
    db.add(notif)
    db.commit()
    
    return {"ok": True, "status": payload.status}

# Helper
async def get_leave_details(request_id: int, db: Session):
    stmt = select(LeaveRequest, Employee, LeaveType).\
        join(Employee, LeaveRequest.employee_id == Employee.employee_id).\
        join(LeaveType, LeaveRequest.leave_type_id == LeaveType.leave_type_id).\
        where(LeaveRequest.request_id == request_id)
    
    result = db.execute(stmt).first()
    if not result:
        return None
    req, emp, ltype = result
    approver = db.get(Employee, req.approver_id) if req.approver_id else None
    return {
        "request_id": req.request_id,
        "employee_id": emp.employee_id,
        "employee_name": emp.full_name,
        "leave_type_name": ltype.type_name,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "total_days": float(req.total_days),
        "reason": req.reason,
        "status": req.status,
        "approver_id": req.approver_id,
        "approver_name": approver.full_name if approver else None,
        "created_at": req.created_at
    }
