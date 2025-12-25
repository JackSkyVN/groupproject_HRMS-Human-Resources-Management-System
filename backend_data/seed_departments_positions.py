"""
Seed full departments and positions from CSV
Keeps the admin account created by direct_insert_admin.py
"""
import csv
import os
from app.core.database import SessionLocal
from app.models.departments import Department
from app.models.positions import Position

db = SessionLocal()

try:
    # CSV path
    csv_path = os.path.join("..", "db", "data_employee.csv")
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV not found at {csv_path}")
        exit(1)
    
    departments_set = set()
    positions_set = set()
    
    # Read from CSV
    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dept_name = row.get("Department", "").strip()
            pos_name = row.get("Position", "").strip()
            
            if dept_name:
                departments_set.add(dept_name)
            if pos_name:
                positions_set.add(pos_name)
    
    print(f"Found {len(departments_set)} unique departments")
    print(f"Found {len(positions_set)} unique positions")
    
    # Insert Departments
    dept_count = 0
    dept_id_counter = 2  # Start from 2 since Management is 1
    
    for dept_name in sorted(departments_set):
        # Skip if already exists
        existing = db.query(Department).filter(Department.department_name == dept_name).first()
        if existing:
            print(f"  Department '{dept_name}' already exists, skipping")
            continue
        
        # Generate simple unique code: DEPT001, DEPT002, etc.
        dept_code = f"DEPT{dept_id_counter:03d}"
        
        dept = Department(
            department_name=dept_name,
            department_code=dept_code,
            is_active=True
        )
        db.add(dept)
        dept_count += 1
        dept_id_counter += 1
        print(f"  ✅ Created department: {dept_name} ({dept_code})")
    
    db.flush()
    
    # Insert Positions
    pos_count = 0
    for pos_name in sorted(positions_set):
        # Skip if already exists
        existing = db.query(Position).filter(Position.position_name == pos_name).first()
        if existing:
            print(f"  Position '{pos_name}' already exists, skipping")
            continue
        
        pos = Position(
            position_name=pos_name,
            department_id=None  # Generic position, not tied to specific department
        )
        db.add(pos)
        pos_count += 1
        print(f"  ✅ Created position: {pos_name}")
    
    db.commit()
    
    print(f"\n✅ SUCCESS!")
    print(f"Created {dept_count} departments")
    print(f"Created {pos_count} positions")
    print(f"\nTotal departments: {db.query(Department).count()}")
    print(f"Total positions: {db.query(Position).count()}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
