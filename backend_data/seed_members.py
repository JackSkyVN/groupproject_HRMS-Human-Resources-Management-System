import csv
import os
import sys
from sqlalchemy.orm import Session
from passlib.context import CryptContext

sys.path.append(os.getcwd())

from app.core.database import SessionLocal, engine, Base
from app.models.org import Employee, Department, Position
from app.models.rbac import User, Role, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_members():
    db = SessionLocal()
    try:
        csv_path = os.path.join("..", "db", "important_employee.csv")
        print(f"Reading from: {csv_path}")
        
        if not os.path.exists(csv_path):
            print("CSV not found!")
            return

        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                dept_name = row.get("Department").strip()
                # ONLY Seed Members' Council and Board of General Directors if missing
                # STRICT 5 BASELINE ONLY
                whitelist = ["truong1979746", "tran1975778", "pham1973439", "le1984949"]
                username = row.get("Username")

                if username not in whitelist:
                    # print(f"Skipping member {username}")
                    continue
                print(f"SEEDING MEMBER: {username}")
                email = username 
                password_raw = row.get("Password")
                full_name = row.get("Full Name")
                pos_name = row.get("Position")

                # Check if User exists
                if db.query(User).filter(User.email == email).first():
                    print(f"User {username} already exists. Skipping.")
                    continue

                print(f"Seeding: {username} - {dept_name}")

                # Ensure Dept
                dept = db.query(Department).filter(Department.name == dept_name).first()
                if not dept:
                    dept = Department(name=dept_name)
                    db.add(dept)
                    db.commit()
                    db.refresh(dept)

                # Ensure Position
                pos = db.query(Position).filter(Position.name == pos_name).first()
                if not pos:
                    pos = Position(name=pos_name)
                    db.add(pos)
                    db.commit()
                    db.refresh(pos)

                # Create User
                user = User(email=email, hashed_password=get_password_hash(password_raw))
                db.add(user)
                db.commit()
                db.refresh(user)

                # Assign Role: Director
                role = db.query(Role).filter(Role.name == "director").first()
                if role:
                    db.add(UserRole(user_id=user.id, role_id=role.id))
                    db.commit()

                # Create Employee
                emp = Employee(
                    user_id=user.id,
                    full_name=full_name,
                    department_id=dept.id,
                    position_id=pos.id,
                    email=email,
                    status="Active",
                    salary=0, # Leaders might not have tracked salary here or it's high
                    important_employee=True # They are important
                )
                db.add(emp)
                db.commit()
                count += 1
            
            print(f"Seeded {count} new leaders.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_members()
