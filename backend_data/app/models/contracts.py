from sqlalchemy import Integer, String, Date, Numeric, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date
from app.core.database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    
    contract_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "Full-time", "Part-time"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    base_salary: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    employee = relationship("Employee")
