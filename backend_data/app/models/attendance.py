from sqlalchemy import Column, Integer, String, Date, Time, Numeric, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Attendance(Base):
    """Bảng ghi nhận chấm công hàng ngày."""
    __tablename__ = "attendance"

    attendance_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    work_date = Column(Date, nullable=False, index=True)
    
    # Ca chính (08:30 - 17:30)
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    status = Column(String(20), default="absent", nullable=False, index=True)  # present, absent, late, etc.
    
    # Ca tăng ca (18:00 - 22:00)
    ot_check_in_time = Column(DateTime, nullable=True)
    ot_check_out_time = Column(DateTime, nullable=True)
    ot_status = Column(String(20), default="absent", nullable=False)  # present_ot, absent_ot
    
    # Các trường tính toán
    work_hours = Column(Numeric(5, 2), default=0, nullable=False)  # Tổng giờ làm việc (Main)
    late_minutes = Column(Integer, default=0, nullable=False)
    early_leave_minutes = Column(Integer, default=0, nullable=False)
    overtime_hours = Column(Numeric(5, 2), default=0, nullable=False) # Tổng giờ OT
    
    # Face Recognition Snapshots
    snapshot_checkin = Column(String(255), nullable=True)  # Đường dẫn ảnh check-in
    snapshot_checkout = Column(String(255), nullable=True)  # Đường dẫn ảnh check-out
    face_score_checkin = Column(Numeric(5, 3), nullable=True)  # Độ tin cậy check-in (0-1)
    face_score_checkout = Column(Numeric(5, 3), nullable=True)  # Độ tin cậy check-out (0-1)

    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Mỗi nhân viên chỉ có 1 bản ghi chấm công mỗi ngày
    __table_args__ = (
        Index('idx_attendance_employee_date', 'employee_id', 'work_date', unique=True),
    )

    # Quan hệ (Relationships)
    employee = relationship("Employee", back_populates="attendance_records")
