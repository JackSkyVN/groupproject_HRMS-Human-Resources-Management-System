from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
import os
import glob

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
    role_id: Optional[int] = None  # Sẽ tự động gán dựa trên level của người tạo
    salary: Optional[int] = None  # Sẽ tự động tính dựa trên position
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
    """Retrieve personal profile details."""
    return get_employee_with_details(db, current_employee.employee_id)

@router.get("")
async def list_employees(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """List employees with visibility tiered by role level."""
    skip: int = 0
    limit: int = 100
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    # Sử dụng db.query đơn giản để tận dụng các relationship đã cấu hình
    query = db.query(Employee)

    if level > 3:
        # Nhân viên thường chỉ thấy bản thân
        query = query.filter(Employee.employee_id == current_employee.employee_id)

    results = query.offset(skip).limit(limit).all()
    
    output = []
    for emp in results:
        # Lấy thông tin từ relationship tự động
        role = emp.role
        dept = emp.department
        pos = emp.position
        
        output.append({
            "employee_id": emp.employee_id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "email": emp.email,
            "username": emp.username,
            "phone": emp.phone,
            "role_name": role.role_name if role else "N/A",
            "role_level": role.role_level if role else 4,
            "department_name": dept.department_name if dept else "N/A",
            "position_name": pos.position_name if pos else "N/A",
            "status": emp.status,
            "hire_date": emp.hire_date
        })
    return output

@router.post("")
async def create_employee(
    data: dict,  # Chấp nhận raw dict - KHÔNG VALIDATION!
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Simple employee creation - no validation."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Lấy role của user hiện tại
    current_role = db.get(Role, current_employee.role_id)
    current_level = current_role.role_level
    
    # Tự động gán role dựa trên Position và Department
    position_id = int(data['position_id'])
    department_id = int(data['department_id'])
    pos = db.get(Position, position_id)
    pos_name = pos.position_name if pos else ""
    
    # 1. Xác định cấp độ mục tiêu (Mặc định là Level 4 - Staff)
    target_level = 4
    
    # Logic đặc biệt cho phòng HR
    if department_id == 3:  # HR Department
        # Chức vụ cấp độ 2 (HR Manager)
        if pos_name in ["Acting Deputy Director", "Deputy Director of Department"]:
            target_level = 2
        # Chức vụ cấp độ 3 (HR Staff)
        elif pos_name.lower().startswith("hr manages"):
            target_level = 3
            
    # 2. Lấy role mục tiêu
    target_role = db.query(Role).filter(Role.role_level == target_level).first()
    if not target_role:
        # Mặc định là Staff
        target_role = db.query(Role).filter(Role.role_level == 4).first()
        
    # 3. Kiểm tra quyền: Người tạo phải có level CAO HƠN đối tượng (Level 1 < Level 4)
    if current_level >= target_level and current_level != 1:
        # Chỉ Admin (Level 1) mới có toàn quyền
        # Những người khác chỉ có thể tạo các role thấp hơn mình (số level lớn hơn)
        raise HTTPException(
            status_code=403, 
            detail=f"You (Level {current_level}) do not have permission to create a Level {target_level} employee."
        )
    
    # Tự động tính salary nếu không cung cấp
    # Fix: Xử lý salary đúng - chỉ dùng mặc định nếu thực sự không cung cấp
    salary = data.get('salary')
    
    if salary is None or salary == '':
        salary = 2000
    else:
        try:
            # Xóa ký tự không phải số
            if isinstance(salary, str):
                # Xóa $, dấu phẩy, /month, khoảng trắng, v.v.
                import re
                salary_clean = re.sub(r'[^\d]', '', salary)
                salary = int(salary_clean) if salary_clean else 2000
            else:
                salary = int(salary)
        except (ValueError, TypeError) as e:
            salary = 2000
    
    # Kiểm tra username duy nhất (email có thể trùng)
    if db.query(Employee).filter(Employee.username == data['username']).first():
        raise HTTPException(status_code=400, detail=f"Username '{data['username']}' already exists")
    
    # Tạo employee code
    import random
    emp_code = f"FIN-{random.randint(1000, 9999)}"
    
    # Tạo employee
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
    
    return {"message": "Success", "employee_code": new_emp.employee_code}

@router.get("/{id}")
async def get_employee(
    id: int,
    current_employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """Get detailed information for a specific employee."""
    emp_details = get_employee_with_details(db, id)
    if not emp_details:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Kiểm tra quyền xem chi tiết
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
    """Update employee details (Tiered CRUD)."""
    target_emp = db.get(Employee, id)
    if not target_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    current_role = db.get(Role, current_employee.role_id)
    target_role = db.get(Role, target_emp.role_id)
    
    # Logic quyền Admin: Cấp độ cao hơn có thể quản lý BẤT KỲ cấp độ thấp hơn
    is_authorized = False
    if current_role.role_level < target_role.role_level:
        # L1 quản lý L2,L3,L4 | L2 quản lý L3,L4 | L3 quản lý L4
        if current_role.role_level == 3:
            # L3 vẫn bị giới hạn theo department
            if target_emp.department_id == current_employee.department_id:
                is_authorized = True
        else:
            is_authorized = True
    elif id == current_employee.employee_id:
        is_authorized = True  # Có thể cập nhật bản thân
        
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
    """Delete employee record (Tiered CRUD)."""
    target_emp = db.get(Employee, id)
    if not target_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if id == current_employee.employee_id:
        raise HTTPException(status_code=400, detail="Cannot delete self")

    current_role = db.get(Role, current_employee.role_id)
    target_role = db.get(Role, target_emp.role_id)
    
    # Kiểm tra quyền chung
    allowed = False
    if current_role.role_level < target_role.role_level:
        if current_role.role_level == 3:
            if target_emp.department_id == current_employee.department_id:
                allowed = True
        else:
            allowed = True
            
    if not allowed:
        raise HTTPException(status_code=403, detail="Permission denied: You can only delete subordinates.")

    # ===== PRIVACY COMPLIANCE: Delete all personal files =====
    employee_id = target_emp.employee_id
    
    # 1. Delete snapshots (check-in/out photos)
    snapshot_dir = "static/snapshots"
    if os.path.exists(snapshot_dir):
        snapshot_pattern = os.path.join(snapshot_dir, f"{employee_id}_*.jpg")
        for snapshot_file in glob.glob(snapshot_pattern):
            try:
                os.remove(snapshot_file)
                print(f"[PRIVACY] Deleted snapshot: {snapshot_file}")
            except Exception as e:
                print(f"[ERROR] Failed to delete snapshot {snapshot_file}: {e}")
    
    # 2. Delete face embeddings
    face_embeddings_dir = "face_embeddings"
    if os.path.exists(face_embeddings_dir):
        face_file = os.path.join(face_embeddings_dir, f"{employee_id}.pkl")
        if os.path.exists(face_file):
            try:
                os.remove(face_file)
                print(f"[PRIVACY] Deleted face embedding: {face_file}")
            except Exception as e:
                print(f"[ERROR] Failed to delete face embedding {face_file}: {e}")

    # Xóa vĩnh viễn khỏi database
    db.delete(target_emp)
    db.commit()
    return {"ok": True, "message": "Employee and all personal data deleted permanently"}

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
    return [{"position_id": p.position_id, "position_name": p.position_name, "department_id": p.department_id} for p in positions]
