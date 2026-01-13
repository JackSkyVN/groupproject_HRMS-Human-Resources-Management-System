/**
 * Module Dashboard Nhân Viên - Giao diện chuyên biệt cho Nhân Viên Level 4
 * Yêu cầu: Chấm Công AI, Đơn Xin Nghỉ, Bảng Lương, Thông Báo
 */

import { getState } from '../core/state.js';
import { checkIn, checkOut } from '../core/api.js';

export function renderEmployeeDashboard() {
    const appData = getState();
    const user = appData.currentUser || {};

    // Chấm công hôm nay cho employee cụ thể này
    const today = new Date().toISOString().split('T')[0];
    const myRecord = (appData.attendance || []).find(a => a.date === today && a.employeeId === user.id);

    return `
        <div class="page-header">
            <h1>Welcome, ${user.full_name || 'Employee'}</h1>
            <p style="color: #64748b;">Member of ${user.department_name || 'N/A'}</p>
        </div>

        <!-- Lưới Dashboard -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
            
            <!-- 1. PHẦN CHẤM CÔNG AI -->
            <div class="card" style="margin-bottom: 0;">
                <div class="card-header">
                    <h2 class="card-title">Attendance (Today)</h2>
                </div>
                <div style="padding: 24px;">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${renderShiftStatus('Main Shift', myRecord?.checkIn, myRecord?.checkOut, myRecord?.status)}
                        ${renderShiftStatus('OT Shift', myRecord?.otCheckIn, myRecord?.otCheckOut, myRecord?.otStatus)}
                        
                        <div style="display: flex; gap: 12px; margin-top: 8px;">
                            <button onclick="handleCheckIn()" class="btn btn-primary" style="flex: 1; justify-content: center; font-weight: 600;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg> Check In
                            </button>
                            <button onclick="handleCheckOut()" class="btn btn-secondary" style="flex: 1; justify-content: center; font-weight: 600;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                                    <polyline points="9 11 12 14 22 4"></polyline>
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                </svg> Check Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. PHẦN THÔNG BÁO -->
            <div class="card" style="margin-bottom: 0;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 class="card-title">Announcements</h2>
                    <button onclick="navigateTo('announcements')" class="btn btn-outline" style="font-size: 12px; padding: 4px 12px;">View All</button>
                </div>
                <div style="padding: 16px; max-height: 280px; overflow-y: auto;">
                    ${renderRecentAnnouncements(appData.announcements || [])}
                </div>
            </div>

            <!-- 3. PHẦN TỔNG HỢP BẢNG LƯƠNG -->
            <div class="card" style="margin-bottom: 0;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 class="card-title">My Payroll</h2>
                    <button onclick="navigateTo('payroll')" class="btn btn-outline" style="font-size: 12px; padding: 4px 12px;">History</button>
                </div>
                <div style="padding: 24px;">
                    ${renderPayrollSummary(appData.payroll || [])}
                </div>
            </div>

            <!-- 4. PHẦN YÊU CẦU NGHỊ PHÉP -->
            <div class="card" style="margin-bottom: 0;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 class="card-title">Leave Balance</h2>
                    <button onclick="navigateTo('leaves')" class="btn btn-primary" style="font-size: 12px; padding: 4px 12px;">New Request</button>
                </div>
                <div style="padding: 24px;">
                    ${renderLeaveSummary(appData.leaveRequests || [])}
                </div>
            </div>

        </div>

        <style>
            .employee-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
            .employee-stat-row:last-child { border-bottom: none; }
            .stat-label { color: #64748b; font-size: 14px; }
            .stat-value { font-weight: 600; color: #1e293b; }
            .announcement-item { padding: 12px; border-radius: 8px; background: #f8fafc; margin-bottom: 8px; border-left: 4px solid #3b82f6; }
            .announcement-item h4 { margin: 0 0 4px 0; font-size: 14px; color: #1e293b; }
            .announcement-item p { margin: 0; font-size: 12px; color: #64748b; }
        </style>
    `;
}

function renderShiftStatus(title, cin, cout, status) {
    const hasIn = cin && cin !== '-';
    const isOT = title.includes('OT');

    let bgColor = '#f8fafc';
    let textColor = '#64748b';
    let borderColor = '#e2e8f0';
    let statusText = status || 'Not Recording';

    if (hasIn) {
        bgColor = cout && cout !== '-' ? '#f0fdf4' : '#eff6ff';
        borderColor = cout && cout !== '-' ? '#bbf7d0' : '#c7d2fe';
        textColor = cout && cout !== '-' ? '#15803d' : '#4338ca';
    } else if (status === 'absent') {
        bgColor = '#fef2f2';
        borderColor = '#fecaca';
        textColor = '#991b1b';
    }

    return `
        <div style="padding: 16px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; font-weight: 700; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.05em;">${title}</span>
                <span class="badge ${status === 'late' ? 'badge-warning' : (hasIn ? 'badge-success' : 'badge-secondary')}" style="font-size: 10px;">${statusText}</span>
            </div>
            <div style="display: flex; gap: 20px;">
                <div style="flex: 1;">
                    <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 2px;">CHECK IN</span>
                    <span style="font-size: 16px; font-weight: 600; color: #1e293b;">${cin || '--:--'}</span>
                </div>
                <div style="flex: 1;">
                    <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 2px;">CHECK OUT</span>
                    <span style="font-size: 16px; font-weight: 600; color: #1e293b;">${cout || '--:--'}</span>
                </div>
            </div>
        </div>
    `;
}

function renderRecentAnnouncements(announcements) {
    if (!announcements.length) return '<div style="text-align: center; color: #94a3b8; padding: 20px;">No recent announcements</div>';

    return announcements.slice(0, 5).map(a => `
        <div class="announcement-item">
            <h4>${a.title}</h4>
            <p>${a.content?.substring(0, 80)}${a.content?.length > 80 ? '...' : ''}</p>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${new Date(a.createdAt).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function renderPayrollSummary(payrollList) {
    // Lấy bảng lương mới nhất
    const latest = payrollList.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0];

    if (!latest) return '<div style="text-align: center; color: #94a3b8; padding: 20px;">No payroll records found</div>';

    return `
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
            <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">Latest Month: ${latest.month}/${latest.year}</div>
            <div style="font-size: 28px; font-weight: 700;">$${latest.net_salary.toLocaleString()}</div>
            <div style="font-size: 13px; margin-top: 8px;"><span style="color: #10b981;">●</span> Available for payout</div>
        </div>
        <div class="employee-stat-row">
            <span class="stat-label">Basic Salary</span>
            <span class="stat-value">$${latest.basic_salary}</span>
        </div>
        <div class="employee-stat-row">
            <span class="stat-label">Overtime (${latest.overtime_hours}h)</span>
            <span class="stat-value">+$${(latest.overtime_hours * 20).toLocaleString()}</span>
        </div>
    `;
}

function renderLeaveSummary(leaves) {
    const approved = leaves.filter(l => l.status === 'approved');
    const used = approved.reduce((sum, l) => sum + (l.totalDays || 0), 0);
    const balance = 12 - used;

    return `
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="flex: 1; text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">12</div>
                <div style="font-size: 11px; color: #64748b;">Annual Limit</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 20px; font-weight: 700; color: #10b981;">${used}</div>
                <div style="font-size: 11px; color: #64748b;">Used</div>
            </div>
            <div style="flex: 1; text-align: center; padding: 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="font-size: 20px; font-weight: 700; color: #2563eb;">${balance}</div>
                <div style="font-size: 11px; color: #64748b;">Balance</div>
            </div>
        </div>
        <div style="font-size: 12px; color: #64748b;">
            <strong>Recent Status:</strong> 
            ${leaves.length > 0 ? `<span class="badge ${leaves[0].status === 'approved' ? 'badge-success' : 'badge-warning'}">${leaves[0].status}</span> (${leaves[0].startDate})` : 'No requests yet'}
        </div>
    `;
}
