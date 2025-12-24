from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.employees import Employee
from app.models.announcement import Announcement
from app.models.notification import Notification
from app.models.roles import Role
from app.auth.deps import get_current_employee

router = APIRouter()

# ==================== SCHEMAS ====================

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    target_type: str = "all"  # all, department, role
    target_id: Optional[int] = None

class AnnouncementOut(BaseModel):
    announcement_id: int
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
    """Tạo thông báo (Admin/HR Chung)"""
    current_role = db.get(Role, current_employee.role_id)
    if current_role.role_level > 2:
        raise HTTPException(status_code=403, detail="Only Admin or HR General can post announcements")
        
    ann = Announcement(
        title=payload.title,
        message=payload.message,
        sender_id=current_employee.employee_id,
        target_type=payload.target_type,
        target_id=payload.target_id
    )
    db.add(ann)
    db.commit()
    return {"ok": True, "announcement_id": ann.announcement_id}

@router.get("/announcements", response_model=List[AnnouncementOut])
async def list_announcements(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Xem thông báo phù hợp"""
    stmt = select(Announcement, Employee).join(Employee, Announcement.sender_id == Employee.employee_id).\
        where(or_(
            Announcement.target_type == "all",
            (Announcement.target_type == "department") & (Announcement.target_id == current_employee.department_id),
            (Announcement.target_type == "role") & (Announcement.target_id == current_employee.role_id)
        ))
    
    results = db.execute(stmt.order_by(desc(Announcement.created_at))).all()
    output = []
    for ann, sender in results:
        output.append({
            "announcement_id": ann.announcement_id,
            "title": ann.title,
            "message": ann.message,
            "created_at": ann.created_at,
            "sender_name": sender.full_name
        })
    return output

@router.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Xem thông báo cá nhân"""
    stmt = select(Notification).where(
        (Notification.target_type == "individual") & (Notification.target_id == current_employee.employee_id)
    ).order_by(desc(Notification.created_at))
    
    results = db.execute(stmt).scalars().all()
    return results

@router.put("/notifications/{id}/read")
async def mark_read(
    id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    notif = db.get(Notification, id)
    if not notif or notif.target_id != current_employee.employee_id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    return {"ok": True}
