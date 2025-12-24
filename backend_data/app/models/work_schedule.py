from sqlalchemy import Column, Integer, Date, Time, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import time as dt_time


class WorkSchedule(Base):
    """
    Bảng Work_Schedule - Lịch làm việc
    Định nghĩa ca làm việc của từng nhân viên theo ngày
    """
    __tablename__ = "work_schedule"

    schedule_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(Date, nullable=False, index=True)
    
    shift_start = Column(Time, nullable=False, default=dt_time(8, 0))  # 08:00
    shift_end = Column(Time, nullable=False, default=dt_time(17, 0))  # 17:00
    is_working_day = Column(Boolean, default=True, nullable=False)  # False nếu nghỉ, ngày lễ

    # Unique constraint: one schedule per employee per day
    __table_args__ = (
        Index('idx_schedule_employee_date', 'employee_id', 'work_date', unique=True),
    )

    # Relationships
    employee = relationship("Employee", back_populates="work_schedules")
