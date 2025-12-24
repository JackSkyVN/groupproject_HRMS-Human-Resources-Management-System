import csv
import os
import sys
import random
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import date

sys.path.append(os.getcwd())

from app.core.database import SessionLocal, engine, Base
from app.models.org import Employee, Department, Position
from app.models.rbac import User, Role, UserRole, Permission, RolePermission
from app.models.attendance import Attendance

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_data():
    Base.metadata.drop_all(bind=engine) # WARNING: This deletes all data!
    print("Tạo các bảng cơ sở dữ liệu...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding data from db/data_employee.csv...")
        
        # Ensure Roles Exist
        for r_name in ["employee", "admin", "hr", "director"]:
            r = db.query(Role).filter(Role.name == r_name).first()
            if not r:
                r = Role(name=r_name)
                db.add(r)
        db.commit()

        # Cấp quyền
        all_permissions = [
            "employee.view", "employee.create", "employee.edit", "employee.delete",
            "hr.create", "hr.edit", "hr.delete",
            "payroll.view", "payroll.manage",
            "leave.view", "leave.request", "leave.approve",
            "announcement.view", "announcement.create", "announcement.delete",
            "system.manage"
        ]

        # 2. Tạo Quyền trong DB
        perm_objs = {}
        for code in all_permissions:
            p = db.query(Permission).filter(Permission.code == code).first()
            if not p:
                p = Permission(code=code)
                db.add(p)
                db.commit()
                db.refresh(p)
            perm_objs[code] = p

        # 3. Assign Permissions to Roles
        
        # Helper to assign perms
        def assign_perms(role_name, perms):
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role: return
            db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
            db.commit()
            for code in perms:
                 p_obj = perm_objs.get(code)
                 if p_obj:
                     db.add(RolePermission(role_id=role.id, permission_id=p_obj.id))
            db.commit()

        # Admin (IT): System + Create HR + View Employee + Announcement (NO DELETE)
        assign_perms("admin", ["system.manage", "hr.create", "employee.view", "announcement.view", "announcement.create", "announcement.delete", "payroll.view"])
        
        # HR: Full Employee + HR + Payroll + Leave + Announcement (HAS DELETE)
        assign_perms("hr", [
            "employee.view", "employee.create", "employee.edit", "employee.delete",
            "hr.create", "hr.edit", "hr.delete",
            "payroll.view", "payroll.manage",
            "leave.view", "leave.request", "leave.approve",
            "announcement.view", "announcement.create", "announcement.delete"
        ])
        
        # Director: Full Access but NO DELETE (User Request)
        assign_perms("director", [
            "employee.view", "employee.create", "employee.edit",
            "hr.create", "hr.edit", "hr.delete",
            "payroll.view", "payroll.manage",
            "leave.view", "leave.request", "leave.approve",
            "announcement.view", "announcement.create", "announcement.delete",
            "system.manage"
        ])
        
        # Employee
        assign_perms("employee", ["employee.view", "leave.view", "leave.request", "payroll.view", "announcement.view"])
        
        
        # 4. Import CSV
        csv_path = os.path.join("..", "db", "data_employee.csv")
        if not os.path.exists(csv_path):
            print(f"Error: CSV not found at {csv_path}")
            return

        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                full_name = row.get("Full Name")
                pos_name = row.get("Position") or ""
                dept_name = row.get("Department").strip() if row.get("Department") else ""
                
                username = row.get("Username")
                
                # Filter: 5 Core Users (Admin + 4 Board Members)
                target_users = ["to1979714", "truong1979746", "pham1973439", "tran1975778", "le1984949"]
                if username not in target_users:
                     # print(f"Skipping {username}") 
                     continue
                print(f"SEEDING CORE USER: {username}")

                password_raw = row.get("Password")
                if not username or not password_raw: continue

                email = username # Using username as email/login

                if db.query(User).filter(User.email == email).first(): continue

                # Department
                dept = db.query(Department).filter(Department.name == dept_name).first()
                if not dept:
                    dept = Department(name=dept_name)
                    db.add(dept)
                    db.commit()
                    db.refresh(dept)
                
                # Position
                pos = db.query(Position).filter(Position.name == pos_name).first()
                if not pos:
                    pos = Position(name=pos_name)
                    db.add(pos)
                    db.commit()
                    db.refresh(pos)

                # Determine Role
                role_name = "employee"
                if "Director" in pos_name: # Director or Deputy Director
                    role_name = "director"
                elif dept_name == "IT Department":
                    role_name = "admin"
                elif dept_name == "Finance - Accounting Department":
                    role_name = "hr"
                
                # Determine Fixed Salary
                base_salary = 0
                if dept_name == "IT Department":
                    base_salary = 3500 # Director/Admin Salary
                elif dept_name == "Finance - Accounting Department" or dept_name == "HR Department":
                    base_salary = 2300 # HR Salary
                elif dept_name == "Members' Council" or dept_name == "Board of General Directors" or dept_name == "Board of Directors":
                    base_salary = 5000 # Executive Salary
                
                # Create User
                user = User(email=email, hashed_password=get_password_hash(password_raw))
                db.add(user)
                db.commit()
                db.refresh(user)

                # Assign Role
                role_obj = db.query(Role).filter(Role.name == role_name).first()
                if role_obj:
                    db.add(UserRole(user_id=user.id, role_id=role_obj.id))
                    db.commit()

                phone = row.get("Phone/ID")
                
                # Create Employee Record
                employee = Employee(
                    user_id=user.id,
                    full_name=full_name,
                    department_id=dept.id,
                    position_id=pos.id,
                    status="Active",
                    email=email,
                    hire_date=date(2020, 1, 1), 
                    salary=base_salary,
                    phone=phone
                )
                db.add(employee)
                db.commit()

        print("Đã seed thành công.")

    except Exception as e:
        print(f"Lỗi khi seed dữ liệu: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
