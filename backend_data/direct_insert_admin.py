"""
Direct database insert - bypass any potential issues
"""
from app.core.database import SessionLocal
from app.models.employees import Employee
from app.models.departments import Department
from app.models.positions import Position
from app.models.roles import Role
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()

try:
    # Check existing
    emp_count = db.query(Employee).count()
    print(f"Current employees: {emp_count}")
    
    if emp_count > 0:
        print("Database already has employees. Use reset_to_admin_only.py to clear first.")
    else:
        # Create Role
        role = Role(role_id=1, role_name="admin", role_level=1)
        db.add(role)
        db.flush()
        
        # Create Department
        dept = Department(department_id=1, department_name="Management", department_code="MGMT", is_active=True)
        db.add(dept)
        db.flush()
        
        # Create Position
        pos = Position(position_id=1, position_name="Administrator", department_id=1)
        db.add(pos)
        db.flush()
        
        # Create Employee
        from datetime import date
        admin = Employee(
            employee_id=1,
            employee_code="ADMIN001",
            full_name="Tô Văn Hà",
            username="to1979714",
            email="to1979714@company.com",
            password_hash=pwd_context.hash("hrm@1"),
            role_id=1,
            department_id=1,
            position_id=1,
            status="active",
            hire_date=date(2020, 1, 1)  # Required field!
        )
        db.add(admin)
        db.commit()
        
        print("✅ Admin created successfully!")
        print(f"Username: to1979714")
        print(f"Password: hrm@1")
        
        # Verify
        check = db.query(Employee).filter(Employee.username == "to1979714").first()
        if check:
            print(f"✅ Verified: Employee {check.username} exists in database")
            print(f"Password hash: {check.password_hash[:50]}...")
        else:
            print("❌ ERROR: Employee not found after insert!")
            
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
