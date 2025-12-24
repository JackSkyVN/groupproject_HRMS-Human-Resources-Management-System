from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class NotificationRecipient(Base):
    """
    Bảng Notification_Recipient - Người nhận thông báo
    Theo dõi trạng thái đã đọc/chưa đọc
    """
    __tablename__ = "notification_recipient"

    recipient_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    notification_id = Column(Integer, ForeignKey("notification.notification_id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    # Composite index for faster queries
    __table_args__ = (
        Index('idx_recipient_notif_emp', 'notification_id', 'employee_id'),
        Index('idx_recipient_emp_unread', 'employee_id', 'is_read'),
    )

    # Relationships
    notification = relationship("Notification", back_populates="recipients")
    employee = relationship("Employee", back_populates="received_notifications")
