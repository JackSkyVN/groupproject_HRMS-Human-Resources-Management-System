from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    username: str
    password: str


class PermissionResponse(BaseModel):
    resource: str
    action: str
    name: str


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    permissions: List[PermissionResponse]


class UserPermissionsResponse(BaseModel):
    user_id: int
    roles: List[str]
    permissions: List[PermissionResponse]

