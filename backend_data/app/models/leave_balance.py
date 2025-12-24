from sqlalchemy import Column, Integer, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class LeaveBalance(Base):
    """
    Bảng Leave_Balance - Số ngày phép còn lại
    Theo dõi số ngày phép/năm cho từng loại nghỉ
    """
    __tablename__ = "leave_balance"

    balance_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_type.leave_type_id"), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    
    total_days = Column(Numeric(5, 2), nullable=False)  # Tổng số ngày được phép
    used_days = Column(Numeric(5, 2), default=0, nullable=False)  # Số ngày đã dùng
    remaining_days = Column(Numeric(5, 2), nullable=False)  # Số ngày còn lại

    # Unique constraint: one balance per employee per leave type per year
    __table_args__ = (
        Index('idx_leave_balance_unique', 'employee_id', 'leave_type_id', 'year', unique=True),
    )

    # Relationships
    employee = relationship("Employee", back_populates="leave_balances")
    leave_type = relationship("LeaveType", back_populates="leave_balances")
