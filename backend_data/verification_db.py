"""
Verify database structure and data
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect
from app.core.database import engine, SessionLocal
from app.models import *


def verify_tables():
    """Check if all tables exist"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    expected_tables = [
        'roles', 'departments', 'positions', 'employees',
        'attendance', 'work_schedule',
        'leave_type', 'leave_request', 'leave_balance',
        'salary_component', 'payroll', 'payroll_detail',
        'notification', 'notification_recipient'
    ]
    
    print("=" * 50)
    print("DATABASE VERIFICATION")
    print("=" * 50)
    
    print(f"\nTotal tables: {len(tables)}")
    print(f"Expected tables: {len(expected_tables)}")
    
    missing = [t for t in expected_tables if t not in tables]
    extra = [t for t in tables if t not in expected_tables]
    
    if missing:
        print(f"\n✗ Missing tables: {missing}")
    else:
        print("\n✓ All expected tables exist")
    
    if extra:
        print(f"  Extra tables: {extra}")
    
    return len(missing) == 0


def verify_data():
    """Check if sample data exists"""
    db = SessionLocal()
    
    try:
        roles_count = db.query(Role).count()
        depts_count = db.query(Department).count()
        employees_count = db.query(Employee).count()
        leave_types_count = db.query(LeaveType).count()
        salary_comp_count = db.query(SalaryComponent).count()
        
        print("\n" + "-" * 50)
        print("DATA COUNTS")
        print("-" * 50)
        print(f"Roles:              {roles_count} (expected: 4)")
        print(f"Departments:        {depts_count} (expected: 3)")
        print(f"Employees:          {employees_count} (expected: 5)")
        print(f"Leave Types:        {leave_types_count} (expected: 3)")
        print(f"Salary Components:  {salary_comp_count} (expected: 5)")
        
        if employees_count > 0:
            print("\n" + "-" * 50)
            print("SAMPLE EMPLOYEES")
            print("-" * 50)
            employees = db.query(Employee).all()
            for emp in employees:
                role_name = emp.role.role_name if emp.role else "None"
                dept_name = emp.department.department_name if emp.department else "None"
                print(f"{emp.employee_code:10} | {emp.full_name:25} | {role_name:15} | {dept_name}")
        
        print("\n" + "=" * 50)
        if roles_count == 4 and depts_count == 3 and employees_count >= 5:
            print("✓ DATABASE VERIFIED SUCCESSFULLY!")
        else:
            print("⚠ Some data is missing. Run 'python scripts/seed_data.py'")
        print("=" * 50)
        
    finally:
        db.close()


def main():
    if verify_tables():
        verify_data()


if __name__ == "__main__":
    main()
