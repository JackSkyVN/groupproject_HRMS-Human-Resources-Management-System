from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LeaveRequest(Base):
    """
    Bảng Leave_Request - Đơn xin nghỉ phép
    Được duyệt bởi HR hoặc Manager
    """
    __tablename__ = "leave_request"

    request_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_type.leave_type_id"), nullable=False, index=True)
    
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    total_days = Column(Numeric(5, 2), nullable=False)  # Số ngày nghỉ (có thể 0.5 = nửa ngày)
    reason = Column(Text, nullable=True)
    
    # Approval workflow
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, approved, rejected
    approver_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="leave_requests", foreign_keys=[employee_id])
    leave_type = relationship("LeaveType", back_populates="leave_requests")
    approver = relationship("Employee", foreign_keys=[approver_id])
