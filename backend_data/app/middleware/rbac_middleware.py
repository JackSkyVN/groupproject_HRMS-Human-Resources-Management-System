from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.core.security import decode_access_token
from app.services.rbac_service import RBACService
from typing import Optional

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    return {"user_id": user_id, "payload": payload}


def require_permission(resource: str, action: str):
    """Decorator to require specific permission for an endpoint."""
    async def permission_checker(
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        user_id = current_user["user_id"]
        has_permission = RBACService.check_permission(db, user_id, resource, action)
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {action} on {resource}"
            )
        
        return current_user
    
    return permission_checker


def require_view(resource: str):
    """Require view permission."""
    return require_permission(resource, "view")


def require_edit(resource: str):
    """Require edit permission."""
    return require_permission(resource, "edit")


def require_export(resource: str):
    """Require export permission."""
    return require_permission(resource, "export")


def require_delete(resource: str):
    """Require delete permission."""
    return require_permission(resource, "delete")

