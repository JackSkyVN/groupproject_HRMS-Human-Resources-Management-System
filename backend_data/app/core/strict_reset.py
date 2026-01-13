from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.rbac import User, UserRole, Role
from app.models.org import Employee
from sqlalchemy import not_

def reset_to_strict_baseline():
    # Reset database về trạng thái ban đầu với 5 user cơ bản
    from app.models.attendance import Attendance
    from app.models.leaves import LeaveRequest, LeaveBalance
    from app.models.payroll import PayrollRecord
    from app.models.contracts import Contract
    from app.models.notification import Notification
    from app.models.performance import PerformanceKPI, PerformanceReview
    from app.models.announcement import Announcement

    db = SessionLocal()
    try:
        # Danh sách user cơ bản (whitelist)
        whitelist = ["to1979714", "truong1979746", "tran1975778", "pham1973439", "le1984949"]
        
        print("\n" + "!"*40)
        print("[STRICT RESET] TRIGGERED - ENFORCING BASELINE")
        
        # 0. Xóa cache
        try:
            from app.core.cache import cache_delete_pattern
            cache_delete_pattern("hrms:*")
        except: pass

        # 0.5 Xóa các bảng để xử lý thay đổi schema
        from app.core.database import engine, Base
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS attendance CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS leave_requests CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS payroll_records CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS announcements CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS notifications CASCADE"))
            conn.commit()
        
        # Tạo lại các bảng với schema mới
        Base.metadata.create_all(bind=engine)
        print("[STRICT RESET] Tables dropped and recreated.")

        # 1. Xác định các ID an toàn và Roles
        safe_user_ids = []
        safe_emp_ids = []
        
        # Đảm bảo các Roles tồn tại
        role_map = {}
        for r_name in ["admin", "hr", "director", "employee"]:
            role = db.query(Role).filter(Role.name == r_name).first()
            if not role:
                role = Role(name=r_name)
                db.add(role)
                db.flush()
            role_map[r_name] = role.id

        all_users = db.query(User).all()
        for u in all_users:
            username = u.email.split('@')[0] if "@" in u.email else u.email
            if username in whitelist:
                safe_user_ids.append(u.id)
                # Chuẩn hóa email
                if "@" not in u.email: u.email = f"{username}@finova.vn"
                
                # Đặc biệt: Đảm bảo to1979714 có role ADMIN
                if username == "to1979714":
                    admin_role_id = role_map["admin"]
                    # Kiểm tra xem đã có role chưa
                    if not db.query(UserRole).filter(UserRole.user_id == u.id, UserRole.role_id == admin_role_id).first():
                        db.add(UserRole(user_id=u.id, role_id=admin_role_id))
                        print(f"[STRICT RESET] Assigned ADMIN role to {username}")

                emp = db.query(Employee).filter(Employee.user_id == u.id).first()
                if emp:
                    safe_emp_ids.append(emp.id)
                    if "@" not in (emp.email or ""): emp.email = u.email
                    # Đánh dấu là VIP để miễn kiểm tra chấm công nghiêm ngặt
                    emp.important_employee = True
                    
                    # THIẾT LẬP LƯƠNG CỐ ĐỊNH
                    if username == "truong1979746": emp.salary = 5500  # Chủ tịch
                    elif username == "pham1973439": emp.salary = 5000  # Tổng giám đốc
                    elif username in ["le1984949", "tran1975778"]: emp.salary = 4500  # Thành viên hội đồng
                    elif username == "to1979714": emp.salary = 1500  # Admin/IT

        # 2. XÓA TẤT CẢ DỮ LIỆU LIÊN QUAN (không an toàn)
        # Sử dụng SQLAlchemy core để tránh ORM overhead
        db.query(Notification).filter(not_(Notification.user_id.in_(safe_user_ids))).delete(synchronize_session=False)
        db.query(Attendance).filter(not_(Attendance.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(LeaveRequest).filter(not_(LeaveRequest.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(LeaveBalance).filter(not_(LeaveBalance.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(PayrollRecord).filter(not_(PayrollRecord.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(Contract).filter(not_(Contract.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(PerformanceKPI).filter(not_(PerformanceKPI.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(PerformanceReview).filter(not_(PerformanceReview.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(Announcement).delete(synchronize_session=False)  # Xóa tất cả thông báo
        
        # 3. Dọn dẹp Employees
        deleted_emps = db.query(Employee).filter(not_(Employee.id.in_(safe_emp_ids))).delete(synchronize_session=False)
        
        # 4. Dọn dẹp UserRoles & Users
        db.query(UserRole).filter(not_(UserRole.user_id.in_(safe_user_ids))).delete(synchronize_session=False)
        deleted_users = db.query(User).filter(not_(User.id.in_(safe_user_ids))).delete(synchronize_session=False)
        
        db.commit()
        print(f"[STRICT RESET] Purged {deleted_users} users and {deleted_emps} employees.")
        print("[STRICT RESET] Baseline Enforcement Complete.")
        print("!"*40 + "\n")
        
    except Exception as e:
        print(f"[STRICT RESET ERROR] {e}")
        db.rollback()
    finally:
        db.close()
