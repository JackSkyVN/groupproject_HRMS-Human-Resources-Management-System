from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Department(Base):
    """
    Bảng Departments - Phòng ban
    Mỗi phòng ban có 1 HR manager quản lý
    """
    __tablename__ = "departments"

    department_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    department_name = Column(String(100), nullable=False, index=True)
    department_code = Column(String(20), unique=True, nullable=False, index=True)
    hr_manager_id = Column(Integer, ForeignKey("employees.employee_id", use_alter=True, name="fk_dept_hr_manager"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employees = relationship("Employee", back_populates="department", foreign_keys="[Employee.department_id]")
    positions = relationship("Position", back_populates="department")
    hr_manager = relationship("Employee", foreign_keys=[hr_manager_id], post_update=True)
