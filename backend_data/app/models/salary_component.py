from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SalaryComponent(Base):
    """Bảng định nghĩa các thành phần cấu thành lương (Phụ cấp, Thưởng, Khấu trừ, v.v.)."""
    __tablename__ = "salary_component"

    component_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    component_name = Column(String(100), unique=True, nullable=False, index=True)
    component_type = Column(String(20), nullable=False, index=True)  # basic, allowance, bonus, overtime, deduction
    is_taxable = Column(Boolean, default=True, nullable=False)  # Có tính thuế không
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Quan hệ (Relationships)
    payroll_details = relationship("PayrollDetail", back_populates="component")
