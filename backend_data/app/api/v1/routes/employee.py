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
from app.auth.deps import get_current_employee, require_role_level, require_permission

router = APIRouter()

# ==================== SCHEMAS ====================

class DepartmentOut(BaseModel):
    department_id: int
    department_name: str
    department_code: str
    
    class Config:
        from_attributes = True

class RoleOut(BaseModel):
    role_id: int
    role_name: str
    role_level: int
    
    class Config:
        from_attributes = True

class PositionOut(BaseModel):
    position_id: int
    position_name: str
    
    class Config:
        from_attributes = True

class EmployeeBase(BaseModel):
    employee_code: Optional[str] = None
    full_name: str
    email: EmailStr
    username: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    hire_date: date
    department_id: Optional[int] = None
    position_id: Optional[int] = None
    role_id: Optional[int] = None  # Will be auto-assigned based on creator's level
    salary: Optional[int] = None  # Will be auto-calculated based on position
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
        "employee_id": emp.employee_id,
        "employee_code": emp.employee_code,
        "full_name": emp.full_name,
        "email": emp.email,
        "username": emp.username,
        "phone": emp.phone,
        "department_id": emp.department_id,
        "position_id": emp.position_id,
        "role_id": emp.role_id,
        "role_name": role.role_name,
        "role_level": role.role_level,
        "department_name": dept.department_name if dept else "N/A",
        "position_name": pos.position_name if pos else "N/A",
        "status": emp.status,
        "hire_date": emp.hire_date,
        "salary": emp.salary
    }

# ==================== ROUTES ====================

@router.get("/me", response_model=EmployeeOut)
async def get_my_profile(
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Lấy thông tin profile cá nhân"""
    return get_employee_with_details(db, current_employee.employee_id)

@router.get("")
async def list_employees(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    skip: int = 0
    limit: int = 100
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    stmt = select(Employee, Role, Department, Position).\
        join(Role, Employee.role_id == Role.role_id).\
        outerjoin(Department, Employee.department_id == Department.department_id).\
        outerjoin(Position, Employee.position_id == Position.position_id)

    if level == 1 or level == 2:
        pass
    elif level == 3:
        stmt = stmt.where(Employee.department_id == current_employee.department_id)
    else:
        stmt = stmt.where(Employee.employee_id == current_employee.employee_id)

    results = db.execute(stmt.offset(skip).limit(limit)).all()
    
    output = []
    for emp, role, dept, pos in results:
        output.append({
            "employee_id": emp.employee_id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "email": emp.email,
            "username": emp.username,
            "phone": emp.phone,
            "role_name": role.role_name,
            "role_level": role.role_level,
            "department_name": dept.department_name if dept else "N/A",
            "position_name": pos.position_name if pos else "N/A",
            "status": emp.status,
            "hire_date": emp.hire_date
        })
    return output

@router.post("")
async def create_employee(
    data: dict,  # Accept raw dict - NO VALIDATION!
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Simple employee creation - no validation"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    print(f"🔍 RAW DATA RECEIVED: {data}")
    
    # Get current user's role
    current_role = db.get(Role, current_employee.role_id)
    current_level = current_role.role_level
    
    # Auto-assign role based on creator level
    # Restricted Creation Logic (Reverted Part 4)
    if current_level == 1:  # Admin only creates Level 2
        target_role = db.query(Role).filter(Role.role_level == 2).first()
    elif current_level == 2:  # HR Manager creates L3
        target_role = db.query(Role).filter(Role.role_level == 3).first()
    elif current_level == 3:  # HR Dept creates L4
        target_role = db.query(Role).filter(Role.role_level == 4).first()
    else:
        raise HTTPException(status_code=403, detail="Cannot create employees")
    
    # Auto-calculate salary if not provided
    salary = data.get('salary') or 2000
    
    # Check username uniqueness (email can be duplicate)
    if db.query(Employee).filter(Employee.username == data['username']).first():
        raise HTTPException(status_code=400, detail=f"Username '{data['username']}' already exists")
    
    # Generate employee code
    import random
    emp_code = f"FIN-{random.randint(1000, 9999)}"
    
    # Create employee
    new_emp = Employee(
        employee_code=emp_code,
        full_name=data['full_name'],
        username=data['username'],
        email=data['email'],
        phone=data.get('phone'),
        hire_date=data.get('hire_date', '2025-12-24'),
        department_id=int(data['department_id']),
        position_id=int(data['position_id']),
        role_id=target_role.role_id,
        salary=int(salary),
        password_hash=pwd_context.hash(data['password']),
        created_by=current_employee.employee_id
    )
    
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    
    print(f"✅ EMPLOYEE CREATED: {new_emp.employee_code}")
    
    return {"message": "Success", "employee_code": new_emp.employee_code}

@router.get("/{id}")
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

@router.put("/{id}")
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
    
    # Universal Admin Authority Logic: Higher level can manage ANY lower level
    is_authorized = False
    if current_role.role_level < target_role.role_level:
        # L1 manage L2,L3,L4 | L2 manage L3,L4 | L3 manage L4
        if current_role.role_level == 3:
            # L3 still restricted to department
            if target_emp.department_id == current_employee.department_id:
                is_authorized = True
        else:
            is_authorized = True
    elif id == current_employee.employee_id:
        is_authorized = True # Can update self
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Permission denied: You can only manage subordinates.")

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
    
    # Universal Permission Check
    allowed = False
    if current_role.role_level < target_role.role_level:
        if current_role.role_level == 3:
            if target_emp.department_id == current_employee.department_id:
                allowed = True
        else:
            allowed = True
            
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: You can only delete subordinates.")

    # Hard Delete (Reverted Part 3)
    db.delete(target_emp)
    db.commit()
    return {"ok": True, "message": "Employee deleted permanently"}

# ==================== METADATA ROUTES ====================

@router.get("/departments")
async def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    return [{"department_id": d.department_id, "department_name": d.department_name} for d in depts]

@router.get("/roles")
async def list_roles(db: Session = Depends(get_db)):
    roles = db.query(Role).all()
    return [{"role_id": r.role_id, "role_name": r.role_name, "role_level": r.role_level} for r in roles]

@router.get("/positions")
async def list_positions(db: Session = Depends(get_db)):
    positions = db.query(Position).all()
    return [{"position_id": p.position_id, "position_name": p.position_name} for p in positions]
