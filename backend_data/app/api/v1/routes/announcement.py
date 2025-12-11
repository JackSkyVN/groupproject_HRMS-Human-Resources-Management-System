from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.announcement import Announcement
from app.models.rbac import User
from app.auth.deps import require_permission, get_current_user

router = APIRouter()

# --- Schemas ---
class AnnouncementCreate(BaseModel):
    title: str
    content: str

class AnnouncementOut(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Routes ---

@router.post("/announcements", response_model=AnnouncementOut)
def create_announcement(
    payload: AnnouncementCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("system.manage")) # Chỉ cấp cho Admin
):
    announcement = Announcement(
        title=payload.title,
        content=payload.content,
        author_id=current_user.id
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement

@router.get("/announcements", response_model=list[AnnouncementOut])
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Announcement).order_by(desc(Announcement.created_at))
    return db.execute(stmt).scalars().all()
