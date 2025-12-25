from app.core.database import engine
from sqlalchemy import text

def fix():
    with engine.connect() as conn:
        print("Adding is_hidden column to notification_recipient...")
        try:
            conn.execute(text("ALTER TABLE notification_recipient ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Error or already exists: {e}")

if __name__ == "__main__":
    fix()
