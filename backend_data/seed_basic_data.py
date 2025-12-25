"""
Quick seed - Create basic departments and positions manually
"""
from app.core.database import SessionLocal
from app.models.departments import Department
from app.models.positions import Position

db = SessionLocal()

try:
    # Basic Departments
    basic_departments = [
        ("IT Department", "IT"),
        ("HR Department", "HR"),
        ("Finance Department", "FIN"),
        ("Sales Department", "SALES"),
        ("Marketing Department", "MKT"),
        ("Operations Department", "OPS"),
        ("Engineering Department", "ENG"),
        ("Customer Service", "CS")
    ]
    
    # Basic Positions
    basic_positions = [
        "Director",
        "Manager",
        "Team Lead",
        "Senior Staff",
        "Staff",
        "Junior Staff",
        "Intern",
        "Specialist",
        "Analyst",
        "Coordinator"
    ]
    
    dept_count = 0
    pos_count = 0
    
    # Insert Departments
    for dept_name, dept_code in basic_departments:
        existing = db.query(Department).filter(Department.department_name == dept_name).first()
        if not existing:
            dept = Department(
                department_name=dept_name,
                department_code=dept_code,
                is_active=True
            )
            db.add(dept)
            dept_count += 1
            print(f"✅ Created department: {dept_name}")
        else:
            print(f"  Department '{dept_name}' already exists")
    
    db.flush()
    
    # Insert Positions
    for pos_name in basic_positions:
        existing = db.query(Position).filter(Position.position_name == pos_name).first()
        if not existing:
            pos = Position(
                position_name=pos_name,
                department_id=None  # Generic
            )
            db.add(pos)
            pos_count += 1
            print(f"✅ Created position: {pos_name}")
        else:
            print(f"  Position '{pos_name}' already exists")
    
    db.commit()
    
    print(f"\n✅ SUCCESS!")
    print(f"Created {dept_count} new departments")
    print(f"Created {pos_count} new positions")
    print(f"\nTotal departments: {db.query(Department).count()}")
    print(f"Total positions: {db.query(Position).count()}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
