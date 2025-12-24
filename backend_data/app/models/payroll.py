from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Payroll(Base):
    """
    Bảng Payroll - Bảng lương tháng
    Tự động tính từ attendance, leave, overtime
    """
    __tablename__ = "payroll"

    payroll_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)  # 1-12
    year = Column(Integer, nullable=False, index=True)
    
    # Salary components
    basic_salary = Column(Numeric(15, 2), nullable=False)
    
    # Work statistics (từ attendance)
    work_days = Column(Integer, default=0, nullable=False)  # Số ngày làm việc chuẩn trong tháng
    actual_days = Column(Numeric(5, 2), default=0, nullable=False)  # Số ngày thực tế đi làm
    absent_days = Column(Numeric(5, 2), default=0, nullable=False)  # Số ngày vắng
    late_count = Column(Integer, default=0, nullable=False)  # Số lần đi muộn
    overtime_hours = Column(Numeric(6, 2), default=0, nullable=False)  # Số giờ tăng ca
    
    # Financial breakdown
    allowance = Column(Numeric(15, 2), default=0, nullable=False)  # Phụ cấp
    bonus = Column(Numeric(15, 2), default=0, nullable=False)  # Thưởng
    deduction = Column(Numeric(15, 2), default=0, nullable=False)  # Khấu trừ
    
    # Final amounts
    gross_salary = Column(Numeric(15, 2), nullable=False)  # Tổng lương trước thuế
    net_salary = Column(Numeric(15, 2), nullable=False)  # Lương thực nhận
    
    # Status & approval
    status = Column(String(20), default="draft", nullable=False, index=True)  # draft, approved, paid
    approved_by = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    payment_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Unique constraint: one payroll per employee per month/year
    __table_args__ = (
        Index('idx_payroll_unique', 'employee_id', 'month', 'year', unique=True),
    )

    # Relationships
    employee = relationship("Employee", back_populates="payroll_records", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approved_by])
    details = relationship("PayrollDetail", back_populates="payroll", cascade="all, delete-orphan")
