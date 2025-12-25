from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Employee(Base):
    """
    Bảng Employees - Nhân viên
    Bao gồm thông tin cá nhân, công việc, và authentication
    """
    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_code = Column(String(20), unique=True, nullable=False, index=True)
    
    # Thông tin cá nhân
    full_name = Column(String(100), nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    
    # Thông tin công việc
    department_id = Column(Integer, ForeignKey("departments.department_id"), nullable=True, index=True)
    position_id = Column(Integer, ForeignKey("positions.position_id"), nullable=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False, index=True)
    manager_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True, index=True)
    
    hire_date = Column(Date, nullable=False)
    salary = Column(Integer, nullable=True, index=True)  # Monthly salary in USD
    status = Column(String(20), default="active", nullable=False, index=True)  # active, inactive, terminated
    
    # Authentication
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Tracking
    created_by = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    position = relationship("Position", back_populates="employees", foreign_keys=[position_id])
    role = relationship("Role", back_populates="employees", foreign_keys=[role_id])
    
    # Self-referential relationships
    manager = relationship("Employee", remote_side=[employee_id], foreign_keys=[manager_id], backref="subordinates")
    creator = relationship("Employee", remote_side=[employee_id], foreign_keys=[created_by], post_update=True)
    
    # Related data
    attendance_records = relationship("Attendance", back_populates="employee", foreign_keys="[Attendance.employee_id]", cascade="all, delete-orphan")
    work_schedules = relationship("WorkSchedule", back_populates="employee", foreign_keys="[WorkSchedule.employee_id]", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", foreign_keys="[LeaveRequest.employee_id]", cascade="all, delete-orphan")
    leave_balances = relationship("LeaveBalance", back_populates="employee", foreign_keys="[LeaveBalance.employee_id]", cascade="all, delete-orphan")
    payroll_records = relationship("Payroll", back_populates="employee", foreign_keys="[Payroll.employee_id]", cascade="all, delete-orphan")
    sent_notifications = relationship("Notification", back_populates="sender", foreign_keys="[Notification.sender_id]")
    received_notifications = relationship("NotificationRecipient", back_populates="employee", foreign_keys="[NotificationRecipient.employee_id]", cascade="all, delete-orphan")
