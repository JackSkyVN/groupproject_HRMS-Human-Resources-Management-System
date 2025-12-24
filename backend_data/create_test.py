"""Quick create test user"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

# Hash password
hashed = pwd_context.hash("admin123")

# Insert test user
with engine.connect() as conn:
    # Delete if exists
    conn.execute(text("DELETE FROM users WHERE email = 'test@finova.vn'"))
    conn.commit()
    
    # Insert new
    conn.execute(text("""
        INSERT INTO users (email, username, hashed_password, is_active, is_superuser)
        VALUES ('test@finova.vn', 'test', :pwd, true, true)
    """), {"pwd": hashed})
    conn.commit()

print("✅ Test user created!")
print("Email: test@finova.vn")
print("Username: test")
print("Password: admin123")
