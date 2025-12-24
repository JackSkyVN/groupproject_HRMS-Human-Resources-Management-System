from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Role(Base):
    """
    Bảng Roles - 4 vai trò chính trong hệ thống
    Admin = 1, HR Chung = 2, HR Phòng ban = 3, Staff = 4
    """
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)
    role_level = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employees = relationship("Employee", back_populates="role")
