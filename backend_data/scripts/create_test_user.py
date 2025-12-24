"""
Create test user with simple password
"""
import sys
sys.path.insert(0, '../')

from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.database import engine, get_db
from app.models.employees import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create test user
db = next(get_db())

# Check if test user exists
existing = db.query(User).filter(User.email == "test@finova.vn").first()
if existing:
    print("Test user already exists!")
    print("Email: test@finova.vn")
    print("Password: admin123")
else:
    # Create new test user
    hashed_password = pwd_context.hash("admin123")
    
    test_user = User(
        email="test@finova.vn",
        username="test",
        hashed_password=hashed_password,
        is_active=True,
        is_superuser=True
    )
    
    db.add(test_user)
    db.commit()
    
    print("✅ Test user created!")
    print("Email: test@finova.vn")
    print("Password: admin123")

db.close()
