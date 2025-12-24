"""
Strict Reset Script for HRMS
1. Xóa toàn bộ database
2. Tạo lại bảng
3. Chỉ seed duy nhất 01 tài khoản Admin tối cao
"""
import sys
import os
from datetime import date
from passlib.context import CryptContext

# Thêm thư mục gốc vào path để import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal, Base
from app.models import Role, Employee, LeaveType, SalaryComponent

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def reset_and_seed():
    print("=" * 50)
    print("STRICT RESET: DROPPING ALL TABLES")
    print("=" * 50)
    
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✓ Database structure recreated.")

    db = SessionLocal()
    try:
        # 1. Seed Roles
        print("\nSeeding roles...")
        roles = [
            Role(role_name="admin", role_level=1),
            Role(role_name="hr_general", role_level=2),
            Role(role_name="hr_department", role_level=3),
            Role(role_name="staff", role_level=4),
        ]
        db.add_all(roles)
        db.flush()

        # 2. Seed Basic Leave Types (For system operationality)
        print("Seeding basic leave types...")
        leave_types = [
            LeaveType(type_name="annual_leave", is_paid=True, days_per_year=12),
            LeaveType(type_name="sick_leave", is_paid=True, days_per_year=30),
            LeaveType(type_name="unpaid_leave", is_paid=False, days_per_year=0),
        ]
        db.add_all(leave_types)

        # 3. Seed Basic Salary Components
        print("Seeding salary components...")
        salary_comps = [
            SalaryComponent(component_name="Lương cơ bản", component_type="basic", is_taxable=True),
            SalaryComponent(component_name="Phụ cấp", component_type="allowance", is_taxable=True),
            SalaryComponent(component_name="Khấu trừ", component_type="deduction", is_taxable=False),
        ]
        db.add_all(salary_comps)
        db.flush()

        # 4. Seed ONLY THE ADMIN
        print("Creating Master Admin account...")
        admin_role = db.query(Role).filter(Role.role_name == "admin").first()
        
        admin = Employee(
            employee_code="ADMIN_MASTER",
            full_name="Administrator",
            email="admin@hrms.local",
            username="admin",
            password_hash=hash_password("admin123"),
            role_id=admin_role.role_id,
            hire_date=date.today(),
            status="active"
        )
        db.add(admin)
        db.commit()

        print("\n" + "=" * 50)
        print("✓ STRICT RESET COMPLETE!")
        print("=" * 50)
        print("DUY NHẤT 01 TÀI KHOẢN ĐĂNG NHẬP ĐƯỢC:")
        print("  Username: admin")
        print("  Password: admin123")
        print("=" * 50)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed()
