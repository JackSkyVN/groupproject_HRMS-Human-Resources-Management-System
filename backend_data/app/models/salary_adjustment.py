from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func, Date
from sqlalchemy.orm import relationship
from app.core.database import Base

class SalaryAdjustment(Base):
    """Bảng lưu trữ các yêu cầu điều chỉnh lương."""
    __tablename__ = "salary_adjustments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    
    current_salary = Column(Float, nullable=False)
    target_salary = Column(Float, nullable=False)
    
    reason = Column(String(255), nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True) # pending, approved, rejected
    effective_date = Column(Date, nullable=False)
    
    approved_by = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Quan hệ (Relationships)
    employee = relationship("Employee", foreign_keys=[employee_id])
    requester = relationship("Employee", foreign_keys=[requester_id])
    approver = relationship("Employee", foreign_keys=[approved_by])
