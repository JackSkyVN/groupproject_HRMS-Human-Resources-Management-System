from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.models.employees import Employee
from app.models.roles import Role
from app.models.departments import Department
from app.models.positions import Position
from app.auth.deps import get_current_employee, require_role_level

router = APIRouter()

# ==================== SCHEMAS ====================

class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    email: EmailStr
    username: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    hire_date: date
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    role_id: int
    manager_id: Optional[int] = None

class EmployeeCreate(EmployeeBase):
    password: str = Field(min_length=6)

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    role_id: Optional[int] = None
    manager_id: Optional[int] = None
    status: Optional[str] = None

class EmployeeOut(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    email: str
    username: str
    phone: Optional[str] = None
    department_name: Optional[str] = None
    position_name: Optional[str] = None
    role_name: str
    role_level: int
    status: str
    hire_date: date
    
    class Config:
        from_attributes = True

# ==================== HELPERS ====================

def get_employee_with_details(db: Session, employee_id: int):
    stmt = select(Employee, Role, Department, Position).\
        join(Role, Employee.role_id == Role.role_id).\
        outerjoin(Department, Employee.department_id == Department.department_id).\
        outerjoin(Position, Employee.position_id == Position.position_id).\
        where(Employee.employee_id == employee_id)
    
    result = db.execute(stmt).first()
    if not result:
        return None
        
    emp, role, dept, pos = result
    return {
        **emp.__dict__,
        "role_name": role.role_name,
        "role_level": role.role_level,
        "department_name": dept.department_name if dept else None,
        "position_name": pos.position_name if pos else None
    }

# ==================== ROUTES ====================

@router.get("/me", response_model=EmployeeOut)
async def get_my_profile(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lấy thông tin profile cá nhân"""
    return get_employee_with_details(db, current_employee.employee_id)

@router.get("", response_model=list[EmployeeOut])
async def list_employees(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    skip: int = 0,
    limit: int = 100
):
    """
    Hiển thị danh sách nhân viên theo quyền:
    - Admin (L1): Xem tất cả.
    - HR Chung (L2): Xem tất cả.
    - HR Phòng ban (L3): Xem nhân viên trong phòng.
    - Staff (L4): Chỉ xem chính mình.
    """
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    stmt = select(Employee, Role, Department, Position).\
        join(Role, Employee.role_id == Role.role_id).\
        outerjoin(Department, Employee.department_id == Department.department_id).\
        outerjoin(Position, Employee.position_id == Position.position_id)

    if level == 1 or level == 2:
        # Admin / HR Chung see all
        pass
    elif level == 3:
        # HR Dept see their own dept
        stmt = stmt.where(Employee.department_id == current_employee.department_id)
    else:
        # Staff only see themselves
        stmt = stmt.where(Employee.employee_id == current_employee.employee_id)

    results = db.execute(stmt.offset(skip).limit(limit)).all()
    
    output = []
    for emp, role, dept, pos in results:
        output.append({
            **emp.__dict__,
            "role_name": role.role_name,
            "role_level": role.role_level,
            "department_name": dept.department_name if dept else None,
            "position_name": pos.position_name if pos else None
        })
    return output

@router.post("", response_model=EmployeeOut)
async def create_employee(
    payload: EmployeeCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    Tạo nhân viên theo phân cấp Tiered CRUD:
    - Admin (L1): CRUD HR Chung (L2).
    - HR Chung (L2): CRUD Giám đốc + HR Phòng ban (L3).
    - HR Phòng ban (L3): CRUD Staff (L4) trong phòng.
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    current_role = db.get(Role, current_employee.role_id)
    current_level = current_role.role_level
    
    target_role = db.get(Role, payload.role_id)
    if not target_role:
        raise HTTPException(status_code=404, detail="Target role not found")
    target_level = target_role.role_level

    # Kiểm tra phân cấp Tiered CRUD
    allowed = False
    if current_level == 1: # Admin
        if target_level == 2: allowed = True # Admin -> HR Chung
        else: raise HTTPException(status_code=403, detail="Admin can only create HR General accounts")
        
    elif current_level == 2: # HR Chung
        if target_level == 3: allowed = True # HR Chung -> HR Dept
        # Ngoài ra HR Chung có thể tạo Giám đốc (nhưng Giám đốc thường là level 2 hoặc 3 tùy vị trí)
        # Theo yêu cầu user: HR Chung CRUD giám đốc + HR phòng ban
        else: raise HTTPException(status_code=403, detail="HR General can only create HR Department accounts")
        
    elif current_level == 3: # HR Dept
        if target_level == 4: # HR Dept -> Staff
            if payload.department_id != current_employee.department_id:
                raise HTTPException(status_code=403, detail="HR Department can only create staff for their own department")
            allowed = True
        else: raise HTTPException(status_code=403, detail="HR Department can only create Staff accounts")
    
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions for tiered CRUD")

    # Check existence
    if db.query(Employee).filter(or_(Employee.username == payload.username, Employee.email == payload.email)).first():
        raise HTTPException(status_code=400, detail="Username or Email already exists")

    new_emp = Employee(
        **payload.dict(exclude={"password"}),
        password_hash=pwd_context.hash(payload.password),
        created_by=current_employee.employee_id
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    
    return get_employee_with_details(db, new_emp.employee_id)

@router.get("/{id}", response_model=EmployeeOut)
async def get_employee(
    id: int,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lấy chi tiết nhân viên"""
    emp_details = get_employee_with_details(db, id)
    if not emp_details:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Permission check for viewing details
    current_role = db.get(Role, current_employee.role_id)
    if current_role.role_level > 3 and current_employee.employee_id != id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    return emp_details

@router.put("/{id}", response_model=EmployeeOut)
async def update_employee_route(
    id: int,
    payload: EmployeeUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Cập nhật nhân viên (Tuân thủ Tiered CRUD)"""
    target_emp = db.get(Employee, id)
    if not target_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    current_role = db.get(Role, current_employee.role_id)
    target_role = db.get(Role, target_emp.role_id)
    
    # Tiered CRUD Logic
    if current_role.role_level == 1 and target_role.role_level == 2: pass
    elif current_role.role_level == 2 and target_role.role_level == 3: pass
    elif current_role.role_level == 3 and target_role.role_level == 4:
        if target_emp.department_id != current_employee.department_id:
            raise HTTPException(status_code=403, detail="Department mismatch")
    elif id == current_employee.employee_id: pass # Can update self
    else:
        raise HTTPException(status_code=403, detail="Tiered CRUD permission denied")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(target_emp, key, value)
        
    db.commit()
    db.refresh(target_emp)
    return get_employee_with_details(db, target_emp.employee_id)

@router.delete("/{id}")
async def delete_employee_route(
    id: int,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Xóa nhân viên (Tuân thủ Tiered CRUD)"""
    target_emp = db.get(Employee, id)
    if not target_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if id == current_employee.employee_id:
        raise HTTPException(status_code=400, detail="Cannot delete self")

    current_role = db.get(Role, current_employee.role_id)
    target_role = db.get(Role, target_emp.role_id)
    
    # Tiered CRUD Logic
    allowed = False
    if current_role.role_level == 1 and target_role.role_level == 2: allowed = True
    elif current_role.role_level == 2 and target_role.role_level == 3: allowed = True
    elif current_role.role_level == 3 and target_role.role_level == 4:
        if target_emp.department_id == current_employee.department_id:
            allowed = True
            
    if not allowed:
        raise HTTPException(status_code=403, detail="Tiered CRUD permission denied")

    db.delete(target_emp)
    db.commit()
    return {"ok": True, "message": "Employee deleted"}
