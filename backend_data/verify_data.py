import sqlite3
import os

db_path = 'hrms.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT employee_id, work_date, check_in_time, check_out_time, late_minutes, early_leave_minutes, status FROM attendance LIMIT 5")
    rows = cursor.fetchall()
    print("ATTENDANCE DATA DUMP:")
    for r in rows:
        print(r)
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
