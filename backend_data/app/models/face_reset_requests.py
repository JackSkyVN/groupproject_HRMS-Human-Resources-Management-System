from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class FaceResetRequest(Base):
    """Bảng yêu cầu cấp lại (đăng ký lại) khuôn mặt."""
    __tablename__ = "face_reset_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    requested_at = Column(DateTime, default=datetime.now)
    reviewed_by = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    admin_note = Column(Text, nullable=True)
    
    # Quan hệ (Relationships)
    employee = relationship("Employee", foreign_keys=[employee_id])
    reviewer = relationship("Employee", foreign_keys=[reviewed_by])
