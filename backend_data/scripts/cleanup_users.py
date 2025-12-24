import sys
import os
sys.path.append(os.path.join(os.getcwd(), '..'))

from app.core.database import SessionLocal
from app.models.rbac import User, UserRole
from app.models.org import Employee
from sqlalchemy import delete

def cleanup():
    db = SessionLocal()
    try:
        users_to_cleanup = ['nguyen1977407', 'kieu1972806', 'đang1971515', 'han1981934']
        print(f"Cleaning up {len(users_to_cleanup)} extra users...")
        
        # Delete UserRole first
        db.query(UserRole).filter(UserRole.user_id.in_(
            db.query(User.id).filter(User.email.in_(users_to_cleanup))
        )).delete(synchronize_session=False)

        # Delete Employee
        db.query(Employee).filter(Employee.email.in_(users_to_cleanup)).delete(synchronize_session=False)

        # Delete User
        db.query(User).filter(User.email.in_(users_to_cleanup)).delete(synchronize_session=False)
        
        db.commit()
        print("Cleanup done.")
        
        # Verify
        remaining = db.query(User).count()
        print(f"Remaining Users: {remaining} (Should be 5)")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
