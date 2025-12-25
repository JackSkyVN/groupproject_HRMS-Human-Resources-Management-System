"""
Authentication Routes - Using Employee model (không dùng User/RBAC cũ)
Login bằng username/password, trả về JWT token với role info
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import get_db
from app.models.employees import Employee
from app.models.roles import Role
from app.auth.deps import get_current_employee

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==================== SCHEMAS ====================

class LoginRequest(BaseModel):
    username: str  # Changed from email to username
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: int
    employee_code: str
    full_name: str
    role_name: str
    role_level: int
    department_id: int
    position_id: int


class EmployeeProfileResponse(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    email: str
    username: str
    role_name: str
    role_level: int
    department_name: str | None
    position_name: str | None
    status: str


class LogoutResponse(BaseModel):
    message: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ==================== AUTH ENDPOINTS ====================

@router.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Đăng nhập bằng username + password
    Trả về JWT token với thông tin employee và role
    """
   # Find employee by username
    employee = db.query(Employee).filter(
        Employee.username == data.username,
        Employee.status == "active"
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not pwd_context.verify(data.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Get role info
    role = db.query(Role).filter(Role.role_id == employee.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Employee role not found"
        )
    
    # Create JWT token
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    token_data = {
        "sub": str(employee.employee_id),
        "employee_code": employee.employee_code,
        "role_id": role.role_id,
        "role_level": role.role_level,
        "exp": expire
    }
    access_token = jwt.encode(token_data, settings.secret_key, algorithm=settings.algorithm)
    
    return TokenResponse(
        access_token=access_token,
        employee_id=employee.employee_id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        role_name=role.role_name,
        role_level=role.role_level,
        department_id=employee.department_id,
        position_id=employee.position_id
    )


@router.post("/auth/logout", response_model=LogoutResponse)
def logout(current_employee: Employee = Depends(get_current_employee)):
    """
    Logout endpoint - Client phải tự xóa token
    Endpoint này chỉ để confirm logout thành công
    """
    return LogoutResponse(message="Logged out successfully")


@router.get("/auth/me", response_model=EmployeeProfileResponse)
def get_current_employee_profile(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin profile của employee hiện tại
    Bao gồm role, department, position
    """
    role = db.query(Role).filter(Role.role_id == current_employee.role_id).first()
    
    return EmployeeProfileResponse(
        employee_id=current_employee.employee_id,
        employee_code=current_employee.employee_code,
        full_name=current_employee.full_name,
        email=current_employee.email,
        username=current_employee.username,
        role_name=role.role_name if role else "unknown",
        role_level=role.role_level if role else 999,
        department_name=current_employee.department.department_name if current_employee.department else None,
        position_name=current_employee.position.position_name if current_employee.position else None,
        status=current_employee.status
    )


class UpdateProfileRequest(BaseModel):
    full_name: str
    email: str


@router.put("/auth/me")
def update_current_employee_profile(
    data: UpdateProfileRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin profile của employee hiện tại
    Chỉ cho phép update: full_name, email
    Không cho phép update: username, employee_code, role, department, position
    """
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Update fields
    current_employee.full_name = data.full_name
    current_employee.email = data.email
    db.commit()
    db.refresh(current_employee)
    
    return {"message": "Profile updated successfully", "full_name": current_employee.full_name, "email": current_employee.email}


@router.post("/auth/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Đổi mật khẩu cho employee hiện tại
    Yêu cầu mật khẩu cũ để xác nhận
    Password mới phải đáp ứng điều kiện: 8+ ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt
    """
    # Verify old password
    if not pwd_context.verify(data.old_password, current_employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    # Strong password validation
    import re
    password = data.new_password
    
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    if not re.search(r'[A-Z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter"
        )
    
    if not re.search(r'[a-z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter"
        )
    
    if not re.search(r'[0-9]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number"
        )
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character (!@#$%^&*)"
        )
    
    # Update password
    current_employee.password_hash = pwd_context.hash(data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.get("/auth/verify")
def verify_token(current_employee: Employee = Depends(get_current_employee)):
    """
    Verify JWT token validity
    Returns employee basic info if token is valid
    """
    return {
        "valid": True,
        "employee_id": current_employee.employee_id,
        "employee_code": current_employee.employee_code,
        "full_name": current_employee.full_name
    }
