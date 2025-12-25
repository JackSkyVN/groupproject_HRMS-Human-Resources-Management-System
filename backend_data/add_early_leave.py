import psycopg2
from app.core.config import settings

def update_schema():
    conn = psycopg2.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        database=settings.postgres_db,
        user=settings.postgres_user,
        password=settings.postgres_password
    )
    cur = conn.cursor()
    
    print("Adding 'early_leave_minutes' column to 'attendance' table...")
    
    cur.execute("""
        SELECT count(*) FROM information_schema.columns 
        WHERE table_name='attendance' AND column_name='early_leave_minutes';
    """)
    if cur.fetchone()[0] == 0:
        cur.execute("ALTER TABLE attendance ADD COLUMN early_leave_minutes INTEGER DEFAULT 0 NOT NULL;")
        print("Column added.")
    else:
        print("Column already exists.")
            
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    update_schema()
