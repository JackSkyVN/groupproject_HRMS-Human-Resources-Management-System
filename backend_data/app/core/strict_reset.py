from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.rbac import User, UserRole, Role
from app.models.org import Employee
from sqlalchemy import not_

def reset_to_strict_baseline():
    """
    Absolutely enforces the 'Strict 5' baseline by deleting ALL other users/employees.
    Baseline: to1979714, truong1979746, tran1975778, pham1973439, le1984949
    """
    from app.models.attendance import Attendance
    from app.models.leaves import LeaveRequest, LeaveBalance
    from app.models.payroll import PayrollRecord
    from app.models.contracts import Contract
    from app.models.notification import Notification
    from app.models.performance import PerformanceKPI, PerformanceReview
    from app.models.announcement import Announcement

    db = SessionLocal()
    try:
        # Whitelist (Just the core IDs)
        whitelist = ["to1979714", "truong1979746", "tran1975778", "pham1973439", "le1984949"]
        
        print("\n" + "!"*40)
        print("[STRICT RESET] TRIGGERED - ENFORCING BASELINE")
        
        # 0. Clear Cache
        try:
            from app.core.cache import cache_delete_pattern
            cache_delete_pattern("hrms:*")
        except: pass

        # 0.5 Drop Tables to handle schema changes (late_minutes, etc)
        from app.core.database import engine, Base
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS attendance CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS leave_requests CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS payroll_records CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS announcements CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS notifications CASCADE"))
            conn.commit()
        
        # Recreate tables with new schema
        Base.metadata.create_all(bind=engine)
        print("[STRICT RESET] Tables dropped and recreated.")

        # 1. Identify Safe IDs and Roles
        safe_user_ids = []
        safe_emp_ids = []
        
        # Ensure Roles exist
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
                # Standardize
                if "@" not in u.email: u.email = f"{username}@finova.vn"
                
                # SPECIAL: Ensure to1979714 has ADMIN role
                if username == "to1979714":
                    admin_role_id = role_map["admin"]
                    # Check if already has it
                    if not db.query(UserRole).filter(UserRole.user_id == u.id, UserRole.role_id == admin_role_id).first():
                        db.add(UserRole(user_id=u.id, role_id=admin_role_id))
                        print(f"[STRICT RESET] Assigned ADMIN role to {username}")

                emp = db.query(Employee).filter(Employee.user_id == u.id).first()
                if emp:
                    safe_emp_ids.append(emp.id)
                    if "@" not in (emp.email or ""): emp.email = u.email
                    # Mark as VIP to exempt from strict attendance rules
                    emp.important_employee = True
                    
                    # ENFORCE FIXED SALARY BASELINE
                    if username == "truong1979746": emp.salary = 5500 # Chairman
                    elif username == "pham1973439": emp.salary = 5000 # General Director
                    elif username in ["le1984949", "tran1975778"]: emp.salary = 4500 # Council Members
                    elif username == "to1979714": emp.salary = 1500 # Admin/IT Dept

        # 2. BRUTE FORCE DELETE RELATED (Non-safe)
        # Use direct SQLAlchemy core deletion to avoid ORM overhead/hooks
        db.query(Notification).filter(not_(Notification.user_id.in_(safe_user_ids))).delete(synchronize_session=False)
        db.query(Attendance).filter(not_(Attendance.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(LeaveRequest).filter(not_(LeaveRequest.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(LeaveBalance).filter(not_(LeaveBalance.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(PayrollRecord).filter(not_(PayrollRecord.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(Contract).filter(not_(Contract.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(PerformanceKPI).filter(not_(PerformanceKPI.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(PerformanceReview).filter(not_(PerformanceReview.employee_id.in_(safe_emp_ids))).delete(synchronize_session=False)
        db.query(Announcement).delete(synchronize_session=False) # Clear all announcements for a fresh start
        
        # 3. Cleanup Employees
        deleted_emps = db.query(Employee).filter(not_(Employee.id.in_(safe_emp_ids))).delete(synchronize_session=False)
        
        # 4. Cleanup UserRoles & Users
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
