import { getState } from './state.js';
import { API_BASE_URL } from './config.js';

/**
 * Get standard fetch options with Auth header
 */
function getFetchOptions(method = 'GET') {
    return {
        method,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    };
}

/**
 * Get common headers
 */
function getHeaders() {
    return {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Fetch all employees
 */
export async function fetchEmployees() {
    const appData = getState();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/employees`, getFetchOptions());
        if (response.ok) {
            const employees = await response.json();
            // Map backend fields to frontend names used in employees.js
            appData.employees = employees.map(emp => ({
                id: emp.employee_id,
                name: emp.full_name,
                position: emp.position_name,
                department: emp.department_name,
                status: emp.status,
                roleLevel: emp.role_level
            }));
        }
    } catch (e) {
        console.error("Error fetching employees:", e);
    }
}

/**
 * Fetch current user profile
 */
export async function fetchProfile() {
    const appData = getState();
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, getFetchOptions());
        if (response.ok) {
            const user = await response.json();
            appData.currentUser = {
                ...user,
                id: user.employee_id
            };
        }
    } catch (e) {
        console.error("Error fetching profile:", e);
    }
}

/**
 * Fetch dashboard-specific summary data
 */
export async function fetchDashboardData() {
    const appData = getState();
    appData.isInitialLoading = true;
    try {
        // Run all core fetches in parallel
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
 * Fetch attendance data (Main + OT)
 */
export async function fetchAttendance() {
    const appData = getState();
    const response = await fetch(`${API_BASE_URL}/api/v1/attendance`, getFetchOptions());
    if (response.ok) {
        const attendance = await response.json();
        appData.attendance = attendance.map(a => ({
            id: a.attendance_id,
            employeeId: a.employee_id,
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
        }));
    }
}

/**
 * Fetch leave requests
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
 * Fetch payroll data
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
 * Mark payroll as paid (Admin only)
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
 * Fetch announcements
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
 * Delete announcement
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
 * Dismiss/Hide notification for current user
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
 * Update current user's profile
 * @param {Object} data - Profile data {full_name, email}
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

    return await response.json();
}

/**
 * Change current user's password
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
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
 * Fetch raw metadata (Depts and Roles with IDs)
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
            appData.positions_raw = positions.map(p => ({ id: p.position_id, name: p.position_name }));
        }
    } catch (e) {
        console.error("Error fetching metadata:", e);
    }
}

/**
 * Create employee
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
 * Delete employee
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
 * Update employee
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
 * Get employee detail
 */
export async function getEmployee(id) {
    const response = await fetch(`${API_BASE_URL}/api/v1/employees/${id}`, getFetchOptions());

    if (!response.ok) {
        throw new Error('Failed to fetch employee details');
    }

    return await response.json();
}

/**
 * Check in attendance (Manual)
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
 * Check out attendance (Manual)
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
 * Logout
 */
export async function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role_level');
    window.location.href = '/finova/login';
}

/**
 * Fetch salary adjustment requests
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
 * Submit salary adjustment request
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
 * Approve adjustment request
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
 * Reject adjustment request
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
