from app.core.database import SessionLocal
from app.models.employees import Employee
from app.models.attendance import Attendance
from app.models.payroll import Payroll
import datetime

db = SessionLocal()
active_count = db.query(Employee).filter(Employee.status == "active").count()
total_att = db.query(Attendance).count()
total_pay = db.query(Payroll).count()

print(f"Active Employees: {active_count}")
print(f"Total Attendance: {total_att}")
print(f"Total Payroll: {total_pay}")

# Check current month records
now = datetime.datetime.now()
dec_pay = db.query(Payroll).filter(Payroll.month == now.month, Payroll.year == now.year).count()
print(f"Payroll for Dec 2025: {dec_pay}")

db.close()
