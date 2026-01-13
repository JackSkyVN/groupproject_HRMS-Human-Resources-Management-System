from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class FaceLog(Base):
    """Bảng ghi nhật ký nhận diện khuôn mặt."""
    __tablename__ = "face_logs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    score = Column(Float)
    pose = Column(String)
    attempt_type = Column(String) # 'verify' (xác thực) hoặc 'enroll' (đăng ký)
    matched = Column(Boolean)
    diag_json = Column(JSON)  # Lưu thông tin chẩn đoán

    # Quan hệ (Relationships)
    employee = relationship("Employee", backref="face_logs")
