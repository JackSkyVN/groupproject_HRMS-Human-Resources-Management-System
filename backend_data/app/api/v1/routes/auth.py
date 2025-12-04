from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import get_db
from app.models.rbac import User, UserRole, Role
from app.auth.deps import get_current_user

router = APIRouter()

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserProfileResponse(BaseModel):
    id: int
    email: str
    roles: list[str]

class LogoutResponse(BaseModel):
    message: str

@router.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """User login endpoint."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    token_data = {"sub": str(user.id), "exp": expire}
    token = jwt.encode(token_data, settings.secret_key, algorithm=settings.algorithm)
    
    return TokenResponse(access_token=token)

@router.post("/auth/logout", response_model=LogoutResponse)
def logout(current_user: User = Depends(get_current_user)):
    """User logout endpoint (client should remove token)."""
    return LogoutResponse(message="Logged out successfully")

@router.get("/auth/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile with roles."""
    # Get user roles
    user_roles = db.query(UserRole).filter(UserRole.user_id == current_user.id).all()
    role_ids = [ur.role_id for ur in user_roles]
    roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
    role_names = [role.name for role in roles]
    
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        roles=role_names
    )

@router.get("/auth/verify")
def verify_token(current_user: User = Depends(get_current_user)):
    """Verify if token is valid."""
    return {"valid": True, "user_id": current_user.id}
