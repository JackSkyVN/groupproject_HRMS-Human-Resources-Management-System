"""
Authentication Dependencies - Sử dụng Employee model
Cung cấp get_current_employee và role-based authorization
"""
from fastapi import Depends, HTTPException, status, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.employees import Employee
from app.models.roles import Role


def _get_token_from_auth_header(authorization: str | None) -> str:
    """Extract JWT token from Authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )
    
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    if len(parts) == 1:
        return parts[0]
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Authorization header format"
    )


def get_current_employee(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> Employee:
    """
    Get current logged-in employee from JWT token
    Raises 401 if token invalid or employee not found
    """
    token = _get_token_from_auth_header(authorization)
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        employee_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    employee = db.query(Employee).filter(
        Employee.employee_id == employee_id,
        Employee.status == "active"
    ).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Employee not found or inactive"
        )
    
    return employee


def require_role_level(max_level: int):
    """
    Dependency để yêu cầu role level <= max_level
    Role levels: admin=1, hr_general=2, hr_department=3, staff=4
    
    Example:
        require_role_level(2)  # Only admin and hr_general can access
        require_role_level(3)  # Admin, hr_general, hr_department can access
    """
    def wrapper(
        employee: Employee = Depends(get_current_employee),
        db: Session = Depends(get_db)
    ):
        role = db.query(Role).filter(Role.role_id == employee.role_id).first()
        
        if not role or role.role_level > max_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role level <= {max_level}"
            )
        
        return employee
    
    return wrapper


def require_admin():
    """Only admin (level 1) can access"""
    return require_role_level(1)


def require_hr():
    """HR and above (admin, hr_general, hr_department) can access"""
    return require_role_level(3)


# ==================== BACKWARD COMPATIBILITY ====================
# For old routes still using get_current_user and require_permission

# Alias for old code compatibility
get_current_user = get_current_employee


def require_permission(code: str):
    """
    Backward compatibility function
    Maps old permission codes to role levels
    """
    # Map permission codes to role levels
    permission_to_level = {
        "employee.view": 3,  # HR and above
        "employee.create": 2,  # HR General and above
        "employee.update": 2,
        "employee.delete": 1,  # Admin only
        "attendance.view": 3,
        "attendance.manage": 2,
        "leave.view": 3,
        "leave.approve": 2,
        "payroll.view": 2,
        "payroll.manage": 1,
        "announcement.create": 2,
        "performance.view": 3,
        "performance.manage": 2,
    }
    
    level = permission_to_level.get(code, 3)  # Default to HR level
    return require_role_level(level)

