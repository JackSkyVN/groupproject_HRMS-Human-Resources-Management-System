from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.db.base import Base


# Enums
class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    HR_MANAGER = "hr_manager"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class PermissionEnum(str, enum.Enum):
    VIEW = "view"
    EDIT = "edit"
    DELETE = "delete"
    EXPORT = "export"
    ADMIN = "admin"


class AttendanceStatusEnum(str, enum.Enum):
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    PENDING = "pending"
    REJECTED = "rejected"


# User Model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    attendance_logs = relationship("AttendanceLog", back_populates="user")
    access_logs = relationship("AccessLog", back_populates="user")


# Role Model
class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    users = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")


# User-Role Junction Table
class UserRole(Base):
    __tablename__ = "user_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")


# Permission Model
class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    resource = Column(String, nullable=False)  # e.g., "employees", "attendance", "reports"
    action = Column(String, nullable=False)  # e.g., "view", "edit", "export"
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    roles = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


# Role-Permission Junction Table
class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")


# Employee Model (extends User)
class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    employee_code = Column(String, unique=True, index=True, nullable=False)
    department = Column(String)
    position = Column(String)
    hire_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    attendance_logs = relationship("AttendanceLog", back_populates="employee")
    snapshots = relationship("AttendanceSnapshot", back_populates="employee")


# Attendance Log Model
class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    check_in_time = Column(DateTime(timezone=True), nullable=False, index=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(AttendanceStatusEnum), default=AttendanceStatusEnum.PENDING, index=True)
    location = Column(String)
    device_id = Column(String)
    verified = Column(Boolean, default=False)
    verification_score = Column(Float, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="attendance_logs")
    employee = relationship("Employee", back_populates="attendance_logs")
    snapshots = relationship("AttendanceSnapshot", back_populates="attendance_log")


# Attendance Snapshot Model (Photos captured at check-in)
class AttendanceSnapshot(Base):
    __tablename__ = "attendance_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_log_id = Column(Integer, ForeignKey("attendance_logs.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    image_path = Column(String, nullable=False)
    image_hash = Column(String, index=True)  # For duplicate detection
    capture_time = Column(DateTime(timezone=True), nullable=False, index=True)
    device_id = Column(String)
    verified = Column(Boolean, default=False)
    verification_score = Column(Float, nullable=True)
    metadata = Column(Text)  # JSON string for additional info
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    attendance_log = relationship("AttendanceLog", back_populates="snapshots")
    employee = relationship("Employee", back_populates="snapshots")


# Access Log Model
class AccessLog(Base):
    __tablename__ = "access_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    access_point = Column(String, nullable=False, index=True)
    access_time = Column(DateTime(timezone=True), nullable=False, index=True)
    granted = Column(Boolean, default=False, index=True)
    reason = Column(String)
    device_id = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="access_logs")


# Backup Record Model
class BackupRecord(Base):
    __tablename__ = "backup_records"
    
    id = Column(Integer, primary_key=True, index=True)
    backup_file_path = Column(String, nullable=False)
    backup_type = Column(String, nullable=False)  # "full", "incremental"
    backup_size_mb = Column(Float, nullable=False)
    status = Column(String, default="completed")  # "completed", "failed", "in_progress"
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

