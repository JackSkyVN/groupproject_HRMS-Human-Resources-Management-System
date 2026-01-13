from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Role(Base):
    """Bảng định nghĩa các vai trò/quyền hạn (Admin, HR, v.v.)."""
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)
    role_level = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Quan hệ (Relationships)
    employees = relationship("Employee", back_populates="role")
