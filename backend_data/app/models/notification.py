from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Notification(Base):
    """
    Bảng Notification - Thông báo hệ thống
    Hỗ trợ gửi theo: all, department, role, individual
    """
    __tablename__ = "notification"

    notification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(20), nullable=False, index=True)  # info, warning, urgent, announcement
    
    sender_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)
    
    # Target configuration
    target_type = Column(String(20), nullable=False, index=True)  # all, department, role, individual
    target_department_id = Column(Integer, ForeignKey("departments.department_id"), nullable=True)
    target_role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime, nullable=True)  # Hết hạn thông báo

    # Relationships
    sender = relationship("Employee", back_populates="sent_notifications", foreign_keys=[sender_id])
    target_department = relationship("Department")
    target_role = relationship("Role")
    recipients = relationship("NotificationRecipient", back_populates="notification", cascade="all, delete-orphan")
