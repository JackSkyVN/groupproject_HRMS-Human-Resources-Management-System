/**
 * Module Dashboard - Tổng quan và Hoạt động gần đây
 */

import { getState } from '../core/state.js';
import { checkIn, checkOut } from '../core/api.js';
import { showToast } from '../utils/toast.js';

export function renderDashboard() {
    try {
        const appData = getState();
        const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

        // Hiển thị trạng thái loading nếu đang tải dữ liệu ban đầu
        if (appData.isInitialLoading) {
            return `
                <div class="page-header"><h1>Loading Dashboard...</h1></div>
                <div class="stats-grid">
                    <div class="stat-card" style="opacity: 0.5; filter: blur(2px);"> <div class="stat-value">...</div> </div>
                    <div class="stat-card" style="opacity: 0.5; filter: blur(2px);"> <div class="stat-value">...</div> </div>
                    <div class="stat-card" style="opacity: 0.5; filter: blur(2px);"> <div class="stat-value">...</div> </div>
                    <div class="stat-card" style="opacity: 0.5; filter: blur(2px);"> <div class="stat-value">...</div> </div>
                </div>
            `;
        }

        const employees = appData.employees || [];
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(e => e.status === 'active').length;
        const pendingLeaves = (appData.leaveRequests || []).filter(l => l.status === 'pending').length;

        // Thống kê chấm công hôm nay
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRecords = (appData.attendance || []).filter(a => a.date === todayStr);

        const mainPresentToday = new Set(todayRecords
            .filter(a => a.status === 'present' || a.status === 'late')
            .map(a => a.employeeId)
        ).size;

        const otPresentToday = new Set(todayRecords
            .filter(a => a.otStatus === 'present_ot')
            .map(a => a.employeeId)
        ).size;

        const absentToday = activeEmployees - mainPresentToday;

        return `
            <div class="page-header">
                <h1>System Overview</h1>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Total Employees</span>
                        <div class="stat-icon blue">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-value">${totalEmployees}</div>
                    <div class="stat-description">${activeEmployees} active employees</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Attendance Today</span>
                       <div class="stat-icon green">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                    </div>
                    <div style="margin: 10px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">MAIN SHIFT</span>
                            <span style="font-size: 0.85rem; font-weight: 700; color: #1e293b;">${mainPresentToday} / ${activeEmployees}</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${(mainPresentToday / activeEmployees * 100) || 0}%; height: 100%; background: #10b981;"></div>
                        </div>
                    </div>
                    <div style="margin: 10px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">OT SHIFT</span>
                            <span style="font-size: 0.85rem; font-weight: 700; color: #6366f1;">${otPresentToday} Active</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${(otPresentToday / activeEmployees * 100) || 0}%; height: 100%; background: #6366f1;"></div>
                        </div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">Pending Leaves</span>
                        <div class="stat-icon yellow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-value">${pendingLeaves}</div>
                    <div class="stat-description">Waiting</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <span class="stat-title">New Announcements</span>
                        <div class="stat-icon purple">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18S18 15 18 8"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-value">${(appData.announcements || []).length}</div>
                    <div class="stat-description">Empty</div>
                </div>
            </div>

            <div class="card" style="margin-top: 20px;">
                <div class="card-header">
                    <h2 class="card-title">My Attendance (Today)</h2>
                </div>
                <div class="attendance-actions" style="padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
                    <div id="attendance-status-display" style="flex: 1;">
                        ${renderAttendanceStatus()}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; gap: 12px;">
                            <button id="main-checkin-btn" onclick="handleCheckIn()" class="btn btn-primary" style="background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; padding: 12px 24px; font-weight: 600;">Check In</button>
                            <button id="main-checkout-btn" onclick="handleCheckOut()" class="btn btn-secondary" style="padding: 12px 24px; font-weight: 600;">Check Out</button>
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b; text-align: right;">
                            <a href="#" onclick="window.navigateTo('myprofile/registration'); return false;" style="color: #6366f1; text-decoration: none; font-weight: 600;">Register Face ID →</a>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 350px; gap: 24px; margin-bottom: 24px;">
                <div class="card" style="margin-bottom: 0;">
                    <div class="card-header">
                        <h2 class="card-title">Recent Activity</h2>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Action</th>
                                    <th>Detail</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="recent-activity-body">
                                ${renderRecentActivity()}
                            </tbody>
                        </table>
                    </div>
                </div>

                ${roleLevel <= 1 ? `
                <div class="card" style="margin-bottom: 0; background: #fafafa;">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 class="card-title" style="color: #1e293b; font-size: 1rem;">
                            <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite;"></span>
                            Currently Working
                        </h2>
                        <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">LIVE</span>
                    </div>
                    <div id="team-working-status" style="max-height: 400px; overflow-y: auto; padding: 10px 0;">
                        ${renderTeamWorkingStatus()}
                    </div>
                </div>
                ` : ''}
            </div>

            <style>
                @keyframes pulse-green {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
            </style>
        `;
    } catch (error) {
        console.error('[Dashboard] Render Error:', error);
        return `<div class="card" style="padding:20px; color:red;">Dashboard Error: ${error.message}</div>`;
    }
}

function renderAttendanceStatus() {
    try {
        const appData = getState();
        const today = new Date().toISOString().split('T')[0];
        const myId = appData.currentUser?.id;

        const myRecord = (appData.attendance || []).find(a => a.date === today && a.employeeId === myId);

        if (!myRecord) {
            return '<div style="font-size: 1.1rem; font-weight: 500; color: #64748b;">No attendance recorded today</div>';
        }

        const renderShift = (title, cin, cout, status) => {
            const isAbsent = status === 'absent' || status === 'absent_ot';
            const bgColor = isAbsent ? '#fef2f2' : (cout !== '-' ? '#f0fdf4' : '#eff6ff');
            const borderColor = isAbsent ? '#fecaca' : (cout !== '-' ? '#bbf7d0' : '#c7d2fe');
            const textColor = isAbsent ? '#991b1b' : (cout !== '-' ? '#15803d' : '#4338ca');

            return `
                <div style="flex: 1; padding: 12px 16px; background: ${bgColor}; border-radius: 10px; border: 1px solid ${borderColor}; min-width: 180px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${textColor}; letter-spacing: 0.05em; text-transform: uppercase;">${title}</span>
                        ${status ? `<span class="badge ${isAbsent ? 'badge-danger' : 'badge-success'}" style="font-size: 10px; padding: 2px 8px;">${status}</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="flex: 1;">
                            <span style="font-size: 0.65rem; color: #94a3b8; display: block;">IN</span>
                            <span style="font-size: 1rem; font-weight: 600; color: #1e293b;">${cin}</span>
                        </div>
                        <div style="width: 1px; height: 20px; background: ${borderColor};"></div>
                        <div style="flex: 1;">
                            <span style="font-size: 0.65rem; color: #94a3b8; display: block;">OUT</span>
                            <span style="font-size: 1rem; font-weight: 600; color: #1e293b;">${cout}</span>
                        </div>
                    </div>
                </div>
            `;
        };

        return `
            <div style="display: flex; gap: 20px; flex-wrap: wrap; width: 100%;">
                ${renderShift('Main Shift', myRecord.checkIn, myRecord.checkOut, myRecord.status)}
                ${renderShift('OT Shift', myRecord.otCheckIn, myRecord.otCheckOut, myRecord.otStatus)}
            </div>
        `;
    } catch (e) {
        return '---';
    }
}

function renderRecentActivity() {
    try {
        const appData = getState();
        let activities = [];

        // Lấy các đơn xin nghỉ gần đây nhất
        (appData.leaveRequests || []).slice(0, 5).forEach(l => {
            activities.push({
                name: l.employeeName || 'Unknown',
                action: 'Leave Request',
                detail: `${formatLeaveType(l.type)} - ${l.days || 0} days`,
                status: l.status || 'pending',
                timestamp: l.createdAt ? new Date(l.createdAt).getTime() : 0
            });
        });

        // Lấy các log chấm công gần đây nhất
        (appData.attendance || []).slice(0, 5).forEach(a => {
            activities.push({
                name: a.employeeName || 'Unknown',
                action: 'Attendance',
                detail: `In: ${a.checkIn || '-'} | Out: ${a.checkOut || '-'}`,
                status: a.status || 'present',
                timestamp: a.date ? new Date(a.date).getTime() : 0
            });
        });

        activities.sort((a, b) => b.timestamp - a.timestamp);

        if (activities.length === 0) {
            return '<tr><td colspan="4" style="text-align: center; padding: 20px;">No recent activities</td></tr>';
        }

        return activities.slice(0, 8).map(act => {
            const isSuccess = ['approved', 'present', 'present_ot'].includes(act.status);
            const isWarning = ['pending', 'late'].includes(act.status);
            const badgeClass = isSuccess ? 'success' : (isWarning ? 'warning' : 'danger');

            const statusMap = {
                'approved': 'Approved',
                'pending': 'Pending',
                'rejected': 'Rejected',
                'present': 'On Time',
                'late': 'Late',
                'absent': 'Absent',
                'present_ot': 'OT Present',
                'absent_ot': 'OT Absent'
            };

            return `
                <tr>
                    <td><strong>${act.name}</strong></td>
                    <td>${act.action}</td>
                    <td>${act.detail}</td>
                    <td><span class="badge badge-${badgeClass}">${statusMap[act.status] || act.status}</span></td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        return '<tr><td colspan="4">Error loading activities</td></tr>';
    }
}

window.handleCheckIn = function () {
    localStorage.setItem('attendance_intent', 'checkin');
    window.navigateTo('ai-attendance');
};

window.handleCheckOut = function () {
    localStorage.setItem('attendance_intent', 'checkout');
    window.navigateTo('ai-attendance');
};

function renderTeamWorkingStatus() {
    const appData = getState();
    const todayStr = new Date().toISOString().split('T')[0];

    // Lọc những ai hiện đang "In"
    // Logic: In Main nhưng chưa Out, HOẶC In OT nhưng chưa Out.
    const workingStaff = (appData.attendance || []).filter(a => {
        if (a.date !== todayStr) return false;

        const inMain = a.checkIn && a.checkIn !== '-';
        const outMain = a.checkOut && a.checkOut !== '-';
        const inOT = a.otCheckIn && a.otCheckIn !== '-';
        const outOT = a.otCheckOut && a.otCheckOut !== '-';

        return (inMain && !outMain) || (inOT && !outOT);
    });

    if (workingStaff.length === 0) {
        return `
            <div style="text-align: center; padding: 30px 20px; color: #94a3b8;">
                <p style="font-size: 0.85rem;">No employees currently active</p>
            </div>
        `;
    }

    return workingStaff.map(s => {
        const isOT = s.otCheckIn && s.otCheckIn !== '-' && (!s.otCheckOut || s.otCheckOut === '-');
        const shiftLabel = isOT ? 'OT Shift' : 'Main Shift';
        const startTime = isOT ? s.otCheckIn : s.checkIn;

        return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                <div style="width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #6366f1; font-size: 0.8rem; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    ${(s.employeeName || 'U').split(' ').pop().charAt(0)}
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 0.85rem; font-weight: 600; color: #1e293b;">${s.employeeName || '-'}</div>
                    <div style="font-size: 0.7rem; color: #64748b;">${shiftLabel} • In at ${startTime || '-'}</div>
                </div>
                <span class="badge badge-success" style="font-size: 9px; padding: 2px 6px;">Active</span>
            </div>
        `;
    }).join('');
}

function formatLeaveType(type) {
    if (!type) return 'N/A';
    const map = {
        'annual_leave': 'Annual Leave',
        'sick_leave': 'Sick Leave',
        'unpaid_leave': 'Unpaid Leave',
        'other': 'Other'
    };
    return map[type] || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
