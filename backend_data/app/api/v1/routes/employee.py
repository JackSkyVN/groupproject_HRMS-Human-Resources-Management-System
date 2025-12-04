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

# --- Pydantic Models ---

class EmployeeBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None # Assuming we might add name to User or Employee later, for now using email as proxy or just storing it
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    important_employee: bool = False

class EmployeeCreate(EmployeeBase):
    password: str = Field(min_length=6)

class EmployeeUpdate(BaseModel):
    email: Optional[EmailStr] = None
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
    department_name: Optional[str] = None
    position_name: Optional[str] = None
    phone: Optional[str] = None
    important_employee: bool
    
    class Config:
        from_attributes = True

# --- Routes ---

@router.get("/employees", response_model=list[EmployeeOut], dependencies=[Depends(require_permission("employee.view"))])
def list_employees(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    department_id: Optional[int] = None
):
    # Cache key
    cache_key = get_cache_key("employees", f"list_{skip}_{limit}_{department_id}")
    cached = cache_get(cache_key)
    if cached:
        return cached

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
            "department_name": dept.name if dept else None,
            "position_name": pos.name if pos else None,
            "phone": emp.phone,
            "important_employee": emp.important_employee
        })
    
    cache_set(cache_key, employees, expire=60) # Cache for 1 minute
    return employees

@router.post("/employees", response_model=EmployeeOut, dependencies=[Depends(require_permission("employee.create"))])
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    # 1. Create User
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Check if user exists
    existing_user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = pwd_context.hash(payload.password)
    new_user = User(email=payload.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.flush() # Get ID

    # 2. Create Employee Linked to User
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
    
    # Invalidate list cache
    cache_delete_pattern("hrms:employees:list*")

    return {
        "id": new_emp.id,
        "user_id": new_user.id,
        "email": new_user.email,
        "department_name": None, # Simplified for response
        "position_name": None,
        "phone": new_emp.phone,
        "important_employee": new_emp.important_employee
    }

@router.get("/employees/{employee_id}", response_model=EmployeeOut, dependencies=[Depends(require_permission("employee.view"))])
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    stmt = select(Employee, User, Department, Position).\
        join(User, Employee.user_id == User.id).\
        outerjoin(Department, Employee.department_id == Department.id).\
        outerjoin(Position, Employee.position_id == Position.id).\
        where(Employee.id == employee_id)
    
    result = db.execute(stmt).first()
    if not result:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp, user, dept, pos = result
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
    
    # Also delete the user? Usually yes for consistency, or just soft delete.
    # Here we delete the user which cascades to employee because of ForeignKey constraint if configured, 
    # but let's check the model. Employee has ForeignKey("users.id", ondelete="CASCADE").
    # So deleting User should delete Employee.
    
    user = db.get(User, emp.user_id)
    if user:
        db.delete(user) # This should cascade delete the employee
    else:
        db.delete(emp) # Fallback if user missing
        
    db.commit()
    cache_delete_pattern("hrms:employees:list*")
    return {"ok": True}
