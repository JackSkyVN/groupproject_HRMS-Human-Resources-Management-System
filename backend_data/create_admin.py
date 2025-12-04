import sys
import os

# Add the current directory to sys.path to ensure imports work
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from app.models.rbac import User, Role, UserRole
from app.core.config import settings

# Database Config
# We use the settings from config, but ensure we use localhost for the script running on host
DATABASE_URL = f"postgresql://{settings.postgres_user}:{settings.postgres_password}@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    print(f"Connecting to DB: {DATABASE_URL}")
    db = SessionLocal()
    try:
        # Check if admin exists
        user = db.query(User).filter(User.email == "admin").first()
        if user:
            print("User 'admin' already exists.")
        else:
            # Create Admin User
            print("Creating user 'admin'...")
            hashed_password = pwd_context.hash("admin")
            new_user = User(email="admin", hashed_password=hashed_password)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            print("User 'admin' created successfully!")
            user = new_user

        # Create Admin Role if not exists
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            print("Creating role 'admin'...")
            admin_role = Role(name="admin")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            print("Role 'admin' created.")

        # Assign Role
        user_role = db.query(UserRole).filter(UserRole.user_id == user.id, UserRole.role_id == admin_role.id).first()
        if not user_role:
            print("Assigning 'admin' role to user...")
            user_role = UserRole(user_id=user.id, role_id=admin_role.id)
            db.add(user_role)
            db.commit()
            print("Role 'admin' assigned to user 'admin'.")
        else:
            print("User 'admin' already has 'admin' role.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
