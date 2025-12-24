from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LeaveType(Base):
    """
    Bảng Leave_Type - Loại nghỉ phép
    Ví dụ: Nghỉ phép năm, Nghỉ ốm, Nghỉ không lương
    """
    __tablename__ = "leave_type"

    leave_type_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_name = Column(String(50), unique=True, nullable=False, index=True)
    is_paid = Column(Boolean, default=True, nullable=False)  # Có hưởng lương không
    days_per_year = Column(Integer, default=12, nullable=False)  # Số ngày được phép/năm
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    leave_requests = relationship("LeaveRequest", back_populates="leave_type")
    leave_balances = relationship("LeaveBalance", back_populates="leave_type")
