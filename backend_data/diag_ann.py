from app.core.database import SessionLocal
from app.models.notification import Notification
from app.models.employees import Employee
from sqlalchemy import select

def diag():
    db = SessionLocal()
    try:
        # Check all notifications
        stmt = select(Notification)
        res = db.execute(stmt).scalars().all()
        print(f"Total notifications: {len(res)}")
        for n in res:
            print(f"ID: {n.notification_id}, Title: {n.title}, Type: {n.type}, Target: {n.target_type}, Sender: {n.sender_id}")
            
        # Check employees
        emp_stmt = select(Employee)
        emps = db.execute(emp_stmt).scalars().all()
        print(f"Total employees: {len(emps)}")
        for e in emps:
            print(f"ID: {e.employee_id}, Name: {e.full_name}, Dept: {e.department_id}, Role: {e.role_id}")
            
    finally:
        db.close()

if __name__ == "__main__":
    diag()
