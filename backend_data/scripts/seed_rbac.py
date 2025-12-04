from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.core.database import SessionLocal
from app.models.rbac import Role, Permission, RolePermission, User, UserRole

def seed():
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    db: Session = SessionLocal()
    try:
        # Permissions relevant to your scope
        perms = [
            "attendance.view",
            "attendance.edit",
            "attendance.export",
            "system.reset",
            "system.backup",
            "system.restore",
        ]
        existing = {p.code for p in db.query(Permission).all()}
        for code in perms:
            if code not in existing:
                db.add(Permission(code=code))
        db.commit()

        admin = db.query(Role).filter(Role.name == "admin").first()
        if not admin:
            admin = Role(name="admin")
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Attach all permissions to admin
        perm_map = {p.code: p for p in db.query(Permission).all()}
        for code in perms:
            perm = perm_map[code]
            exists = (
                db.query(RolePermission)
                .filter(RolePermission.role_id == admin.id, RolePermission.permission_id == perm.id)
                .first()
            )
            if not exists:
                db.add(RolePermission(role_id=admin.id, permission_id=perm.id))
        db.commit()

        # Create admin user if missing
        user = db.query(User).filter(User.email == "admin@example.com").first()
        if not user:
            hashed = pwd.hash("admin123")
            user = User(email="admin@example.com", hashed_password=hashed)
            db.add(user)
            db.commit()
            db.refresh(user)

        # Link admin role to admin user
        exists = (
            db.query(UserRole)
            .filter(UserRole.user_id == user.id, UserRole.role_id == admin.id)
            .first()
        )
        if not exists:
            db.add(UserRole(user_id=user.id, role_id=admin.id))
            db.commit()
        print("Seed completed: admin@example.com / admin123")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
