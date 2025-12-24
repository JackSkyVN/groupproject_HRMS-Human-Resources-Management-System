/**
 * Dashboard Module - Overview and Recent Activity
 */

import { getState } from '../core/state.js';
import { checkIn, checkOut } from '../core/api.js';
import { showToast } from '../utils/toast.js';

export function renderDashboard() {
    try {
        const appData = getState();
        const employees = appData.employees || [];
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(e => e.status === 'active').length;
        const pendingLeaves = (appData.leaveRequests || []).filter(l => l.status === 'pending').length;

        // Today's attendance stats
        const todayStr = new Date().toISOString().split('T')[0];
        const presentTodayCount = new Set((appData.attendance || [])
            .filter(a => a.date === todayStr && a.status !== 'absent')
            .map(a => a.employeeId)
        ).size;

        const absentToday = activeEmployees - presentTodayCount;

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
                        <span class="stat-title">Present Today</span>
                       <div class="stat-icon green">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-value" style="display: flex; align-items: baseline; gap: 8px;">
                        <span style="color: #10b981;">${presentTodayCount}</span>
                        <span style="font-size: 1rem; color: #94a3b8; font-weight: 400;">/</span>
                        <span style="color: #ef4444; font-size: 1.5rem;">${absentToday > 0 ? absentToday : 0}</span>
                    </div>
                    <div class="stat-description">${presentTodayCount} present, ${absentToday > 0 ? absentToday : 0} absent</div>
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
                    <div class="stat-description">Requests awaiting approval</div>
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
                    <div class="stat-description">Ongoing internal events</div>
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
                    <div style="display: flex; gap: 12px;">
                        <button id="main-checkin-btn" onclick="handleCheckIn()" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 12px 24px; font-weight: 600;">Check In</button>
                        <button id="main-checkout-btn" onclick="handleCheckOut()" class="btn btn-secondary" style="padding: 12px 24px; font-weight: 600;">Check Out</button>
                    </div>
                </div>
            </div>

            <div class="card">
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
                        <tbody>
                            ${renderRecentActivity()}
                        </tbody>
                    </table>
                </div>
            </div>
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

        if (!myRecord || (!myRecord.checkIn && !myRecord.checkOut)) {
            return '<div style="font-size: 1.2rem; font-weight: 500; color: #64748b;">No attendance recorded today</div>';
        }

        return `
            <div style="display: flex; gap: 15px;">
                <div style="padding: 10px 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                    <span style="font-size: 0.8rem; color: #166534; display: block; margin-bottom: 2px;">CHECK IN</span>
                    <span style="font-size: 1.1rem; font-weight: 600; color: #15803d;">${myRecord.checkIn || '--:--'}</span>
                </div>
                <div style="padding: 10px 15px; background: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe;">
                    <span style="font-size: 0.8rem; color: #3730a3; display: block; margin-bottom: 2px;">CHECK OUT</span>
                    <span style="font-size: 1.1rem; font-weight: 600; color: #4338ca;">${myRecord.checkOut || '--:--'}</span>
                </div>
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

        // Get latest leave requests
        (appData.leaveRequests || []).slice(0, 5).forEach(l => {
            activities.push({
                name: l.employeeName || 'Unknown',
                action: 'Leave Request',
                detail: `${l.type || 'N/A'} - ${l.days || 0} days`,
                status: l.status || 'pending',
                timestamp: l.createdAt ? new Date(l.createdAt).getTime() : 0
            });
        });

        // Get latest attendance logs
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
            const badgeClass = act.status === 'approved' || act.status === 'present' ? 'success' :
                act.status === 'pending' || act.status === 'late' ? 'warning' : 'danger';

            const statusMap = {
                'approved': 'Approved',
                'pending': 'Pending',
                'rejected': 'Rejected',
                'present': 'On Time',
                'late': 'Late',
                'absent': 'Absent'
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

window.handleCheckIn = async function () {
    try {
        await checkIn();
        showToast('Check in successful!', 'success');
        import('../core/api.js').then(m => m.fetchDashboardData().then(() => {
            const content = document.getElementById('content-area');
            if (content) content.innerHTML = renderDashboard();
        }));
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.handleCheckOut = async function () {
    try {
        await checkOut();
        showToast('Check out successful!', 'success');
        import('../core/api.js').then(m => m.fetchDashboardData().then(() => {
            const content = document.getElementById('content-area');
            if (content) content.innerHTML = renderDashboard();
        }));
    } catch (error) {
        showToast(error.message, 'error');
    }
};
