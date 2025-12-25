"""
Reset Database Script - Only 1 Admin Account
Tạo database mới với chỉ 1 tài khoản admin duy nhất
"""
from app.core.database import engine, SessionLocal, Base
from app.models.employees import Employee
from app.models.departments import Department
from app.models.positions import Position
from app.models.roles import Role
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_database():
    """Drop all tables and recreate with 1 admin account only"""
    print("🗑️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("🏗️  Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create Role
        print("👥 Creating admin role...")
        admin_role = Role(
            role_id=1,
            role_name="admin",
            role_level=1
        )
        db.add(admin_role)
        
        # Create Department
        print("🏢 Creating default department...")
        dept = Department(
            department_id=1,
            department_name="Management",
            department_code="MGMT",
            is_active=True
        )
        db.add(dept)
        
        # Create Position
        print("💼 Creating admin position...")
        pos = Position(
            position_id=1,
            position_name="Administrator",
            department_id=1
        )
        db.add(pos)
        
        # Create Admin Employee
        print("🔑 Creating admin account...")
        admin = Employee(
            employee_id=1,
            employee_code="ADMIN001",
            full_name="Tô Văn Hà",
            username="to1979714",
            email="to197714@company.com",
            password_hash=pwd_context.hash("hrm@1"),  # Password from data_employee.csv
            role_id=1,
            department_id=1,
            position_id=1,
            status="active"
        )
        db.add(admin)
        
        db.commit()
        
        print("\n" + "="*60)
        print("✅ DATABASE RESET SUCCESSFUL!")
        print("="*60)
        print("\n📋 ADMIN ACCOUNT DETAILS:")
        print(f"   Username: to1979714")
        print(f"   Password: hrm@1")
        print(f"   Full Name: Tô Văn Hà")
        print(f"   Role: Administrator (Level 1)")
        print("\n" + "="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()
