from sqlalchemy import Integer, String, Date, Time, Text, ForeignKey, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, time
from app.core.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Linked to Employee instead of User as per diagram
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_in_time: Mapped[time] = mapped_column(Time, nullable=True)
    check_out_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), nullable=True, index=True) # e.g. "Present", "Late", "Absent"
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # AI specific fields (kept for functionality)
    snapshot_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Optimization: Composite index for "Get employee's attendance for a specific date"
    __table_args__ = (
        Index('idx_attendance_employee_date', 'employee_id', 'date'),
    )

    employee = relationship("Employee")
