import { getState } from './state.js';
import { API_BASE_URL } from './config.js';
import { formatDateToDDMMYYYY } from '../utils/helpers.js';

/**
 * Xử lý request chung với xử lý lỗi cho 401/404
 */
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getHeaders(),
                ...options.headers
            }
        });

        if (response.status === 401 || response.status === 404) {
            console.warn(`[API] Token invalid or missing (${response.status}). Logging out...`);
            logout();
            return null;
        }

        return response;
    } catch (e) {
        console.error(`[API] Network error at ${url}:`, e);
        throw e;
    }
}

function getFetchOptions(method = 'GET') {
    return {
        method,
        headers: getHeaders()
    };
}

/**
 * Lấy headers chung
 */
function getHeaders() {
    return {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Lấy tất cả employees
 */
export async function fetchEmployees() {
    const appData = getState();
    try {
        const response = await apiRequest(`${API_BASE_URL}/api/v1/employees`, getFetchOptions());
        if (response && response.ok) {
            const employees = await response.json();
            // Map backend fields đến frontend names sử dụng trong employees.js
            appData.employees = employees.map(emp => ({
                id: emp.employee_id,
                name: emp.full_name || '-',
                position: emp.position_name || 'N/A',
                department: emp.department_name || 'N/A',
                status: emp.status || 'unknown',
                roleLevel: emp.role_level || 4,
                hire_date: emp.hire_date || null
            }));
        }
    } catch (e) {
        console.error("Error fetching employees:", e);
    }
}

/**
 * Lấy thông tin profile của user hiện tại
 */
export async function fetchProfile() {
    const appData = getState();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, getFetchOptions());
        if (response.ok) {
            const user = await response.json();
            appData.currentUser = {
                ...user,
                id: user.employee_id,
                full_name: user.full_name || '-',
                role_name: user.role_name || '-',
                department_name: user.department_name || 'N/A',
                position_name: user.position_name || 'N/A',
                date_of_birth: formatDateToDDMMYYYY(user.date_of_birth) || '',
                hire_date: formatDateToDDMMYYYY(user.hire_date) || 'N/A',
                salary: user.salary ? `$${user.salary.toLocaleString()}` : 'N/A',
                phone: user.phone || '',
                profile_picture: user.profile_picture || ''
            };

            // SYNC: Đảm bảo danh sách employee toàn cục cũng được cập nhật để phản ánh thay đổi user hiện tại
            await fetchEmployees();
        }
    } catch (e) {
        console.error("Error fetching profile:", e);
    }
}

/**
 * Lấy dữ liệu tổng hợp cho dashboard
 */
export async function fetchDashboardData() {
    const appData = getState();
    appData.isInitialLoading = true;
    try {
        // Chạy tất cả các core fetches song song
        await Promise.all([
            fetchEmployees(),
            fetchProfile(),
            fetchAttendance(),
            fetchLeaves(),
            fetchPayroll(),
            fetchSalaryAdjustments(),
            fetchAnnouncements(),
            fetchMetadata()
        ]);
        appData.isInitialLoading = false;
        if (window.updateNotificationUI) window.updateNotificationUI();
    } catch (e) {
        console.error("Error fetching board data:", e);
        appData.isInitialLoading = false;
    }
}

/**
 * Lấy dữ liệu chấm công (Main + OT)
 * @param {Object} options - Filter options
 * @param {string} options.date_from - YYYY-MM-DD format
 * @param {string} options.date_to - YYYY-MM-DD format
 * @param {number} options.employee_id - Employee ID filter
 */
export async function fetchAttendance(options = {}) {
    const appData = getState();

    // Build query params
    const params = new URLSearchParams();
    if (options.date_from) params.append('date_from', options.date_from);
    if (options.date_to) params.append('date_to', options.date_to);
    if (options.employee_id) params.append('employee_id', options.employee_id);

    const url = `${API_BASE_URL}/api/v1/attendance${params.toString() ? '?' + params.toString() : ''}`;

    const response = await apiRequest(url, getFetchOptions());
    if (response && response.ok) {
        const attendance = await response.json();
        console.log(`[API] Raw attendance records received: ${attendance.length}`);

        appData.attendance = attendance.map(a => {
            const mapped = {
                id: Number(a.attendance_id),
                employeeId: Number(a.employee_id),
                employeeName: a.employee_name,
                date: a.work_date,
                checkIn: a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
                checkOut: a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
                otCheckIn: a.ot_check_in_time ? new Date(a.ot_check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
                otCheckOut: a.ot_check_out_time ? new Date(a.ot_check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
                raw_in: a.check_in_time,
                raw_out: a.check_out_time,
                raw_ot_in: a.ot_check_in_time,
                raw_ot_out: a.ot_check_out_time,
                status: a.status,
                lateMinutes: a.late_minutes,
                earlyLeaveMinutes: a.early_leave_minutes,
                workHours: a.work_hours,
                overtimeHours: a.overtime_hours,
                otStatus: a.ot_status
            };
            return mapped;
        });
        console.log(`[API] Mapped ${appData.attendance.length} attendance records.`);
    } else {
        console.error("[API] Failed to fetch attendance:", response?.status);
    }
}

/**
 * Lấy các đơn xin nghỉ phép
 */
export async function fetchLeaves() {
    const appData = getState();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/leaves`, getFetchOptions());
        if (response.ok) {
            const leaves = await response.json();
            appData.leaveRequests = leaves.map(l => ({
                id: l.request_id,
                employeeId: l.employee_id,
                employeeName: l.employee_name,
                employeeDeptId: l.employee_dept_id,
                employeeDeptName: l.employee_dept_name,
                employeeRoleLevel: l.employee_role_level,
                type: l.leave_type_name,
                startDate: l.start_date,
                endDate: l.end_date,
                days: l.total_days,
                reason: l.reason,
                status: l.status,
                approverName: l.approver_name,
                createdAt: l.created_at
            }));
        }
    } catch (e) {
        console.error("Error fetching leaves:", e);
    }
}

/**
 * Lấy dữ liệu bảng lương
 */
export async function fetchPayroll() {
    const appData = getState();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/payroll`, getFetchOptions());
        if (response.ok) {
            const payrolls = await response.json();
            appData.salaries = payrolls.map(p => ({
                id: p.payroll_id,
                employeeId: p.employee_id,
                employeeName: p.employee_name,
                employeeDept: p.employee_dept,
                month: p.month,
                year: p.year,
                basicSalary: p.basic_salary,
                actualDays: p.actual_days,
                overtimeHours: p.overtime_hours,
                bonus: p.bonus,
                deduction: p.deduction,
                grossSalary: p.gross_salary,
                netSalary: p.net_salary,
                status: p.status,
                paymentDate: p.payment_date
            }));
        }
    } catch (e) {
        console.error("Error fetching payroll:", e);
    }
}

/**
 * Đánh dấu bảng lương đã thanh toán (Chỉ Admin)
 */
export async function markPayrollAsPaid(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/payroll/${id}/pay`, {
        method: 'PATCH',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to mark as paid');
    }

    return await response.json();
}

/**
 * Lấy các thông báo
 */
export async function fetchAnnouncements() {
    const appData = getState();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/announcements`, getFetchOptions());
        if (response.ok) {
            appData.announcements = await response.json();
        }
    } catch (e) {
        console.error("Error fetching announcements:", e);
    }
}

/**
 * Xóa thông báo
 */
export async function deleteAnnouncement(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/announcements/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete announcement');
    }

    return await response.json();
}

/**
 * Lấy thông báo trong thùng rác (dismissed bởi user hiện tại)
 */
export async function fetchTrashAnnouncements() {
    const response = await fetch(`${API_BASE_URL}/api/v1/announcements/trash`, getFetchOptions());

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch trash');
    }

    return await response.json();
}

/**
 * Khôi phục thông báo từ thùng rác
 */
export async function restoreAnnouncement(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/announcements/${id}/restore`, {
        method: 'POST',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to restore announcement');
    }

    return await response.json();
}

/**
 * Ẩn/Xóa thông báo cho user hiện tại
 */
export async function dismissNotification(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/dismiss`, {
        method: 'DELETE',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to dismiss notification');
    }

    return await response.json();
}

/**
 * Cập nhật profile của user hiện tại
 * @param {Object} data - Dữ liệu profile {full_name, email}
 */
export async function updateMyProfile(data) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
    }

    const result = await response.json();
    await fetchProfile(); // Cái này cũng gọi fetchEmployees() luôn
    return result;
}

/**
 * Thay đổi mật khẩu của user hiện tại
 * @param {string} oldPassword - Mật khẩu hiện tại
 * @param {string} newPassword - Mật khẩu mới
 */
export async function changeMyPassword(oldPassword, newPassword) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to change password');
    }

    return await response.json();
}

/**
 * Lấy metadata thô (Depts và Roles với IDs)
 */
export async function fetchMetadata() {
    const appData = getState();
    try {
        const [deptRes, roleRes, posRes] = await Promise.all([
            fetch(`${API_BASE_URL}/public/departments`),
            fetch(`${API_BASE_URL}/public/roles`),
            fetch(`${API_BASE_URL}/public/positions`)
        ]);

        if (deptRes.ok) {
            const depts = await deptRes.json();
            appData.departments_raw = depts.map(d => ({ id: d.department_id, name: d.department_name }));
        }

        if (roleRes.ok) {
            const roles = await roleRes.json();
            appData.roles_raw = roles.map(r => ({ id: r.role_id, name: r.role_name, level: r.role_level }));
        }

        if (posRes.ok) {
            const positions = await posRes.json();
            appData.positions_raw = positions.map(p => ({ id: p.position_id, name: p.position_name, department_id: p.department_id }));
        }
    } catch (e) {
        console.error("Error fetching metadata:", e);
    }
}

/**
 * Tạo employee
 */
export async function createEmployee(employeeData) {
    const response = await fetch(`${API_BASE_URL}/api/v1/employees`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(employeeData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create employee');
    }

    return await response.json();
}

/**
 * Xóa employee
 */
export async function deleteEmployee(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/employees/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error('Failed to delete employee');
    }
}

/**
 * Cập nhật employee
 */
export async function updateEmployee(id, employeeData) {
    const response = await fetch(`${API_BASE_URL}/api/v1/employees/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(employeeData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update employee');
    }

    return await response.json();
}

/**
 * Lấy chi tiết employee
 */
export async function getEmployee(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/employees/${id}`, getFetchOptions());

    if (!response.ok) {
        throw new Error('Failed to fetch employee details');
    }

    return await response.json();
}

/**
 * Check in chấm công (Thủ công)
 */
export async function checkIn() {
    const response = await fetch(`${API_BASE_URL}/api/v1/attendance/check-in-manual`, {
        method: 'POST',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to check in');
    }

    return await response.json();
}

/**
 * Check out chấm công (Thủ công)
 */
export async function checkOut() {
    const response = await fetch(`${API_BASE_URL}/api/v1/attendance/check-out-manual`, {
        method: 'POST',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to check out');
    }

    return await response.json();
}

/**
 * Đăng xuất
 */
export async function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role_level');
    window.location.href = '/finova/login';
}

/**
 * Lấy các yêu cầu điều chỉnh lương
 */
export async function fetchSalaryAdjustments() {
    const appData = getState();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/salary-adjustments`, getFetchOptions());
        if (response.ok) {
            appData.salaryAdjustments = await response.json();
        }
    } catch (e) {
        console.error("Error fetching salary adjustments:", e);
    }
}

/**
 * Gửi yêu cầu điều chỉnh lương
 */
export async function submitSalaryAdjustment(data) {
    const response = await fetch(`${API_BASE_URL}/api/v1/salary-adjustments/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit request');
    }

    return await response.json();
}

/**
 * Duyệt yêu cầu điều chỉnh
 */
export async function approveSalaryAdjustment(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/salary-adjustments/${id}/approve`, {
        method: 'PATCH',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to approve');
    }

    return await response.json();
}

/**
 * Từ chối yêu cầu điều chỉnh
 */
export async function rejectSalaryAdjustment(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/salary-adjustments/${id}/reject`, {
        method: 'PATCH',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reject');
    }

    return await response.json();
}

/**
 * Helper fetch chuẩn cho các request modular
 */
export async function fetchAPI(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const res = await apiRequest(url, {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers
        }
    });
    return res ? await res.json() : null;
}

