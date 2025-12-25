"""Quick test script to create HR Manager directly"""
from app.core.database import SessionLocal
from app.models.employees import Employee
from app.models.roles import Role
from app.models.departments import Department
from app.models.positions import Position
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()

try:
    # Get IDs
    hr_role = db.query(Role).filter(Role.role_level == 2).first()
    hr_dept = db.query(Department).filter(Department.department_code == "HR").first()
    hr_manager_pos = db.query(Position).filter(Position.position_name == "HR Manager").first()
    
    # Create employee
    new_emp = Employee(
        employee_code="FIN-9999",
        full_name="Test HR Manager",
        username="hrmanager1",
        email="hrmanager1@finova.vn",
        phone="1234567890",
        hire_date="2025-12-24",
        department_id=hr_dept.department_id,
        position_id=hr_manager_pos.position_id,
        role_id=hr_role.role_id,
        salary=2000,
        password_hash=pwd_context.hash("password123"),
        created_by=1
    )
    
    db.add(new_emp)
    db.commit()
    print("✅ SUCCESS! HR Manager created!")
    print(f"Username: hrmanager1")
    print(f"Password: password123")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    db.rollback()
finally:
    db.close()
