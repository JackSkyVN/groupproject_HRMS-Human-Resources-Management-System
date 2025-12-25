# Import all models for Alembic autogenerate
from app.models.roles import Role
from app.models.departments import Department
from app.models.positions import Position
from app.models.employees import Employee
from app.models.attendance import Attendance
from app.models.work_schedule import WorkSchedule
from app.models.leave_type import LeaveType
from app.models.leave_request import LeaveRequest
from app.models.leave_balance import LeaveBalance
from app.models.salary_component import SalaryComponent
from app.models.payroll import Payroll
from app.models.payroll_detail import PayrollDetail
from app.models.notification import Notification
from app.models.notification_recipient import NotificationRecipient
from app.models.salary_adjustment import SalaryAdjustment

__all__ = [
    "Role",
    "Department",
    "Position",
    "Employee",
    "Attendance",
    "WorkSchedule",
    "LeaveType",
    "LeaveRequest",
    "LeaveBalance",
    "SalaryComponent",
    "Payroll",
    "PayrollDetail",
    "Notification",
    "NotificationRecipient",
    "SalaryAdjustment",
]
