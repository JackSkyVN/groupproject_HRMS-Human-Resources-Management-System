"""
Import 203 employees from CSV to PostgreSQL
Map Permission_Level to role system
"""
import sys
import os
import csv
from datetime import datetime
from passlib.context import CryptContext

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models import Role, Department, Position, Employee

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def map_role_name(csv_role: str, permission_level: str) -> str:
    """Map CSV Role to Database role_name"""
    if csv_role == "Admin":
        return "admin"
    elif csv_role == "Director":
        return "hr_general"
    elif csv_role == "HR Department":
        return "hr_department"
    else:
        return "staff"


def get_or_create_department(db: Session, dept_name: str) -> int:
    """Get existing or create new department"""
    if not dept_name or dept_name.strip() == "":
        return None
    
    dept = db.query(Department).filter(Department.department_name == dept_name).first()
    if not dept:
        # Create unique department code
        base_code = dept_name.replace(" ","").replace("&","")[:10].upper()
        code = base_code
        
        # Check if code exists, if so append counter
        counter = 1
        while db.query(Department).filter(Department.department_code == code).first():
            code = f"{base_code[:8]}{counter:02d}"
            counter += 1
        
        dept = Department(
            department_name=dept_name,
            department_code=code,
            is_active=True
        )
        db.add(dept)
        db.flush()
    
    return dept.department_id


def get_or_create_position(db: Session, pos_name: str, dept_id: int = None) -> int:
    """Get existing or create new position"""
    if not pos_name or pos_name.strip() == "":
        return None
    
    pos = db.query(Position).filter(Position.position_name == pos_name).first()
    if not pos:
        pos = Position(
            position_name=pos_name,
            department_id=dept_id
        )
        db.add(pos)
        db.flush()
    
    return pos.position_id


def import_employees_from_csv():
    """Import employees from CSV file"""
    
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        'db',
        'data_employee.csv'
    )
    
    print("=" * 60)
    print("IMPORT 203 EMPLOYEES TO POSTGRESQL")
    print("=" * 60)
    print(f"\nCSV File: {csv_path}")
    
    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV file not found!")
        return
    
    db = SessionLocal()
    
    try:
        # STEP 1: Clear old employees
        print("\n[1/4] Clearing old employees...")
        old_count = db.query(Employee).count()
        
        # Clear department hr_manager_id to avoid FK constraint
        db.query(Department).update({"hr_manager_id": None})
        db.commit()
        
        # Now delete employees
        db.query(Employee).delete()
        db.commit()
        print(f"      [OK] Deleted {old_count} old employees")
        
        # STEP 2: Ensure roles exist
        print("\n[2/4] Checking roles...")
        roles = {
            "admin": db.query(Role).filter(Role.role_name == "admin").first(),
            "hr_general": db.query(Role).filter(Role.role_name == "hr_general").first(),
            "hr_department": db.query(Role).filter(Role.role_name == "hr_department").first(),
            "staff": db.query(Role).filter(Role.role_name == "staff").first(),
        }
        
        for role_name, role_obj in roles.items():
            if role_obj:
                print(f"      [OK] Role '{role_name}' exists (ID: {role_obj.role_id})")
            else:
                print(f"      [ERROR] Role '{role_name}' NOT FOUND!")
                return
        
        # STEP 3: Read and parse CSV
        print("\n[3/4] Reading CSV...")
        employees_data = []
        
        # Use utf-8-sig to handle BOM
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                employees_data.append(row)
        
        print(f"      [OK] Read {len(employees_data)} employees from CSV")
        
        # STEP 4: Import employees
        print("\n[4/4] Importing employees...")
        
        imported_count = 0
        error_count = 0
        
        for idx, row in enumerate(employees_data, 1):
            try:
                # Parse data
                emp_id = row['Employee ID']
                full_name = row['Full Name']
                username = row['Username']
                password = row['Password']
                csv_role = row['Role']
                permission_level = row['Permission_Level']
                dept_name = row['Department'].strip() if row['Department'] else None
                pos_name = row['Position'].strip() if row['Position'] else None
                phone = row['Phone/ID']
                
                # Parse date
                try:
                    dob = datetime.strptime(row['Date of Birth'], '%Y-%m-%d').date()
                except:
                    dob = None
                
                # Map role
                role_name = map_role_name(csv_role, permission_level)
                role = roles[role_name]
                
                # Get/Create department and position
                dept_id = get_or_create_department(db, dept_name) if dept_name else None
                pos_id = get_or_create_position(db, pos_name, dept_id) if pos_name else None
                
                # Create employee
                employee = Employee(
                    employee_code=f"EMP{emp_id}",
                    full_name=full_name,
                    email=f"{username}@hrms.com",
                    phone=phone,
                    date_of_birth=dob,
                    department_id=dept_id,
                    position_id=pos_id,
                    role_id=role.role_id,
                    manager_id=None,
                    hire_date=datetime.now().date(),
                    status="active",
                    username=username,
                    password_hash=hash_password(password)
                )
                
                db.add(employee)
                
                if idx % 50 == 0:
                    db.flush()
                    print(f"      ... processed {idx}/{len(employees_data)}")
                
                imported_count += 1
                
            except Exception as e:
                error_count += 1
                name = row.get('Full Name', 'Unknown')
                # Use repr() to avoid Unicode errors in console
                print(f"      [ERROR] Row {idx}: {str(e)[:80]}")
                continue
        
        # Commit all
        db.commit()
        
        # Summary
        print("\n" + "=" * 60)
        print("IMPORT COMPLETE!")
        print("=" * 60)
        print(f"[OK] Successfully imported: {imported_count} employees")
        print(f"[ERROR] Errors: {error_count} employees")
        
        # Verify
        final_count = db.query(Employee).count()
        print(f"\nTotal employees in database: {final_count}")
        
        # Show role distribution
        print("\nRole distribution:")
        for role_name in ["admin", "hr_general", "hr_department", "staff"]:
            role = roles[role_name]
            count = db.query(Employee).filter(Employee.role_id == role.role_id).count()
            print(f"  - {role_name:15} (level {role.role_level}): {count:3} employees")
        
        # Show department distribution (top 5)
        print("\nTop 5 departments:")
        depts = db.query(Department).all()
        dept_counts = []
        for dept in depts:
            count = db.query(Employee).filter(Employee.department_id == dept.department_id).count()
            dept_counts.append((dept.department_name, count))
        
        dept_counts.sort(key=lambda x: x[1], reverse=True)
        for dept_name, count in dept_counts[:5]:
            print(f"  - {dept_name:40} {count:3} employees")
        
    except Exception as e:
        print(f"\n[FATAL ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import_employees_from_csv()