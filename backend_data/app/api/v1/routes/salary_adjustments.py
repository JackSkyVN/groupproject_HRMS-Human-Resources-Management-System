from fastapi import APIRouter, Depends, HTTPException, status
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
    employee_department: Optional[str] = None
    requester_name: Optional[str] = None
    requester_level: Optional[int] = None  # Phân cấp người yêu cầu để FE xử lý cross-approval

    class Config:
        from_attributes = True

# ==================== ROUTES ====================

@router.post("/", response_model=SalaryAdjustmentOut, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=SalaryAdjustmentOut, status_code=status.HTTP_201_CREATED)  # Without trailing slash
def submit_adjustment_request(
    request: SalaryAdjustmentCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Submit a salary adjustment request."""
    # Chỉ cho bản thân: Bắt buộc employee_id là user hiện tại
    if request.employee_id != current_employee.employee_id:
        raise HTTPException(status_code=403, detail="You can only request salary adjustments for yourself")
    
    target_emp = current_employee  # Gửi yêu cầu cho chính mình

    new_adj = SalaryAdjustment(
        employee_id=current_employee.employee_id,
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
    
    # Thêm tên và cấp bậc người yêu cầu vào phản hồi
    new_adj.employee_name = target_emp.full_name
    new_adj.employee_department = target_emp.department.department_name if target_emp.department else "N/A"
    new_adj.requester_name = current_employee.full_name
    
    # Lấy level role của người yêu cầu
    requester_role = db.get(Role, current_employee.role_id)
    new_adj.requester_level = requester_role.role_level if requester_role else 4
    
    return new_adj

@router.get("/", response_model=List[SalaryAdjustmentOut])
@router.get("", response_model=List[SalaryAdjustmentOut])  # Without trailing slash
def list_adjustment_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """List salary adjustment requests."""
    query = db.query(SalaryAdjustment)
    
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4
    
    if level > 3:
        # Nhân viên thường chỉ thấy yêu cầu của chính họ
        query = query.filter(
            (SalaryAdjustment.requester_id == current_employee.employee_id) | 
            (SalaryAdjustment.employee_id == current_employee.employee_id)
        )
    
    if status:
        query = query.filter(SalaryAdjustment.status == status)
        
    results = query.order_by(SalaryAdjustment.created_at.desc()).all()
    
    # Map tên và level để trả về schema
    for r in results:
        r.employee_name = r.employee.full_name
        r.employee_department = r.employee.department.department_name if r.employee.department else "N/A"
        r.requester_name = r.requester.full_name
        # Lấy level role của người yêu cầu cho logic cross-approval
        requester_role = db.get(Role, r.requester.role_id) if r.requester else None
        r.requester_level = requester_role.role_level if requester_role else 4
        
    return results

@router.patch("/{id}/approve")
def approve_adjustment_request(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_role_level(2))
):
    """Approve a salary adjustment request."""
    adj = db.query(SalaryAdjustment).filter(SalaryAdjustment.id == id).first()
    if not adj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if adj.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Không cho phép tự phê duyệt
    if adj.requester_id == current_employee.employee_id:
        raise HTTPException(status_code=403, detail="You cannot approve your own salary request")
    
    # LOGIC PHÊ DUYỆT CHÉO (CROSS-APPROVAL)
    current_role = db.get(Role, current_employee.role_id)
    requester = db.get(Employee, adj.requester_id)
    requester_role = db.get(Role, requester.role_id) if requester else None
    
    current_level = current_role.role_level if current_role else 4
    requester_level = requester_role.role_level if requester_role else 4
    
    # Admin (L1) gửi -> Chỉ HR Manager (L2) mới được duyệt
    if requester_level == 1 and current_level != 2:
        raise HTTPException(status_code=403, detail="Only HR Manager (L2) can approve Admin (L1) requests")
    
    # HR Manager (L2) gửi -> Chỉ Admin (L1) mới được duyệt
    if requester_level == 2 and current_level != 1:
        raise HTTPException(status_code=403, detail="Only Admin (L1) can approve HR Manager (L2) requests")
    
    # Các yêu cầu từ L3+: Cả L1 và L2 đều có quyền duyệt (đã check ở require_role_level)
    
    # Áp dụng thay đổi cho nhân viên
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
    """Reject a salary adjustment request."""
    adj = db.query(SalaryAdjustment).filter(SalaryAdjustment.id == id).first()
    if not adj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if adj.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Không cho phép tự từ chối
    if adj.requester_id == current_employee.employee_id:
        raise HTTPException(status_code=403, detail="You cannot reject your own salary request")
    
    # LOGIC PHÊ DUYỆT CHÉO (giống approve)
    current_role = db.get(Role, current_employee.role_id)
    requester = db.get(Employee, adj.requester_id)
    requester_role = db.get(Role, requester.role_id) if requester else None
    
    current_level = current_role.role_level if current_role else 4
    requester_level = requester_role.role_level if requester_role else 4
    
    # Admin (L1) gửi -> Chỉ L2 mới được từ chối
    if requester_level == 1 and current_level != 2:
        raise HTTPException(status_code=403, detail="Only HR Manager (L2) can reject Admin (L1) requests")
    
    # HR Manager (L2) gửi -> Chỉ L1 mới được từ chối
    if requester_level == 2 and current_level != 1:
        raise HTTPException(status_code=403, detail="Only Admin (L1) can reject HR Manager (L2) requests")
    
    adj.status = "rejected"
    adj.approved_by = current_employee.employee_id
    adj.approved_at = datetime.now()
    
    db.commit()
    
    return {"message": "Salary adjustment rejected successfully", "adjustment_id": id}


@router.delete("/{adj_id}")
@router.delete("/{adj_id}/")
def delete_salary_request(
    adj_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Permanently delete a salary adjustment request (only if PENDING and owned by requester)."""
    
    # Get the request
    adjustment = db.get(SalaryAdjustment, adj_id)
    if not adjustment:
        raise HTTPException(status_code=404, detail="Salary adjustment request not found")
    
    # Check ownership: Only the requester can delete their own request
    if adjustment.employee_id != current_employee.employee_id:
        raise HTTPException(status_code=403, detail="You can only delete your own requests")
    
    # Only allow deletion if status is PENDING
    if adjustment.status != "pending":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete request with status '{adjustment.status}'. Only PENDING requests can be deleted."
        )
    
    # Permanently delete
    db.delete(adjustment)
    db.commit()
    
    return {"message": "Salary adjustment request deleted successfully", "adjustment_id": adj_id}
