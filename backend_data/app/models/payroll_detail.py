from sqlalchemy import Column, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class PayrollDetail(Base):
    """
    Bảng Payroll_Detail - Chi tiết các thành phần lương
    Lưu từng khoản: lương cơ bản, phụ cấp, thưởng, tăng ca, khấu trừ
    """
    __tablename__ = "payroll_detail"

    detail_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    payroll_id = Column(Integer, ForeignKey("payroll.payroll_id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(Integer, ForeignKey("salary_component.component_id"), nullable=False, index=True)
    
    amount = Column(Numeric(15, 2), nullable=False)
    note = Column(Text, nullable=True)

    # Relationships
    payroll = relationship("Payroll", back_populates="details")
    component = relationship("SalaryComponent", back_populates="payroll_details")
