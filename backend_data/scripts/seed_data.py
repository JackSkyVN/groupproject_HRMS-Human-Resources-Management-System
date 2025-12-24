"""
Seed data cho HRMS Database
Tạo dữ liệu mẫu: roles, departments, positions, leave types, salary components, employees
"""
import sys
import os
from datetime import date, datetime
from passlib.context import CryptContext

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal
from app.models import (
    Role, Department, Position, Employee,
    LeaveType, SalaryComponent, LeaveBalance
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def seed_roles(db: Session):
    """Tạo 4 vai trò: Admin, HR Chung, HR Phòng ban, Staff"""
    roles_data = [
        {"role_name": "admin", "role_level": 1},
        {"role_name": "hr_general", "role_level": 2},
        {"role_name": "hr_department", "role_level": 3},
        {"role_name": "staff", "role_level": 4},
    ]
    
    for role_data in roles_data:
        existing = db.query(Role).filter(Role.role_name == role_data["role_name"]).first()
        if not existing:
            role = Role(**role_data)
            db.add(role)
    
    db.commit()
    print("✓ Seeded roles")


def seed_departments(db: Session):
    """Tạo 3 phòng ban: IT, Marketing, Kế toán"""
    departments_data = [
        {"department_name": "Phòng IT", "department_code": "IT", "is_active": True},
        {"department_name": "Phòng Marketing", "department_code": "MKT", "is_active": True},
        {"department_name": "Phòng Kế toán", "department_code": "ACC", "is_active": True},
    ]
    
    for dept_data in departments_data:
        existing = db.query(Department).filter(Department.department_code == dept_data["department_code"]).first()
        if not existing:
            dept = Department(**dept_data)
            db.add(dept)
    
    db.commit()
    print("✓ Seeded departments")


def seed_positions(db: Session):
    """Tạo các chức vụ"""
    it_dept = db.query(Department).filter(Department.department_code == "IT").first()
    
    positions_data = [
        {"position_name": "Giám đốc", "department_id": None, "base_salary_range": 50000000},
        {"position_name": "Trưởng phòng", "department_id": it_dept.department_id if it_dept else None, "base_salary_range": 30000000},
        {"position_name": "Nhân viên", "department_id": it_dept.department_id if it_dept else None, "base_salary_range": 15000000},
        {"position_name": "Thực tập sinh", "department_id": it_dept.department_id if it_dept else None, "base_salary_range": 5000000},
    ]
    
    for pos_data in positions_data:
        existing = db.query(Position).filter(Position.position_name == pos_data["position_name"]).first()
        if not existing:
            pos = Position(**pos_data)
            db.add(pos)
    
    db.commit()
    print("✓ Seeded positions")


def seed_leave_types(db: Session):
    """Tạo các loại nghỉ phép"""
    leave_types_data = [
        {"type_name": "annual_leave", "is_paid": True, "days_per_year": 12},
        {"type_name": "sick_leave", "is_paid": True, "days_per_year": 30},
        {"type_name": "unpaid_leave", "is_paid": False, "days_per_year": 0},
    ]
    
    for lt_data in leave_types_data:
        existing = db.query(LeaveType).filter(LeaveType.type_name == lt_data["type_name"]).first()
        if not existing:
            lt = LeaveType(**lt_data)
            db.add(lt)
    
    db.commit()
    print("✓ Seeded leave types")


def seed_salary_components(db: Session):
    """Tạo các thành phần lương"""
    components_data = [
        {"component_name": "Lương cơ bản", "component_type": "basic", "is_taxable": True},
        {"component_name": "Phụ cấp", "component_type": "allowance", "is_taxable": True},
        {"component_name": "Thưởng", "component_type": "bonus", "is_taxable": True},
        {"component_name": "Tăng ca", "component_type": "overtime", "is_taxable": True},
        {"component_name": "Khấu trừ", "component_type": "deduction", "is_taxable": False},
    ]
    
    for comp_data in components_data:
        existing = db.query(SalaryComponent).filter(SalaryComponent.component_name == comp_data["component_name"]).first()
        if not existing:
            comp = SalaryComponent(**comp_data)
            db.add(comp)
    
    db.commit()
    print("✓ Seeded salary components")


def seed_employees(db: Session):
    """Tạo nhân viên mẫu với 4 vai trò"""
    
    # Get roles
    admin_role = db.query(Role).filter(Role.role_name == "admin").first()
    hr_general_role = db.query(Role).filter(Role.role_name == "hr_general").first()
    hr_dept_role = db.query(Role).filter(Role.role_name == "hr_department").first()
    staff_role = db.query(Role).filter(Role.role_name == "staff").first()
    
    # Get departments
    it_dept = db.query(Department).filter(Department.department_code == "IT").first()
    mkt_dept = db.query(Department).filter(Department.department_code == "MKT").first()
    
    # Get positions
    director_pos = db.query(Position).filter(Position.position_name == "Giám đốc").first()
    manager_pos = db.query(Position).filter(Position.position_name == "Trưởng phòng").first()
    staff_pos = db.query(Position).filter(Position.position_name == "Nhân viên").first()
    
    employees_data = [
        {
            "employee_code": "AD001",
            "full_name": "Nguyễn Văn Admin",
            "email": "admin@hrms.com",
            "phone": "0901000001",
            "date_of_birth": date(1985, 1, 1),
            "department_id": None,
            "position_id": director_pos.position_id if director_pos else None,
            "role_id": admin_role.role_id if admin_role else None,
            "manager_id": None,
            "hire_date": date(2020, 1, 1),
            "status": "active",
            "username": "admin",
            "password_hash": hash_password("admin123"),
        },
        {
            "employee_code": "HR001",
            "full_name": "Trần Thị HR Chung",
            "email": "hr.general@hrms.com",
            "phone": "0902000001",
            "date_of_birth": date(1990, 5, 10),
            "department_id": None,
            "position_id": manager_pos.position_id if manager_pos else None,
            "role_id": hr_general_role.role_id if hr_general_role else None,
            "manager_id": None,  # Will set after admin is created
            "hire_date": date(2021, 3, 1),
            "status": "active",
            "username": "hr_general",
            "password_hash": hash_password("hr123"),
        },
        {
            "employee_code": "HRD001",
            "full_name": "Lê Văn HR IT",
            "email": "hr.it@hrms.com",
            "phone": "0903000001",
            "date_of_birth": date(1992, 8, 15),
            "department_id": it_dept.department_id if it_dept else None,
            "position_id": manager_pos.position_id if manager_pos else None,
            "role_id": hr_dept_role.role_id if hr_dept_role else None,
            "manager_id": None,  # Will set after hr_general is created
            "hire_date": date(2021, 6, 1),
            "status": "active",
            "username": "hr_it",
            "password_hash": hash_password("hrit123"),
        },
        {
            "employee_code": "IT001",
            "full_name": "Phạm Văn IT Staff",
            "email": "staff.it@hrms.com",
            "phone": "0904000001",
            "date_of_birth": date(1995, 12, 20),
            "department_id": it_dept.department_id if it_dept else None,
            "position_id": staff_pos.position_id if staff_pos else None,
            "role_id": staff_role.role_id if staff_role else None,
            "manager_id": None,  # Will set after hr_it is created
            "hire_date": date(2022, 1, 10),
            "status": "active",
            "username": "staff_it",
            "password_hash": hash_password("staff123"),
        },
        {
            "employee_code": "MKT001",
            "full_name": "Hoàng Thị Marketing",
            "email": "staff.mkt@hrms.com",
            "phone": "0905000001",
            "date_of_birth": date(1996, 3, 25),
            "department_id": mkt_dept.department_id if mkt_dept else None,
            "position_id": staff_pos.position_id if staff_pos else None,
            "role_id": staff_role.role_id if staff_role else None,
            "manager_id": None,
            "hire_date": date(2022, 3, 15),
            "status": "active",
            "username": "staff_mkt",
            "password_hash": hash_password("staff123"),
        },
    ]
    
    created_employees = []
    for emp_data in employees_data:
        existing = db.query(Employee).filter(Employee.employee_code == emp_data["employee_code"]).first()
        if not existing:
            emp = Employee(**emp_data)
            db.add(emp)
            db.flush()  # Get IDs
            created_employees.append(emp)
    
    db.commit()
    
    # Update manager relationships
    if len(created_employees) >= 4:
        admin_emp = created_employees[0]
        hr_general_emp = created_employees[1]
        hr_it_emp = created_employees[2]
        it_staff_emp = created_employees[3]
        mkt_staff_emp = created_employees[4] if len(created_employees) > 4 else None
        
        # Set managers
        hr_general_emp.manager_id = admin_emp.employee_id
        hr_it_emp.manager_id = hr_general_emp.employee_id
        it_staff_emp.manager_id = hr_it_emp.employee_id
        if mkt_staff_emp:
            mkt_staff_emp.manager_id = hr_general_emp.employee_id
        
        # Set HR manager for IT department
        if it_dept:
            it_dept.hr_manager_id = hr_it_emp.employee_id
        
        db.commit()
    
    print(f"✓ Seeded {len(created_employees)} employees")
    
    # Create leave balances for employees
    leave_types = db.query(LeaveType).all()
    current_year = datetime.now().year
    
    for emp in created_employees:
        for lt in leave_types:
            if lt.days_per_year > 0:  # Only for paid leaves
                existing_balance = db.query(LeaveBalance).filter(
                    LeaveBalance.employee_id == emp.employee_id,
                    LeaveBalance.leave_type_id == lt.leave_type_id,
                    LeaveBalance.year == current_year
                ).first()
                
                if not existing_balance:
                    balance = LeaveBalance(
                        employee_id=emp.employee_id,
                        leave_type_id=lt.leave_type_id,
                        year=current_year,
                        total_days=lt.days_per_year,
                        used_days=0,
                        remaining_days=lt.days_per_year
                    )
                    db.add(balance)
    
    db.commit()
    print(f"✓ Seeded leave balances for {current_year}")


def main():
    print("=" * 50)
    print("SEEDING HRMS DATABASE")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        seed_roles(db)
        seed_departments(db)
        seed_positions(db)
        seed_leave_types(db)
        seed_salary_components(db)
        seed_employees(db)
        
        print("\n" + "=" * 50)
        print("✓ ALL DATA SEEDED SUCCESSFULLY!")
        print("=" * 50)
        print("\nTest accounts:")
        print("  Admin:       username=admin,       password=admin123")
        print("  HR General:  username=hr_general,  password=hr123")
        print("  HR IT:       username=hr_it,       password=hrit123")
        print("  Staff IT:    username=staff_it,    password=staff123")
        print("  Staff MKT:   username=staff_mkt,   password=staff123")
        
    except Exception as e:
        print(f"\n✗ Error seeding data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
