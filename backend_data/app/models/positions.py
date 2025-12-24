from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Position(Base):
    """
    Bảng Positions - Chức vụ
    Ví dụ: Giám đốc, Trưởng phòng, Nhân viên, Thực tập sinh
    """
    __tablename__ = "positions"

    position_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    position_name = Column(String(100), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.department_id"), nullable=True)
    base_salary_range = Column(Numeric(15, 2), nullable=True)  # Mức lương cơ bản
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    department = relationship("Department", back_populates="positions")
    employees = relationship("Employee", back_populates="position")
