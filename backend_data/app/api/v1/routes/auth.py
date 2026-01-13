from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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
    username: str  # Đổi từ email sang username
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: int
    employee_code: str
    full_name: str
    role_name: str
    role_level: int
    department_id: int | None
    position_id: int | None
    position_name: str | None


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
    date_of_birth: str | None
    hire_date: str | None
    salary: int | None
    phone: str | None
    profile_picture: str | None


class LogoutResponse(BaseModel):
    message: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ==================== AUTH ENDPOINTS ====================

@router.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login with username and password and return JWT token."""
   # Tìm employee theo username
    employee = db.query(Employee).filter(
        Employee.username == data.username,
        Employee.status == "active"
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Xác minh password
    if not pwd_context.verify(data.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Lấy thông tin role
    role = db.query(Role).filter(Role.role_id == employee.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Employee role not found"
        )
    
    # Lấy tên position
    position_name = None
    if employee.position:
        position_name = employee.position.position_name
    
    # Tạo JWT token
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
        position_id=employee.position_id,
        position_name=position_name
    )


@router.post("/auth/logout", response_model=LogoutResponse)
def logout(current_employee: Employee = Depends(get_current_employee)):
    """Logout endpoint."""
    return LogoutResponse(message="Logged out successfully")


@router.get("/auth/me", response_model=EmployeeProfileResponse)
def get_current_employee_profile(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Get current employee profile details."""
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
        status=current_employee.status,
        date_of_birth=current_employee.date_of_birth.isoformat() if current_employee.date_of_birth else None,
        hire_date=current_employee.hire_date.isoformat() if current_employee.hire_date else None,
        salary=current_employee.salary,
        phone=current_employee.phone,
        profile_picture=current_employee.profile_picture
    )


class UpdateProfileRequest(BaseModel):
    full_name: str
    email: str
    date_of_birth: str | None = None
    phone: str | None = None


@router.put("/auth/me")
def update_current_employee_profile(
    data: UpdateProfileRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Update current employee profile."""
    # Validate định dạng email
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Cập nhật các trường
    current_employee.full_name = data.full_name
    current_employee.email = data.email
    if data.date_of_birth:
        try:
            from datetime import date
            current_employee.date_of_birth = date.fromisoformat(data.date_of_birth)
        except ValueError:
            pass  # Hoặc raise error
    
    if data.phone:
        current_employee.phone = data.phone
    
    db.commit()
    db.refresh(current_employee)
    
    return {
        "message": "Profile updated successfully", 
        "full_name": current_employee.full_name, 
        "email": current_employee.email,
        "date_of_birth": current_employee.date_of_birth.isoformat() if current_employee.date_of_birth else None,
        "phone": current_employee.phone
    }


@router.post("/auth/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Upload and update profile picture."""
    import os
    import shutil
    import time

    # Validate loại file
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Tạo tên file
    ext = os.path.splitext(file.filename)[1]
    filename = f"profile_{current_employee.employee_id}_{int(time.time())}{ext}"
    filepath = os.path.join("static/profiles", filename)

    # Lưu file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Cập nhật DB
    current_employee.profile_picture = f"/static/profiles/{filename}"
    db.commit()
    db.refresh(current_employee)

    return {"ok": True, "profile_picture": current_employee.profile_picture}


@router.post("/auth/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Change password for current employee."""
    # Xác minh password cũ
    if not pwd_context.verify(data.old_password, current_employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    # Validate password mạnh
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
    
    # Cập nhật password
    current_employee.password_hash = pwd_context.hash(data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.get("/auth/verify")
def verify_token(current_employee: Employee = Depends(get_current_employee)):
    """Verify JWT token validity."""
    return {
        "valid": True,
        "employee_id": current_employee.employee_id,
        "employee_code": current_employee.employee_code,
        "full_name": current_employee.full_name
    }
