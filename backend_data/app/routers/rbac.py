from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.schemas.user_schema import UserPermissionsResponse, PermissionResponse, RoleResponse
from app.middleware.rbac_middleware import get_current_user, require_view, require_edit
from app.services.rbac_service import RBACService

router = APIRouter(prefix="/rbac", tags=["RBAC"])


@router.get("/permissions", response_model=UserPermissionsResponse)
async def get_my_permissions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get permissions for the current user."""
    user_id = current_user["user_id"]
    permissions = RBACService.get_user_permissions(db, user_id)
    roles = RBACService.get_user_roles(db, user_id)
    
    return UserPermissionsResponse(
        user_id=user_id,
        roles=roles,
        permissions=[PermissionResponse(**p) for p in permissions]
    )


@router.get("/check-permission/{resource}/{action}")
async def check_permission(
    resource: str,
    action: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if current user has a specific permission."""
    user_id = current_user["user_id"]
    has_permission = RBACService.check_permission(db, user_id, resource, action)
    
    return {
        "has_permission": has_permission,
        "resource": resource,
        "action": action
    }


@router.post("/assign-role/{user_id}/{role_name}")
async def assign_role_to_user(
    user_id: int,
    role_name: str,
    current_user: dict = Depends(require_edit("users")),
    db: Session = Depends(get_db)
):
    """Assign a role to a user (requires edit permission on users)."""
    success = RBACService.assign_role_to_user(db, user_id, role_name)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or role not found"
        )
    
    return {"message": f"Role '{role_name}' assigned to user {user_id}"}


@router.post("/create-role")
async def create_role_with_permissions(
    role_name: str,
    resource: str,
    permissions: List[str],
    current_user: dict = Depends(require_edit("roles")),
    db: Session = Depends(get_db)
):
    """Create a role with specified permissions (requires edit permission on roles)."""
    role = RBACService.create_role_with_permissions(db, role_name, resource, permissions)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create role"
        )
    
    return {"message": f"Role '{role_name}' created with permissions", "role_id": role.id}

