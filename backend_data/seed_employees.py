import csv
import os
import sys
import random
from sqlalchemy.orm import Session
from passlib.context import CryptContext

sys.path.append(os.getcwd())

from app.core.database import SessionLocal, engine, Base
from app.models.org import Employee, Department, Position
from app.models.rbac import User, Role, UserRole
from app.models.attendance import Attendance

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_data():
    Base.metadata.drop_all(bind=engine)
    print("Tạo các bảng cơ sở dữ liệu...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding data from db/data_employee.csv...")
        
        employee_role = db.query(Role).filter(Role.name == "employee").first()
        if not employee_role:
            employee_role = Role(name="employee")
            db.add(employee_role)
            db.commit()
            
        
        # Cấp quyền
        all_permissions = [
            # Quản lý nhân viên
            "employee.view", "employee.create", "employee.edit", "employee.delete",
            # Lương
            "payroll.view", "payroll.manage",
            # Nghỉ phép
            "leave.view", "leave.request", "leave.approve",
            # Thông báo
            "announcement.view", "announcement.create",
            # Hệ thống
            "system.manage"
        ]

        # 2. Tạo Quyền trong DB
        from app.models.rbac import Permission, RolePermission
        
        perm_objs = {}
        for code in all_permissions:
            p = db.query(Permission).filter(Permission.code == code).first()
            if not p:
                p = Permission(code=code)
                db.add(p)
                db.commit()
                db.refresh(p)
            perm_objs[code] = p

        #  Gán Quyền Role
        admin_role = db.query(Role).filter(Role.name == "admin").first()         # Admin được cấp toàn bộ quyền
        if not admin_role:
             admin_role = Role(name="admin")
             db.add(admin_role)
             db.commit()

        if admin_role:
            for code, p_obj in perm_objs.items():
                link = db.query(RolePermission).filter(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == p_obj.id
                ).first()
                if not link:
                    link = RolePermission(role_id=admin_role.id, permission_id=p_obj.id)
                    db.add(link)
            db.commit()

        
        employee_role = db.query(Role).filter(Role.name == "employee").first() # Nhân viên chỉ được xem/gửi yêu cầu
        if employee_role:
            basic_perms = ["employee.view", "leave.view", "leave.request", "payroll.view", "announcement.view"]
            for code in basic_perms:
                p_obj = perm_objs.get(code)
                if p_obj:
                    link = db.query(RolePermission).filter(
                        RolePermission.role_id == employee_role.id,
                        RolePermission.permission_id == p_obj.id
                    ).first()
                    if not link:
                        link = RolePermission(role_id=employee_role.id, permission_id=p_obj.id)
                        db.add(link)
            db.commit()
        
        important_ids = set()
        important_csv_path = os.path.join("..", "db", "important_employee.csv")
        if os.path.exists(important_csv_path):
            with open(important_csv_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    eid = row.get("Employee ID")
                    if eid:
                        important_ids.add(eid)


        csv_path = os.path.join("..", "db", "data_employee.csv")
        if not os.path.exists(csv_path):
            print(f"Error: CSV not found at {csv_path}")
            return

        created_count = 0
        sample_credentials = []

        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                
                emp_id_str = row.get("Employee ID")
                full_name = row.get("Full Name")
                pos_name = row.get("Position")
                pos_name = row.get("Position")
                dept_name = row.get("Department").strip() if row.get("Department") else ""
                dob_str = row.get("Date of Birth")
                dob_str = row.get("Date of Birth")
                phone = row.get("Phone/ID")
                username = row.get("Username")
                password_raw = row.get("Password")
                
                if not username or not password_raw:
                    continue

                email = username

                if db.query(User).filter(User.email == email).first():
                    continue

                dept = db.query(Department).filter(Department.name == dept_name).first() #Phòng ban 
                if not dept:
                    dept = Department(name=dept_name)
                    db.add(dept)
                    db.commit()
                    db.refresh(dept)
                
                pos = db.query(Position).filter(Position.name == pos_name).first()  #Chức vụ
                if not pos:
                    pos = Position(name=pos_name)
                    db.add(pos)
                    db.commit()
                    db.refresh(pos)

                # Tạo User
                hashed_pw = get_password_hash(password_raw)
                user = User(email=email, hashed_password=hashed_pw)
                db.add(user)
                db.commit()
                db.refresh(user)

                is_important = emp_id_str in important_ids

                
                admin_departments = [
                    "HR Department", 
                    "IT Department"
                ]

                is_admin = dept_name in admin_departments
                role_name = "admin" if is_admin else "employee"
                
                role_obj = db.query(Role).filter(Role.name == role_name).first()
                if not role_obj:
                    role_obj = Role(name=role_name)
                    db.add(role_obj)
                    db.commit()
                
                if is_admin:
                    pass

                user_role = UserRole(user_id=user.id, role_id=role_obj.id)
                db.add(user_role)

                from datetime import datetime
                dob = None
                if dob_str:
                    try:
                        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
                    except:
                        pass

                employee = Employee(
                    user_id=user.id,
                    full_name=full_name,
                    department_id=dept.id,
                    position_id=pos.id,
                    date_of_birth=dob,
                    phone=phone,
                    status="Active",
                    email=email,
                    hire_date=datetime.now().date(),
                    important_employee=is_important
                )
                db.add(employee)
                db.commit()
                
                created_count += 1
                sample_credentials.append((email, password_raw))

        print("Đã seed thành công.")
        
        if sample_credentials:
            selected = random.choice(sample_credentials)
           
            
            with open("test_credentials.txt", "w", encoding="utf-8") as f:
                f.write(f"Email: {selected[0]}\nPassword: {selected[1]}")

    except Exception as e:
        print(f"Lỗi khi seed dữ liệu: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
