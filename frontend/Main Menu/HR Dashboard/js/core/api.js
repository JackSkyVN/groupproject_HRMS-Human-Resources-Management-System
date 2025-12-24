/**
 * API Module - All backend API calls
 */

import { API_BASE_URL } from './config.js';
import { getState, update } from './state.js';

/**
 * Get auth headers with token
 */
function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Get fetch options with headers
 */
function getFetchOptions() {
    return {
        headers: getHeaders()
    };
}

/**
 * Check if user is authenticated
 */
export function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../../Login screen/index.html';
        return false;
    }
    return true;
}

/**
 * Fetch all dashboard data (main data loader)
 */
export async function fetchDashboardData() {
    if (!checkAuth()) return;

    const appData = getState();

    try {
        // 1. Fetch current user
        console.log("Fetching Current User...");
        const meRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, getFetchOptions());
        if (meRes.ok) {
            const me = await meRes.json();
            appData.currentUser = {
                id: me.employee_id,
                full_name: me.full_name,
                email: me.email,
                username: me.username,
                role_name: me.role_name,
                role_level: me.role_level,
                department: me.department_name,
                position: me.position_name
            };
            localStorage.setItem('role_level', me.role_level);
        }

        // 2. Parallel fetch for all other data
        console.log("Fetching System Data...");
        await Promise.all([
            fetchEmployees(),
            fetchAttendance(),
            fetchLeaves(),
            fetchPayroll(),
            fetchAnnouncements()
        ]);

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        throw error;
    }
}

/**
 * Fetch employees list
 */
export async function fetchEmployees() {
    const appData = getState();
    const response = await fetch(`${API_BASE_URL}/api/v1/employees`, getFetchOptions());

    if (response.ok) {
        const employees = await response.json();
        appData.employees = employees.map(e => ({
            id: e.employee_id,
            employeeCode: e.employee_code,
            name: e.full_name,
            email: e.email,
            phone: e.phone || 'N/A',
            department: e.department_name || 'N/A',
            position: e.position_name || 'N/A',
            role: e.role_name,
            roleLevel: e.role_level,
            status: e.status
        }));

        // Update departments/positions lists for filters
        const depts = new Set();
        const positions = new Set();
        employees.forEach(e => {
            if (e.department_name) depts.add(e.department_name);
            if (e.position_name) positions.add(e.position_name);
        });
        appData.departments = Array.from(depts).map(name => ({ name }));
        appData.positions = Array.from(positions).map(name => ({ name }));
    }
}

/**
 * Fetch attendance records
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
            checkIn: a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : '-',
            checkOut: a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString() : '-',
            lateMinutes: a.late_minutes,
            overtimeHours: a.overtime_hours,
            workHours: a.work_hours,
            status: a.status
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
                baseSalary: p.basic_salary,
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
    window.location.href = '../../Login screen/index.html';
}
