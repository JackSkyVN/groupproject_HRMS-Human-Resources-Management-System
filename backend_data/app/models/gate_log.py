from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean, ForeignKey, func, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class GateLog(Base):
    """Bảng ghi nhận ra/vào cổng qua Face Recognition."""
    __tablename__ = "gate_logs"
    
    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True, index=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    direction = Column(String(10), default="entry", nullable=False)  # 'entry' or 'exit'
    face_score = Column(Numeric(5, 3), nullable=True)  # Độ tin cậy (0-1)
    snapshot_path = Column(String(255), nullable=True)  # Đường dẫn ảnh
    recognized = Column(Boolean, default=True, nullable=False)  # TRUE nếu nhận diện được
    employee_name = Column(String(255), nullable=True)  # Cache tên để hiển thị nhanh
    created_at = Column(DateTime, server_default=func.now())
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_gate_timestamp_desc', timestamp.desc()),
        Index('idx_gate_employee_time', 'employee_id', timestamp.desc()),
    )
    
    # Quan hệ (Relationships)
    employee = relationship("Employee", foreign_keys=[employee_id])
