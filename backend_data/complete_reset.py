"""
COMPLETE DATABASE RESET WITH FULL DATA
Uses current models (Employee-based, not User/RBAC)
Seeds from data_employee.csv with proper schema
"""
import csv
import os
from datetime import date
from app.core.database import engine, SessionLocal, Base
from app.models.employees import Employee
from app.models.departments import Department
from app.models.positions import Position
from app.models.roles import Role
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_and_seed_full():
    """Complete reset with full data from CSV"""
    print("="*80)
    print("🔄 COMPLETE DATABASE RESET - FULL DATA")
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
        # Step 3: Create Roles
        print("\n👥 Step 3: Creating roles...")
        roles_data = [
            (1, "admin", 1),
            (2, "hr", 2),
            (3, "manager", 3),
            (4, "employee", 4)
        ]
        for role_id, role_name, role_level in roles_data:
            role = Role(role_id=role_id, role_name=role_name, role_level=role_level)
            db.add(role)
        db.commit()
        print(f"✅ Created {len(roles_data)} roles")
        
        # Step 4: Read CSV and collect unique departments/positions
        csv_path = os.path.join("..", "db", "data_employee.csv")
        if not os.path.exists(csv_path):
            print(f"❌ CSV not found at {csv_path}")
            return
        
        print(f"\n📄 Step 4: Reading from {csv_path}...")
        
        departments_set = set()
        positions_set = set()
        employees_data = []
        
        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dept_name = row.get("Department", "").strip()
                pos_name = row.get("Position", "").strip()
                
                if dept_name:
                    departments_set.add(dept_name)
                if pos_name:
                    positions_set.add(pos_name)
                
                employees_data.append(row)
        
        print(f"Found {len(departments_set)} unique departments")
        print(f"Found {len(positions_set)} unique positions")
        print(f"Found {len(employees_data)} total employees in CSV")
        
        # Step 5: Create Departments
        print("\n🏢 Step 5: Creating departments...")
        dept_map = {}
        for idx, dept_name in enumerate(sorted(departments_set), start=1):
            dept_code = f"DEPT{idx:03d}"
            dept = Department(
                department_id=idx,
                department_name=dept_name,
                department_code=dept_code,
                is_active=True
            )
            db.add(dept)
            dept_map[dept_name] = idx
        db.commit()
        print(f"✅ Created {len(departments_set)} departments")
        
        # Step 6: Create Positions
        print("\n💼 Step 6: Creating positions...")
        pos_map = {}
        for idx, pos_name in enumerate(sorted(positions_set), start=1):
            pos = Position(
                position_id=idx,
                position_name=pos_name,
                department_id=None
            )
            db.add(pos)
            pos_map[pos_name] = idx
        db.commit()
        print(f"✅ Created {len(positions_set)} positions")
        
        # Step 7: Create Employees (ONLY THE 5 CORE MEMBERS)
        print("\n👤 Step 7: Creating employees (5 core members only)...")
        core_usernames = ["to1979714", "truong1979746", "pham1973439", "tran1975778", "le1984949"]
        emp_count = 0
        
        for row in employees_data:
            username = row.get("Username", "").strip()
            
            # Filter: only core 5 members
            if username not in core_usernames:
                continue
            
            full_name = row.get("Full Name", "").strip()
            dept_name = row.get("Department", "").strip()
            pos_name = row.get("Position", "").strip()
            password = row.get("Password", "").strip()
            phone = row.get("Phone/ID", "").strip()
            
            if not username or not password:
                continue
            
            # Determine role based on position
            role_id = 4  # default: employee
            if "Director" in pos_name or "Chairman" in pos_name:
                role_id = 3  # manager
            if dept_name == "IT Department":
                role_id = 1  # admin
            
            employee = Employee(
                employee_code=f"EMP{emp_count+1:03d}",
                full_name=full_name,
                username=username,
                email=f"{username}@company.com",
                password_hash=pwd_context.hash(password),
                role_id=role_id,
                department_id=dept_map.get(dept_name),
                position_id=pos_map.get(pos_name),
                hire_date=date(2020, 1, 1),
                status="active",
                phone=phone
            )
            db.add(employee)
            emp_count += 1
            print(f"  ✅ Created: {username} - {full_name}")
        
        db.commit()
        print(f"\n✅ Created {emp_count} employees")
        
        # Summary
        print("\n" + "="*80)
        print("✅ DATABASE RESET COMPLETE!")
        print("="*80)
        print(f"\n📊 SUMMARY:")
        print(f"   Roles: {db.query(Role).count()}")
        print(f"   Departments: {db.query(Department).count()}")
        print(f"   Positions: {db.query(Position).count()}")
        print(f"   Employees: {db.query(Employee).count()}")
        
        print(f"\n🔑 LOGIN CREDENTIALS (any of 5 accounts):")
        employees = db.query(Employee).all()
        for emp in employees:
            print(f"   Username: {emp.username} | Password: hrm@1")
        
        print("\n" + "="*80)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed_full()
