from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
import math

from app.core.database import get_db
from app.models.employees import Employee
from app.models.attendance import Attendance
from app.models.payroll import Payroll
from app.models.departments import Department
from app.models.roles import Role
from app.auth.deps import get_current_employee

router = APIRouter()

# ==================== SCHEMAS ====================

class PayrollOut(BaseModel):
    payroll_id: int
    employee_id: int
    employee_name: str
    month: int
    year: int
    basic_salary: float
    actual_days: float
    overtime_hours: float
    bonus: float
    deduction: float
    gross_salary: float
    net_salary: float
    status: str
    payment_date: Optional[date] = None

    class Config:
        from_attributes = True

class PayrollCreate(BaseModel):
    employee_id: int
    month: int
    year: int
    basic_salary: float
    actual_days: float = 0
    overtime_hours: float = 0
    bonus: float = 0
    allowance: float = 0
    deduction: float = 0

# ==================== HELPERS ====================

def sync_employee_payroll(db: Session, emp: Employee, month: int, year: int):
    """Calculate and sync payroll for a specific month."""
    # Tự động tính lương dựa trên quy tắc USD:
    # - Tháng chuẩn: 24 ngày
    # - Ngày thực tế = Ngày công + Nghỉ phép có lương (Max 3)
    # - OT: (Lương cơ bản / 192 giờ) x 1.5
    # - Phạt đi muộn: Tăng dần theo block 5 phút
    # - Phạt nghỉ không phép: Lần 1: trừ 2 ngày, Lần 2: trừ 5 ngày.
    # - Phụ cấp: $80
    # - Thuế: 10%
    from app.models.leave_request import LeaveRequest
    from app.models.leave_type import LeaveType

    start_date = date(year, month, 1)
    if month == 12: end_date = date(year + 1, 1, 1)
    else: end_date = date(year, month + 1, 1)
        
    attendance_records = db.query(Attendance).filter(
        Attendance.employee_id == emp.employee_id,
        Attendance.work_date >= start_date,
        Attendance.work_date < end_date
    ).order_by(Attendance.work_date).all()
    
    # 1. Chỉ số cơ bản
    work_days = len([a for a in attendance_records if a.check_in_time and a.status != 'absent'])
    total_ot_hours = sum([float(a.overtime_hours or 0) for a in attendance_records])
    
    # 2. Nghỉ phép có lương (Max 3 ngày/tháng)
    leave_stmt = select(func.sum(LeaveRequest.total_days)).join(LeaveType).where(
        LeaveRequest.employee_id == emp.employee_id,
        LeaveRequest.status == 'approved',
        LeaveType.is_paid == True,
        func.extract('month', LeaveRequest.start_date) == month,
        func.extract('year', LeaveRequest.start_date) == year
    )
    paid_leave_days = float(db.execute(leave_stmt).scalar() or 0)
    if paid_leave_days > 3.0: paid_leave_days = 3.0 # Giới hạn 3 ngày
    
    actual_days = work_days + paid_leave_days
    
    # 2. Cách tính lương chuẩn
    # Tháng chuẩn: 24 ngày làm việc
    # Tổng giờ chuẩn: 24 ngày * 8 giờ = 192 giờ
    base_contract = float(emp.salary or 2000)
    daily_rate = base_contract / 24.0
    hourly_rate = base_contract / 192.0
    base_earned = actual_days * daily_rate
    
    # 3. Các khoản phạt (Phân tích theo minutes để chính xác tuyệt đối)
    total_lateness_minutes = sum([(a.late_minutes or 0) + (a.early_leave_minutes or 0) for a in attendance_records])
    total_penalty = float(total_lateness_minutes) * (hourly_rate / 60.0)
    
    # Đếm số lần vi phạm nghiêm trọng (>30 phút) để cảnh báo
    severe_lateness_count = len([a for a in attendance_records if (a.late_minutes or 0) + (a.early_leave_minutes or 0) > 30])
    
    # Cảnh báo nếu vi phạm quá 3 lần
    if severe_lateness_count >= 3:
        from app.models.notification import Notification
        notif_title = f"⚠️ LATENESS WARNING: {emp.full_name}"
        existing = db.query(Notification).filter(
            Notification.title == notif_title,
            func.extract('month', Notification.created_at) == month,
            func.extract('year', Notification.created_at) == year
        ).first()
        
        if not existing:
            # Thông báo cho Admin/HR
            for role_id in [1, 2, 3]:
                db.add(Notification(
                    title=f"⚠️ LATENESS WARNING: {emp.full_name}",
                    message=f"Employee {emp.full_name} ({emp.employee_code}) has {severe_lateness_count} severe violations (>30 mins). Needs review.",
                    type="urgent",
                    sender_id=None,  # Hệ thống
                    target_type="role",
                    target_role_id=role_id
                ))
    
    # Phát hiện ngày công còn thiếu (Vắng mặt không phép)
    # Lấy danh sách tất cả các ngày làm việc (T2-T7) trong tháng
    all_work_days = []
    curr = start_date
    while curr < end_date:
        if curr.weekday() != 6: # Khác Chủ Nhật
            all_work_days.append(curr)
        curr += timedelta(days=1)
    
    # Ngày đã đi làm (Có check-in)
    present_dates = [a.work_date for a in attendance_records if a.check_in_time and a.status != 'absent']
    # Phân tích ngày nghỉ phép đã phê duyệt để loại trừ khỏi diện vắng mặt
    from app.models.leave_request import LeaveRequest
    approved_leave_dates = db.query(LeaveRequest.start_date, LeaveRequest.end_date).where(
        LeaveRequest.employee_id == emp.employee_id,
        LeaveRequest.status == 'approved',
        # Chỉ xét các đơn nghỉ có giao thoa với tháng hiện tại
        LeaveRequest.start_date < end_date,
        LeaveRequest.end_date >= start_date
    ).all()
    
    leave_date_range = []
    for s_date, e_date in approved_leave_dates:
        curr_d = max(s_date, start_date)
        last_d = min(e_date, end_date - timedelta(days=1))
        while curr_d <= last_d:
            leave_date_range.append(curr_d)
            curr_d += timedelta(days=1)
            
    # Những ngày làm việc mà không đi làm và không xin phép
    absences_unauthorized = [d for d in all_work_days if d not in present_dates and d not in leave_date_range]
    abs_count = len(absences_unauthorized)
    
    # Khấu trừ vắng mặt: Trừ thêm 1 ngày lương cho mỗi ngày nghỉ không phép
    absence_deduction = float(abs_count) * daily_rate
    
    # CHÍNH SÁCH VẮNG MẶT: Cảnh báo HR
    if abs_count >= 3:
        # Nếu nghỉ >= 3 ngày không phép, khấu trừ toàn bộ lương cơ bản tháng đó (Chính sách kỷ luật)
        absence_deduction = base_earned 
        
        # Kiểm tra nếu đã gửi thông báo rồi
        from app.models.notification import Notification
        notif_title = f"❗ ABSENCE WARNING: {emp.full_name}"
        existing = db.query(Notification).filter(
            Notification.title == notif_title,
            func.extract('month', Notification.created_at) == month,
            func.extract('year', Notification.created_at) == year
        ).first()
        
        if not existing:
            # Thông báo cho Admin/HR
            for role_id in [1, 2, 3]:
                db.add(Notification(
                    title=f"❗ ABSENCE WARNING: {emp.full_name}",
                    message=f"Employee {emp.full_name} ({emp.employee_code}) has {abs_count} unauthorized absences. Action required.",
                    type="urgent",
                    sender_id=None, # Hệ thống
                    target_type="role",
                    target_role_id=role_id
                ))

    # 4. Tổng kết (Mô hình Khấu trừ để hiển thị minh bạch các thành phần)
    # Lương cơ bản tính theo ngày (tiền công thực tế)
    earned_base = actual_days * daily_rate
    
    # Phụ cấp hiển thị cố định $80/tháng
    allowance = 80.0
    ot_pay = total_ot_hours * hourly_rate * 1.5 
    
    # Thu nhập tính thuế (Gross for Tax): 
    # Tính trên phần lương thực làm + Phụ cấp cố định (để dòng Thuế luôn hiện đúng -10% của khoản này)
    gross_for_tax = earned_base + allowance + ot_pay
    tax = gross_for_tax * 0.1
    
    # Khấu trừ chuyên cần (Attendance Deduction):
    # - Bao gồm phần phụ cấp bị thâm hụt do nghỉ làm (đã trừ đi phần thuế tương ứng)
    unworked_days = 24.0 - actual_days
    if unworked_days < 0: unworked_days = 0
    unearned_allowance_net = (unworked_days * (80.0 / 24.0)) * 0.9 # Net vì thuế đã tính ở trên
    
    # - Tổng khấu trừ = (Phạt đi muộn) + (Phạt kỷ luật nghỉ không phép) + (Thâm hụt phụ cấp)
    total_deduction = total_penalty + absence_deduction + unearned_allowance_net
    
    # Lương thực lĩnh (Net)
    net = gross_for_tax - tax - total_deduction
    if net < 0: net = 0
    
    # Ghi đè gross để frontend hiển thị đúng dòng Thuế (10% của gross_for_tax)
    gross = gross_for_tax
    
    # CHẨN ĐOÁN: Ghi log
    try:
        with open("payroll_sync.log", "a", encoding="utf-8") as f:
            f.write(f"DEBUG: Emp {emp.employee_id} | {month}/{year} | Earned: {earned_base} | GrossTax: {gross_for_tax} | Tax: {tax} | Penalty: {total_deduction} | Net: {net}\n")
    except:
        pass
    
    existing = db.query(Payroll).filter(
        Payroll.employee_id == emp.employee_id,
        Payroll.month == month,
        Payroll.year == year
    ).first()
    
    if existing:
        if existing.status == 'paid': return existing # Không cập nhật nếu đã thanh toán
        existing.basic_salary = base_contract
        existing.actual_days = actual_days
        existing.overtime_hours = total_ot_hours
        existing.bonus = ot_pay
        existing.allowance = allowance
        existing.deduction = total_deduction
        existing.gross_salary = round(gross, 2)
        existing.net_salary = round(net, 2)
        return existing
    else:
        new_p = Payroll(
            employee_id=emp.employee_id,
            month=month,
            year=year,
            basic_salary=base_contract,
            actual_days=actual_days,
            overtime_hours=total_ot_hours,
            bonus=ot_pay,
            allowance=allowance,
            deduction=total_deduction,
            gross_salary=round(gross, 2),
            net_salary=round(net, 2),
            status="draft"
        )
        db.add(new_p)
        return new_p

# ==================== ROUTES ====================

@router.get("")
async def list_payroll(
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee),
    employee_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 200 # Increased limit for better auto-rendering
):
    """List payroll records with auto-sync."""
    current_role = db.get(Role, current_employee.role_id)
    level = current_role.role_level if current_role else 4

    # --- TỰ ĐỘNG ĐỒNG BỘ CHO THÁNG MỤC TIÊU ---
    target_month = month or datetime.now().month
    target_year = year or datetime.now().year
    
    if level <= 2: # Admin sync tất cả nhân viên active
        employees = db.query(Employee).filter(Employee.status == 'active').all()
        for emp in employees:
            sync_employee_payroll(db, emp, target_month, target_year)
    else: # Nhân viên chỉ sync chính mình
        sync_employee_payroll(db, current_employee, target_month, target_year)
    
    db.commit()

    # --- TRUY VẤN KẾT QUẢ ---
    # Sử dụng db.query để lấy bảng lương
    query = db.query(Payroll).join(Employee, Payroll.employee_id == Employee.employee_id)

    if level > 3:
        # Nhân viên thường chỉ thấy của bản thân
        query = query.filter(Payroll.employee_id == current_employee.employee_id)
        
        # BUSINESS LOGIC: Only show payroll from hire month onwards
        if current_employee.hire_date:
            hire_year = current_employee.hire_date.year
            hire_month = current_employee.hire_date.month
            query = query.filter(
                (Payroll.year > hire_year) | 
                ((Payroll.year == hire_year) & (Payroll.month >= hire_month))
            )

    if employee_id:
        query = query.filter(Payroll.employee_id == employee_id)
        
        # BUSINESS LOGIC: Filter by target employee's hire date
        target_emp = db.get(Employee, employee_id)
        if target_emp and target_emp.hire_date:
            hire_year = target_emp.hire_date.year
            hire_month = target_emp.hire_date.month
            query = query.filter(
                (Payroll.year > hire_year) | 
                ((Payroll.year == hire_year) & (Payroll.month >= hire_month))
            )
            
    if month:
        query = query.filter(Payroll.month == month)
    if year:
        query = query.filter(Payroll.year == year)

    results = query.order_by(Payroll.year.desc(), Payroll.month.desc()).offset(skip).limit(limit).all()
    
    output = []
    for p in results:
        emp = p.employee
        dept = emp.department if emp else None
        output.append({
            "payroll_id": p.payroll_id,
            "employee_id": emp.employee_id,
            "employee_name": emp.full_name,
            "employee_dept": dept.department_name,
            "month": p.month,
            "year": p.year,
            "basic_salary": float(p.basic_salary or 0),
            "actual_days": float(p.actual_days or 0),
            "overtime_hours": float(p.overtime_hours or 0),
            "bonus": float(p.bonus or 0),
            "deduction": float(p.deduction or 0),
            "gross_salary": float(p.gross_salary or 0),
            "net_salary": float(p.net_salary or 0),
            "status": p.status,
            "payment_date": p.payment_date
        })
    return output

@router.post("/generate")
async def generate_payroll_batch(
    month: int = Query(...),
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Legacy endpoint. Payroll is now auto-triggered on view."""
    return {"ok": True, "message": "Payroll is now automatically processed on view."}

@router.patch("/{payroll_id}/pay")
async def pay_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(get_current_employee)
):
    """Mark a payroll record as paid."""
    current_role = db.get(Role, current_employee.role_id)
    if current_role.role_level > 2:
        raise HTTPException(status_code=403, detail="Only Admin or HR General can mark payroll as paid")

    p = db.get(Payroll, payroll_id)
    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    p.status = "paid"
    p.payment_date = date.today()
    db.commit()
    return {"ok": True, "message": "Marked as paid"}
