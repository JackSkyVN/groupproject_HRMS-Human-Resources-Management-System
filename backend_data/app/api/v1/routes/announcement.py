from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.notification_recipient import NotificationRecipient

from app.core.database import get_db
from app.models.employees import Employee
from app.models.notification import Notification
from app.models.roles import Role
from app.models.departments import Department
from app.auth.deps import get_current_employee

router = APIRouter()

# ==================== SCHEMAS ====================

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    target_type: str = "all"  # all, department, role
    target_id: Optional[int] = None

class AnnouncementOut(BaseModel):
    notification_id: int
    title: str
    message: str
    created_at: datetime
    sender_name: str

    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    notification_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== ROUTES ====================

@router.post("/announcements")
async def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Create a new general announcement (Admin/HR)."""
    # Lấy Role thực tế từ DB để check level
    current_role = db.get(Role, current_employee.role_id)
    if not current_role or current_role.role_level > 3:
        raise HTTPException(status_code=403, detail="Only Admin, HR Manager, or HR Staff can post announcements")
        
    ann = Notification(
        title=payload.title,
        message=payload.message,
        type="announcement",
        sender_id=current_employee.employee_id,
        target_type=payload.target_type,
        # Nếu target_type là department, lưu vào target_department_id
        target_department_id=payload.target_id if payload.target_type == "department" else None,
        # Nếu target_type là role, lưu vào target_role_id
        target_role_id=payload.target_id if payload.target_type == "role" else None
    )
    db.add(ann)
    db.commit()
    return {"ok": True, "announcement_id": ann.notification_id}

@router.get("/announcements")
async def list_announcements(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """List active announcements for the current user."""
    
    # Subquery lấy IDs bị ẩn
    hidden_ids_stmt = select(NotificationRecipient.notification_id).where(
        NotificationRecipient.employee_id == current_employee.employee_id,
        NotificationRecipient.is_hidden == True
    )
    hidden_ids = db.execute(hidden_ids_stmt).scalars().all()

    # Sử dụng db.query để lấy thông báo
    query = db.query(Notification).filter(Notification.type == "announcement")

    # Lọc bỏ các thông báo đã ẩn
    if hidden_ids:
        query = query.filter(Notification.notification_id.notin_(hidden_ids))

    # Lọc theo đối tượng nhận
    query = query.filter(or_(
        Notification.target_type == "all",
        (Notification.target_type == "department") & (Notification.target_department_id == current_employee.department_id),
        (Notification.target_type == "role") & (Notification.target_role_id == current_employee.role_id)
    ))

    results = query.order_by(desc(Notification.created_at)).all()
    
    output = []
    for ann in results:
        sender = ann.sender
        dept = ann.target_department
        role = ann.target_role
        # Determine target_detail
        target_detail = "Everyone"
        if ann.target_type == "department" and dept:
            target_detail = dept.department_name
        elif ann.target_type == "role" and role:
            target_detail = role.role_name
            
        output.append({
            "notification_id": ann.notification_id,
            "title": ann.title,
            "message": ann.message,
            "created_at": ann.created_at,
            "sender_name": sender.full_name,
            "target_type": ann.target_type,
            "target_detail": target_detail
        })
    return output

@router.delete("/notifications/{id}/dismiss")
async def dismiss_notification(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Dismiss/Hide an announcement for the current user."""
    recipient = db.query(NotificationRecipient).filter(
        NotificationRecipient.notification_id == id,
        NotificationRecipient.employee_id == current_employee.employee_id
    ).first()
    
    if not recipient:
        recipient = NotificationRecipient(
            notification_id=id,
            employee_id=current_employee.employee_id,
            is_read=True,
            is_hidden=True
        )
        db.add(recipient)
    else:
        recipient.is_hidden = True
        
    db.commit()
    return {"ok": True}

@router.get("/announcements/trash")
async def list_trash(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """List dismissed announcements (Admin/HR Manager only)."""
    current_role = db.get(Role, current_employee.role_id)
    if not current_role or current_role.role_level > 2:
        raise HTTPException(status_code=403, detail="Only Admin or HR Manager can view trash")
    
    # Subquery lấy IDs bị ẩn bởi user hiện tại
    hidden_ids_stmt = select(NotificationRecipient.notification_id).where(
        NotificationRecipient.employee_id == current_employee.employee_id,
        NotificationRecipient.is_hidden == True
    )
    hidden_ids = db.execute(hidden_ids_stmt).scalars().all()
    
    if not hidden_ids:
        return []
    
    # Join với Employee, Department, Role để lấy chi tiết
    stmt = select(Notification, Employee, Department, Role).\
        join(Employee, Notification.sender_id == Employee.employee_id).\
        outerjoin(Department, Notification.target_department_id == Department.department_id).\
        outerjoin(Role, Notification.target_role_id == Role.role_id).\
        where(Notification.type == "announcement").\
        where(Notification.notification_id.in_(hidden_ids))
    
    results = db.execute(stmt.order_by(desc(Notification.created_at))).all()
    output = []
    for ann, sender, dept, role in results:
        target_detail = "Everyone"
        if ann.target_type == "department" and dept:
            target_detail = dept.department_name
        elif ann.target_type == "role" and role:
            target_detail = role.role_name
            
        output.append({
            "notification_id": ann.notification_id,
            "title": ann.title,
            "message": ann.message,
            "created_at": ann.created_at,
            "sender_name": sender.full_name,
            "target_type": ann.target_type,
            "target_detail": target_detail
        })
    return output

@router.post("/announcements/{id}/restore")
async def restore_announcement(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Restore a dismissed announcement (Admin/HR Manager only)."""
    current_role = db.get(Role, current_employee.role_id)
    if not current_role or current_role.role_level > 2:
        raise HTTPException(status_code=403, detail="Only Admin or HR Manager can restore announcements")
    
    recipient = db.query(NotificationRecipient).filter(
        NotificationRecipient.notification_id == id,
        NotificationRecipient.employee_id == current_employee.employee_id
    ).first()
    
    if not recipient:
        raise HTTPException(status_code=404, detail="No dismissed record found")
    
    recipient.is_hidden = False
    db.commit()
    return {"ok": True}

@router.delete("/announcements/{id}")
async def delete_announcement(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Permanently delete an announcement record."""
    current_role = db.get(Role, current_employee.role_id)
    if not current_role or current_role.role_level > 2:
        raise HTTPException(status_code=403, detail="Only Admin or HR Manager can delete announcements")
    
    ann = db.get(Notification, id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    db.delete(ann)
    db.commit()
    return {"ok": True}

