import sys
import os
import csv
from datetime import datetime, date
from passlib.context import CryptContext

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal, Base
from app.models import Role, Department, Position, Employee, LeaveType, SalaryComponent

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def seed_from_csv():
    csv_path = r"c:\Users\Dell\Downloads\Group Project\groupproject_HRMS-Human-Resources-Management-System\db\data_employee.csv"
    
    if not os.path.exists(csv_path):
        print(f"ERROR: CSV file not found at {csv_path}")
        return

    print("=" * 50)
    print("ROBUST SEEDING FROM CSV")
    print("=" * 50)

    # 1. Reset Database structure
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✓ Database structure recreated.")

    db = SessionLocal()
    try:
        # 2. Seed Roles
        roles_map = {
            "Admin": Role(role_name="admin", role_level=1),
            "HR_General": Role(role_name="hr_general", role_level=2),
            "HR_Dept": Role(role_name="hr_department", role_level=3),
            "Staff": Role(role_name="staff", role_level=4)
        }
        db.add_all(roles_map.values())
        db.flush()

        # 3. Seed Basic System Needs
        leave_types = [
            LeaveType(type_name="annual_leave", is_paid=True, days_per_year=12),
            LeaveType(type_name="sick_leave", is_paid=True, days_per_year=30),
        ]
        db.add_all(leave_types)
        db.flush()

        # 4. Read CSV and Seed Data
        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                # Format: Employee ID,Full Name,Position,Department,Date of Birth,Phone/ID,Username,Password
                username = row.get("Username", "").strip()
                if not username: continue
                
                full_name = row.get("Full Name", "Unknown")
                emp_code = row.get("Employee ID", f"EMP{count:03}")
                raw_password = row.get("Password", "admin123")
                dept_name = row.get("Department", "General").strip()
                pos_name = row.get("Position", "Staff").strip()
                dob_str = row.get("Date of Birth", "")
                phone = row.get("Phone/ID", "")

                # Handle Date of Birth
                dob = None
                if dob_str:
                    try:
                        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
                    except:
                        pass

                # Get or Create Department
                dept = db.query(Department).filter(Department.department_name == dept_name).first()
                if not dept:
                    dept_code = dept_name[:3].upper()
                    # Ensure unique code
                    base_code = dept_code
                    suffix = 1
                    while db.query(Department).filter(Department.department_code == dept_code).first():
                        dept_code = f"{base_code}{suffix}"
                        suffix += 1
                        
                    dept = Department(department_name=dept_name, department_code=dept_code, is_active=True)
                    db.add(dept)
                    db.flush()

                # Get or Create Position
                pos = db.query(Position).filter(Position.position_name == pos_name).first()
                if not pos:
                    pos = Position(position_name=pos_name)
                    db.add(pos)
                    db.flush()

                # Determine Role
                # FIRST ACCOUNT = ADMIN
                if count == 0:
                    role_id = roles_map["Admin"].role_id
                    print(f"★ Promoting first user '{username}' ({full_name}) to MASTER ADMIN")
                else:
                    # Logic: if Position contains 'Director' or 'Manager' and department is 'HR', make them HR_General (L2)
                    if "HR" in dept_name and ("Director" in pos_name or "General" in pos_name):
                        role_id = roles_map["HR_General"].role_id
                    elif "HR" in dept_name:
                        role_id = roles_map["HR_Dept"].role_id
                    else:
                        role_id = roles_map["Staff"].role_id

                # Calculate Salary based on Position and Department
                salary = 1400  # default
                pos_lower = pos_name.lower()
                dept_lower = dept_name.lower()
                
                if "director" in pos_lower or "giám đốc" in pos_lower:
                    salary = 3000
                elif "admin" in pos_lower and "hr" in pos_lower:
                    salary = 2500
                elif "manager" in pos_lower or "trưởng" in pos_lower:
                    salary = 2000
                elif "hr" in pos_lower and "staff" in pos_lower:
                    salary = 1800
                # Department-based for regular staff
                elif "it" in dept_lower or "technology" in dept_lower or "tech" in dept_lower:
                    salary = 1600
                elif "finance" in dept_lower or "accounting" in dept_lower or "kế toán" in dept_lower:
                    salary = 1600
                elif "sales" in dept_lower or "bán hàng" in dept_lower:
                    salary = 1500
                elif "operation" in dept_lower or "vận hành" in dept_lower:
                    salary = 1500
                elif "marketing" in dept_lower:
                    salary = 1400
                elif "admin" in dept_lower or "hành chính" in dept_lower:
                    salary = 1400
                elif "customer" in dept_lower or "khách hàng" in dept_lower:
                    salary = 1300

                emp = Employee(
                    employee_code=emp_code,
                    full_name=full_name,
                    username=username,
                    password_hash=hash_password(raw_password),
                    email=f"{username}@finova.vn",
                    phone=phone,
                    date_of_birth=dob,
                    department_id=dept.department_id,
                    position_id=pos.position_id,
                    role_id=role_id,
                    salary=salary,
                    hire_date=date.today(),
                    status="active"
                )
                db.add(emp)
                count += 1
                
                if count % 50 == 0:
                    db.commit()
                    print(f"  Processed {count} employees...")

        db.commit()
        print(f"\n✓ SUCCESS: Seeded {count} employees from CSV.")
        print(f"✓ The first account ({full_name}) has username: {username} and the password from CSV.")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_from_csv()
