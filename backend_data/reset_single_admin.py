"""
Simple Reset - ONLY 1 ADMIN ACCOUNT
4-Level Permission System:
- Level 1: Admin
- Level 2: HR Chung (managed by Admin)
- Level 3: HR Phòng ban (managed by HR Chung)
- Level 4: Staff (managed by HR Phòng ban)
"""
from app.core.database import engine, SessionLocal, Base
from app.models.employees import Employee
from app.models.departments import Department
from app.models.positions import Position
from app.models.roles import Role
from passlib.context import CryptContext
from datetime import date

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_to_single_admin():
    """Drop all tables and create ONLY 1 admin account"""
    
    print("="*80)
    print("🔄 SIMPLE RESET - 1 ADMIN ONLY")
    print("="*80)
    
    # Step 1: Drop all tables
    print("\n🗑️  Step 1: Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped!")
    
    # Step 2: Create all tables
    print("\n🏗️  Step 2: Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created!")
    
    db = SessionLocal()
    try:
        # Step 3: Create Roles (4 levels only)
        print("\n👥 Step 3: Creating 4 roles...")
        roles_data = [
            (1, "Admin", 1),           # Level 1: Admin
            (2, "HR Chung", 2),        # Level 2: HR Chung
            (3, "HR Phong Ban", 3),    # Level 3: HR Phòng ban
            (4, "Staff", 4)            # Level 4: Staff
        ]
        for role_id, role_name, role_level in roles_data:
            role = Role(role_id=role_id, role_name=role_name, role_level=role_level)
            db.add(role)
        db.commit()
        print(f"✅ Created 4 roles")
        
        # Step 4: Create Management Department
        print("\n🏢 Step 4: Creating Management department...")
        dept = Department(
            department_id=1,
            department_name="Management",
            department_code="MGMT",
            is_active=True
        )
        db.add(dept)
        db.commit()
        print("✅ Created Management department")
        
        # Step 5: Create Administrator Position
        print("\n💼 Step 5: Creating Administrator position...")
        pos = Position(
            position_id=1,
            position_name="System Administrator",
            department_id=1
        )
        db.add(pos)
        db.commit()
        print("✅ Created Administrator position")
        
        # Step 6: Create ONLY 1 Admin
        print("\n👤 Step 6: Creating SINGLE admin account...")
        admin = Employee(
            employee_id=1,
            employee_code="ADMIN001",
            full_name="Tô Văn Hà",
            username="to1979714",
            email="to1979714@company.com",
            password_hash=pwd_context.hash("hrm@1"),
            role_id=1,  # Admin role
            department_id=1,
            position_id=1,
            hire_date=date(2020, 1, 1),
            status="active"
        )
        db.add(admin)
        db.commit()
        print("✅ Created admin account")
        
        # Summary
        print("\n" + "="*80)
        print("✅ RESET COMPLETE!")
        print("="*80)
        print("\n📊 SUMMARY:")
        print(f"   Roles: {db.query(Role).count()} (4 levels)")
        print(f"   Departments: {db.query(Department).count()}")
        print(f"   Positions: {db.query(Position).count()}")
        print(f"   Employees: {db.query(Employee).count()} (ONLY 1 ADMIN)")
        
        print("\n🔑 ADMIN LOGIN:")
        print("   Username: to1979714")
        print("   Password: hrm@1")
        print("   Role: Admin (Level 1)")
        print("   Full Access: ✅")
        
        print("\n" + "="*80)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_to_single_admin()
