from sqlalchemy import Integer, String, Date, Float, Text, ForeignKey, Index, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from app.core.database import Base

class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    total_entitlement: Mapped[float] = mapped_column(Float, default=0.0)
    used_days: Mapped[float] = mapped_column(Float, default=0.0)
    remaining_days: Mapped[float] = mapped_column(Float, default=0.0)

    # Optimization: Unique constraint to prevent duplicate balances for same employee/year
    __table_args__ = (
        Index('idx_leave_balance_emp_year', 'employee_id', 'year', unique=True),
    )

    employee = relationship("Employee")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    
    leave_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "Annual", "Sick"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    approval_status: Mapped[str] = mapped_column(String(50), default="Pending", index=True) # Pending, Approved, Rejected
    approver_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approver_id])
