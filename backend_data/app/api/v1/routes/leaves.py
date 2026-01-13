from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, or_, func
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.models.employees import Employee
from app.models.leave_request import LeaveRequest
from app.models.leave_type import LeaveType
from app.models.departments import Department
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
    """Submit leave request (Max 3 paid days per month)."""
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date")
        
    days = (payload.end_date - payload.start_date).days + 1
    
    # Quy tắc nghiêm ngặt: Tối đa 3 ngày nghỉ phép có lương mỗi tháng
    month = payload.start_date.month
    year = payload.start_date.year
    
    # Kiểm tra xem loại phép này có được trả lương không
    ltype = db.get(LeaveType, payload.leave_type_id)
    if not ltype:
        raise HTTPException(status_code=404, detail="Leave type not found")
        
    if ltype.is_paid:
        # Tính số ngày đã được duyệt + số ngày đang đăng ký trong tháng này
        stmt = select(func.sum(LeaveRequest.total_days)).where(
            LeaveRequest.employee_id == current_employee.employee_id,
            LeaveRequest.status == 'approved',
            func.extract('month', LeaveRequest.start_date) == month,
            func.extract('year', LeaveRequest.start_date) == year,
            LeaveRequest.leave_type_id == payload.leave_type_id
        )
        existing_days = db.execute(stmt).scalar() or 0
        
        if (float(existing_days) + float(days)) > 3.0: # Giới hạn ở 3 ngày
            raise HTTPException(
                status_code=400, 
                detail=f"Warning: Max 3 paid leave days per month. You have requested {float(existing_days) + float(days)} days."
            )

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

@router.get("")
async def list_leaves(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100
):
    """
    List leave requests with tiered access:
    - Admin/HR General: All records.
    - HR Staff: All records (filtered by frontend).
    - Staff: Personal records only.
    """
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    # Sử dụng db.query để lấy đơn nghỉ phép
    query = db.query(LeaveRequest)

    if level > 3:
        # Nhân viên thường chỉ thấy của bản thân
        query = query.filter(LeaveRequest.employee_id == current_employee.employee_id)

    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if status:
        query = query.filter(LeaveRequest.status == status)

    results = query.order_by(desc(LeaveRequest.created_at)).offset(skip).limit(limit).all()
    
    output = []
    for req in results:
        emp = req.employee
        ltype = req.leave_type
        dept = emp.department if emp else None
        approver = db.get(Employee, req.approver_id) if req.approver_id else None
        target_role = emp.role if emp else None
        output.append({
            "request_id": req.request_id,
            "employee_id": emp.employee_id,
            "employee_name": emp.full_name,
            "employee_role_level": target_role.role_level if target_role else 4,
            "employee_dept_id": emp.department_id,
            "employee_dept_name": dept.department_name,
            "leave_type_name": ltype.type_name,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "total_days": float(req.total_days or 0),
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
    """Approve or reject leave request (Tiered Approval)."""
    req = db.get(LeaveRequest, id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    target_emp = db.get(Employee, req.employee_id)
    target_role = db.get(Role, target_emp.role_id)
    current_role = db.get(Role, current_employee.role_id)
    
    # Logic phê duyệt tương hỗ: L1/L2 có thể phê duyệt cho nhau, nhưng KHÔNG AI được tự phê duyệt cho mình.
    if current_employee.employee_id == target_emp.employee_id:
        raise HTTPException(status_code=403, detail="You cannot approve your own leave request.")

    allowed = False
    
    # Phê duyệt theo cấp bậc (Tiered Approval)
    if current_role.role_level < target_role.role_level:
        if current_role.role_level == 3:
            # HR Staff (Level 3) có thể duyệt cho các cấp thấp hơn (Staff).
            # Giới hạn theo phòng ban được quản lý bởi frontend.
            allowed = True
        else:
            allowed = True
    
    # Phê duyệt chéo cho L1 & L2 (Cross-Approval)
    elif current_role.role_level in [1, 2] and target_role.role_level in [1, 2]:
        allowed = True
            
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions: You can only approve leaves for subordinates or peer top-level leaders.")

    req.status = payload.status
    req.approver_id = current_employee.employee_id
    req.approved_at = datetime.now()
    
    # Gửi thông báo (Notification)
    notif = Notification(
        title=f"Leave request {payload.status}",
        message=f"Your leave request from {req.start_date} to {req.end_date} has been {payload.status}.",
        type="leave_status",
        sender_id=current_employee.employee_id,
        target_type="individual"
    )
    db.add(notif)
    db.commit()
    
    return {"ok": True, "status": payload.status}

@router.delete("/{id}")
async def delete_leave_request(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Permanently delete leave request (Hard Delete)."""
    req = db.get(LeaveRequest, id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    target_emp = db.get(Employee, req.employee_id)
    target_role = db.get(Role, target_emp.role_id)
    current_role = db.get(Role, current_employee.role_id)
    
    # Logic phân quyền:
    # 1. Admin/Director (L1, L2) có thể xóa bất kỳ đơn nào
    # 2. Người tạo có thể xóa nếu đơn vẫn đang ở trạng thái PENDING
    can_delete = False
    if current_role.role_level in [1, 2]:
        can_delete = True
    elif req.employee_id == current_employee.employee_id and req.status == 'pending':
        can_delete = True
        
    if not can_delete:
        raise HTTPException(
            status_code=403, 
            detail="Permission denied: Request processed or unauthorized."
        )

    db.delete(req)
    db.commit()
    return {"ok": True, "message": "Record permanently deleted."}

# Helper
async def get_leave_details(request_id: int, db: Session):
    stmt = select(LeaveRequest, Employee, LeaveType, Department).\
        join(Employee, LeaveRequest.employee_id == Employee.employee_id).\
        join(LeaveType, LeaveRequest.leave_type_id == LeaveType.leave_type_id).\
        join(Department, Employee.department_id == Department.department_id).\
        where(LeaveRequest.request_id == request_id)
    
    result = db.execute(stmt).first()
    if not result:
        return None
    req, emp, ltype, dept = result
    target_role = db.get(Role, emp.role_id)
    approver = db.get(Employee, req.approver_id) if req.approver_id else None
    return {
        "request_id": req.request_id,
        "employee_id": emp.employee_id,
        "employee_name": emp.full_name,
        "employee_role_level": target_role.role_level if target_role else 4,
        "employee_dept_id": emp.department_id,
        "employee_dept_name": dept.department_name,
        "leave_type_name": ltype.type_name,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "total_days": float(req.total_days or 0),
        "reason": req.reason,
        "status": req.status,
        "approver_id": req.approver_id,
        "approver_name": approver.full_name if approver else None,
        "created_at": req.created_at
    }
