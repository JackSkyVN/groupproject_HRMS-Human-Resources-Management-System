import sys
import os
from datetime import date
from passlib.context import CryptContext

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal, Base
from app.models import Role, Department, Position, Employee, LeaveType

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_admin_only():
    """
    Seed ONLY ONE ADMIN ACCOUNT for clean start.
    All other employees will be created via UI.
    """
    print("=" * 50)
    print("CLEAN START - ADMIN ONLY")
    print("=" * 50)

    # 1. Reset Database structure
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✓ Database structure recreated.")

    db = SessionLocal()
    try:
        # 2. Seed Roles
        roles = [
            Role(role_name="admin", role_level=1),
            Role(role_name="hr_general", role_level=2),
            Role(role_name="hr_department", role_level=3),
            Role(role_name="staff", role_level=4)
        ]
        db.add_all(roles)
        db.flush()
        print("✓ Roles created.")

        # 3. Seed Basic System Data
        leave_types = [
            LeaveType(type_name="annual_leave", is_paid=True, days_per_year=12),
            LeaveType(type_name="sick_leave", is_paid=True, days_per_year=30),
        ]
        db.add_all(leave_types)
        db.flush()
        print("✓ Leave types created.")

        # 4. Create Departments
        dept_member_council = Department(
            department_name="Member Council",
            department_code="MC",
            is_active=True
        )
        dept_hr = Department(
            department_name="HR Department",
            department_code="HR",
            is_active=True
        )
        
        # 5 Business Departments
        dept_it = Department(
            department_name="IT Department",
            department_code="IT",
            is_active=True
        )
        dept_finance = Department(
            department_name="Finance Department",
            department_code="FIN",
            is_active=True
        )
        dept_sales = Department(
            department_name="Sales Department",
            department_code="SALES",
            is_active=True
        )
        dept_marketing = Department(
            department_name="Marketing Department",
            department_code="MKT",
            is_active=True
        )
        dept_operations = Department(
            department_name="Operations Department",
            department_code="OPS",
            is_active=True
        )
        
        db.add_all([dept_member_council, dept_hr, dept_it, dept_finance, dept_sales, dept_marketing, dept_operations])
        db.flush()
        print("✓ Departments created (7 total).")

        # 6. Create Positions
        positions = [
            Position(position_name="Director"),           # For Member Council (Level 1)
            Position(position_name="HR Manager"),         # Created by Admin (Level 2)
            Position(position_name="HR Staff"),           # Created by HR Manager (Level 3)
            Position(position_name="Staff"),              # Created by HR Staff (Level 4) - salary varies by dept
        ]
        db.add_all(positions)
        db.flush()
        print("✓ Positions created (4 total).")

        # 7. Create ONLY ONE ADMIN ACCOUNT
        admin_role = db.query(Role).filter(Role.role_level == 1).first()
        director_position = db.query(Position).filter(Position.position_name == "Director").first()
        
        admin = Employee(
            employee_code="FIN-0001",
            full_name="Tô Văn Hà",
            username="to1979714",
            password_hash=pwd_context.hash("hrm@1"),
            email="to1979714@finova.vn",
            phone="502311090",
            department_id=dept_member_council.department_id,
            position_id=director_position.position_id,
            role_id=admin_role.role_id,
            salary=3000,
            hire_date=date.today(),
            status="active"
        )
        db.add(admin)
        db.commit()
        
        print("\n" + "=" * 50)
        print("✓ SUCCESS!")
        print("=" * 50)
        print(f"Admin Account Created:")
        print(f"  Name: {admin.full_name}")
        print(f"  Username: {admin.username}")
        print(f"  Password: hrm@1")
        print(f"  Department: Member Council")
        print(f"  Position: Director")
        print(f"  Salary: $3,000")
        print("=" * 50)
        print("\nYou can now:")
        print("1. Login with this account")
        print("2. Use 'Add Employee' to create other users via UI")
        print("=" * 50)

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin_only()
