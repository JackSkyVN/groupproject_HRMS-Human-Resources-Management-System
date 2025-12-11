from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.models.rbac import User
from app.models.org import Employee, Department, Position
from app.auth.deps import require_permission
from app.core.cache import cache_get, cache_set, get_cache_key, cache_delete_pattern

router = APIRouter()


#                                            Model Pydantic

class EmployeeBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    important_employee: bool = False

class EmployeeCreate(EmployeeBase):
    password: str = Field(min_length=6)

class EmployeeUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    important_employee: Optional[bool] = None

class EmployeeOut(BaseModel):
    id: int
    user_id: int
    email: str
    full_name: Optional[str] = None
    department_name: Optional[str] = None
    position_name: Optional[str] = None
    phone: Optional[str] = None
    important_employee: bool
    
    class Config:
        from_attributes = True


#                                Route 

@router.get("/employees/me", response_model=EmployeeOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employee.view"))
):
    stmt = select(Employee, User, Department, Position).\
        join(User, Employee.user_id == User.id).\
        outerjoin(Department, Employee.department_id == Department.id).\
        outerjoin(Position, Employee.position_id == Position.id).\
        where(User.id == current_user.id)
    
    result = db.execute(stmt).first()
    if not result:
        raise HTTPException(status_code=404, detail="Employee profile not found")
        
    emp, user, dept, pos = result
    
    return {
        "id": emp.id,
        "user_id": user.id,
        "email": user.email,
        "full_name": emp.full_name,
        "department_name": dept.name if dept else None,
        "position_name": pos.name if pos else None,
        "phone": emp.phone,
        "important_employee": emp.important_employee
    } 

@router.get("/employees", response_model=list[EmployeeOut], dependencies=[])
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employee.view")),
    skip: int = 0,
    limit: int = 1000,
    department_id: Optional[int] = None
):
    # Kiểm tra quyền Admin
    from app.models.rbac import Role, UserRole
    is_admin = False
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role:
        if db.query(UserRole).filter(UserRole.user_id == current_user.id, UserRole.role_id == admin_role.id).first():
            is_admin = True
            
    

    
    stmt = select(Employee, User, Department, Position).\
        join(User, Employee.user_id == User.id).\
        outerjoin(Department, Employee.department_id == Department.id).\
        outerjoin(Position, Employee.position_id == Position.id)

    if department_id:
        stmt = stmt.where(Employee.department_id == department_id)

    stmt = stmt.offset(skip).limit(limit)
    results = db.execute(stmt).all()

    employees = []
    for emp, user, dept, pos in results:
        employees.append({
            "id": emp.id,
            "user_id": user.id,
            "email": user.email,
            "full_name": emp.full_name,
            "department_name": dept.name if dept else None,
            "position_name": pos.name if pos else None,
            "phone": emp.phone,
            "important_employee": emp.important_employee
        })
    
    return employees


@router.post("/employees", response_model=EmployeeOut, dependencies=[Depends(require_permission("employee.create"))])
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    # 1. Tạo User
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Kiểm tra xem người dùng đã tồn tại
    existing_user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = pwd_context.hash(payload.password)
    new_user = User(email=payload.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.flush() # Lấy ID

    # 2. Tạo Employee liên kết với User
    new_emp = Employee(
        user_id=new_user.id,
        department_id=payload.department_id,
        position_id=payload.position_id,
        date_of_birth=payload.date_of_birth,
        phone=payload.phone,
        important_employee=payload.important_employee
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    
    # Xóa cache danh sách
    cache_delete_pattern("hrms:employees:list*")

    return {
        "id": new_emp.id,
        "user_id": new_user.id,
        "email": new_user.email,
        "department_name": None, 
        "position_name": None,
        "phone": new_emp.phone,
        "important_employee": new_emp.important_employee
    }

@router.get("/employees/{employee_id}", response_model=EmployeeOut, dependencies=[])
def get_employee(
    employee_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("employee.view"))
):
    # Check admin
    from app.models.rbac import Role, UserRole
    is_admin = False
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role:
        if db.query(UserRole).filter(UserRole.user_id == current_user.id, UserRole.role_id == admin_role.id).first():
            is_admin = True

    stmt = select(Employee, User, Department, Position).\
        join(User, Employee.user_id == User.id).\
        outerjoin(Department, Employee.department_id == Department.id).\
        outerjoin(Position, Employee.position_id == Position.id).\
        where(Employee.id == employee_id)
    
    result = db.execute(stmt).first()
    if not result:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp, user, dept, pos = result
    
    # Enforce privacy
    if not is_admin and user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": emp.id,
        "user_id": user.id,
        "email": user.email,
        "department_name": dept.name if dept else None,
        "position_name": pos.name if pos else None,
        "phone": emp.phone,
        "important_employee": emp.important_employee
    }

@router.delete("/employees/{employee_id}", dependencies=[Depends(require_permission("employee.delete"))])
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
  
    
    user = db.get(User, emp.user_id)
    if user:
        db.delete(user) 
    else:
        db.delete(emp)
        
    db.commit()
    cache_delete_pattern("hrms:employees:list*")
    return {"ok": True}
