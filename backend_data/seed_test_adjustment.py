from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Go up once to find the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.salary_adjustment import SalaryAdjustment
from app.models.employees import Employee

def seed():
    db = SessionLocal()
    try:
        # Find a test employee
        emp = db.query(Employee).first()
        if not emp:
            print("No employees found to seed adjustment for.")
            return

        # Check if already exists
        exists = db.query(SalaryAdjustment).filter(SalaryAdjustment.employee_id == emp.employee_id).first()
        if exists:
            print(f"Test adjustment already exists for {emp.full_name}")
            return

        adj = SalaryAdjustment(
            employee_id=emp.employee_id,
            requester_id=emp.employee_id, # Self requested for demo
            current_salary=emp.salary,
            target_salary=emp.salary + 500.0,
            reason="Performance boost (Seeded for testing)",
            status="pending",
            effective_date="2024-01-01"
        )
        db.add(adj)
        db.commit()
        print(f"Successfully seeded a test adjustment request for {emp.full_name}")
    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
