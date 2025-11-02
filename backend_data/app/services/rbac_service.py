from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.models import User, Role, Permission, RolePermission, UserRole
from app.core.security import PermissionEnum


class RBACService:
    """Role-Based Access Control Service"""
    
    @staticmethod
    def get_user_permissions(db: Session, user_id: int) -> List[dict]:
        """Get all permissions for a user through their roles."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        permissions = []
        for user_role in user.roles:
            role = user_role.role
            for role_perm in role.permissions:
                perm = role_perm.permission
                permissions.append({
                    "resource": perm.resource,
                    "action": perm.action,
                    "name": perm.name
                })
        
        # Remove duplicates
        seen = set()
        unique_permissions = []
        for perm in permissions:
            key = (perm["resource"], perm["action"])
            if key not in seen:
                seen.add(key)
                unique_permissions.append(perm)
        
        return unique_permissions
    
    @staticmethod
    def check_permission(db: Session, user_id: int, resource: str, action: str) -> bool:
        """Check if a user has permission for a specific resource and action."""
        permissions = RBACService.get_user_permissions(db, user_id)
        for perm in permissions:
            if perm["resource"] == resource and perm["action"] == action:
                return True
        
        # Check if user is superuser
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.is_superuser:
            return True
        
        return False
    
    @staticmethod
    def has_view_permission(db: Session, user_id: int, resource: str) -> bool:
        """Check if user can view a resource."""
        return RBACService.check_permission(db, user_id, resource, "view") or \
               RBACService.check_permission(db, user_id, resource, "admin")
    
    @staticmethod
    def has_edit_permission(db: Session, user_id: int, resource: str) -> bool:
        """Check if user can edit a resource."""
        return RBACService.check_permission(db, user_id, resource, "edit") or \
               RBACService.check_permission(db, user_id, resource, "admin")
    
    @staticmethod
    def has_export_permission(db: Session, user_id: int, resource: str) -> bool:
        """Check if user can export a resource."""
        return RBACService.check_permission(db, user_id, resource, "export") or \
               RBACService.check_permission(db, user_id, resource, "admin")
    
    @staticmethod
    def has_delete_permission(db: Session, user_id: int, resource: str) -> bool:
        """Check if user can delete a resource."""
        return RBACService.check_permission(db, user_id, resource, "delete") or \
               RBACService.check_permission(db, user_id, resource, "admin")
    
    @staticmethod
    def get_user_roles(db: Session, user_id: int) -> List[str]:
        """Get all role names for a user."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        return [user_role.role.name for user_role in user.roles]
    
    @staticmethod
    def assign_role_to_user(db: Session, user_id: int, role_name: str) -> bool:
        """Assign a role to a user."""
        user = db.query(User).filter(User.id == user_id).first()
        role = db.query(Role).filter(Role.name == role_name).first()
        
        if not user or not role:
            return False
        
        # Check if already assigned
        existing = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role.id
        ).first()
        
        if existing:
            return True  # Already assigned
        
        user_role = UserRole(user_id=user_id, role_id=role.id)
        db.add(user_role)
        db.commit()
        return True
    
    @staticmethod
    def create_role_with_permissions(db: Session, role_name: str, resource: str, 
                                    permissions: List[str]) -> Optional[Role]:
        """Create a role with specified permissions for a resource."""
        # Check if role exists
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=f"Role for {resource} management")
            db.add(role)
            db.commit()
            db.refresh(role)
        
        # Add permissions
        for action in permissions:
            perm_name = f"{role_name}_{resource}_{action}"
            permission = db.query(Permission).filter(Permission.name == perm_name).first()
            
            if not permission:
                permission = Permission(
                    name=perm_name,
                    resource=resource,
                    action=action,
                    description=f"{action} permission for {resource}"
                )
                db.add(permission)
                db.commit()
                db.refresh(permission)
            
            # Link role to permission
            role_perm = db.query(RolePermission).filter(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == permission.id
            ).first()
            
            if not role_perm:
                role_perm = RolePermission(role_id=role.id, permission_id=permission.id)
                db.add(role_perm)
                db.commit()
        
        return role

