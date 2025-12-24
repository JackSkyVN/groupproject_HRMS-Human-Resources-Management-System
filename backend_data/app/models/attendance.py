from sqlalchemy import Column, Integer, String, Date, Time, Numeric, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Attendance(Base):
    """
    Bảng Attendance - Chấm công (Manual/QR Code - không AI)
    Ghi nhận giờ vào/ra, tính giờ làm, muộn, tăng ca
    """
    __tablename__ = "attendance"

    attendance_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(Date, nullable=False, index=True)
    
    # Check in/out times
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    
    # Calculated fields
    work_hours = Column(Numeric(5, 2), default=0, nullable=False)  # Số giờ làm việc
    late_minutes = Column(Integer, default=0, nullable=False)  # Số phút đi muộn
    overtime_hours = Column(Numeric(5, 2), default=0, nullable=False)  # Số giờ tăng ca
    
    # Status
    status = Column(String(20), default="present", nullable=False, index=True)  # present, absent, late, half_day
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Unique constraint: one attendance record per employee per day
    __table_args__ = (
        Index('idx_attendance_employee_date', 'employee_id', 'work_date', unique=True),
    )

    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")
