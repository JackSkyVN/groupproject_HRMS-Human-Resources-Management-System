"""
Reset database - Drop all tables and recreate
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base
from app.models import *  # Import all models


def reset_database():
    print("=" * 50)
    print("RESETTING DATABASE")
    print("=" * 50)
    
    print("\n1. Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("   ✓ All tables dropped")
    
    print("\n2. Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("   ✓ All tables created")
    
    print("\n" + "=" * 50)
    print("✓ DATABASE RESET COMPLETE!")
    print("=" * 50)
    print("\nNext step: Run 'python scripts/seed_data.py' to populate data")


if __name__ == "__main__":
    reset_database()
