from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Date, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    # Added fields from schema
    manager_id = Column(Integer, nullable=True)
    location = Column(String(255), nullable=True)
    
    parent_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)
    level = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent = relationship("Department", remote_side=[id], backref="children")


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    # Added fields from schema
    base_salary_range = Column(String(255), nullable=True) # Storing as string for range e.g. "1000-2000" or Decimal if single value needed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    # user_id is already indexed. ondelete=CASCADE is good.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    full_name = Column(String(255), nullable=False, index=True) # Added index for search
    email = Column(String(100), nullable=True, unique=True, index=True) # Added email, unique and indexed
    
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=True, index=True)

    date_of_birth = Column(Date, nullable=True)
    phone = Column(String(255), nullable=True)
    
    # Added fields from schema
    hire_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=True, index=True) # Indexed for filtering active/inactive
    
    important_employee = Column(Boolean, nullable=False, server_default="false", index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    department = relationship("Department")
    position = relationship("Position")
