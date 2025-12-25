/**
 * Attendance Module - Vertically Stacked Shifts
 */

import { getState } from '../core/state.js';
import { fetchAttendance, checkIn, checkOut } from '../core/api.js';
import { showToast } from '../utils/toast.js';

function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

function formatDecimalHours(hours) {
    if (!hours || hours <= 0) return '-';
    const totalMinutes = Math.round(hours * 60);
    return formatDuration(totalMinutes);
}

export function renderAttendance(mode = 'my') {
    const title = mode === 'my' ? 'My Attendance' : 'Staff Attendance';
    const today = new Date().toISOString().split('T')[0];

    return `
        <style>
            .att-card { background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; overflow: hidden; margin-bottom: 30px; }
            .section-header { padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f1f5f9; }
            .section-title { font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
            
            /* Pro Filter Bar */
            .pro-filters { background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
            .filter-group { display: flex; flex-direction: column; gap: 8px; }
            .filter-label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.02em; }
            .pro-input { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 0.85rem; font-weight: 600; color: #1e293b; transition: all 0.2s; outline: none; }
            .pro-input:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
            
            /* Stats Ribbon */
            .stats-ribbon { display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
            .stat-mini-card { flex: 1; min-width: 150px; background: #fff; padding: 16px; border-radius: 14px; border: 1px solid #f1f5f9; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 15px; }
            .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
            .stat-val { font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 800; color: #1e293b; }
            .stat-lab { font-size: 0.75rem; font-weight: 600; color: #64748b; }

            .att-table { min-width: 100%; border-collapse: separate; border-spacing: 0; }
            .att-table th { padding: 14px 12px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #64748b; background: #fbfcfd; border-bottom: 2px solid #f1f5f9; }
            .att-table td { padding: 14px 12px; border-bottom: 1px solid #f8fafc; font-size: 0.85rem; vertical-align: middle; }
            
            .main-theme { border-left: 4px solid #10b981; }
            .main-theme .section-title { color: #15803d; }
            .ot-theme { border-left: 4px solid #3b82f6; }
            .ot-theme .section-title { color: #1e40af; }

            .badge-v { padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.7rem; }
            .badge-v-red { background: #fee2e2; color: #ef4444; }
            .sticky-col { position: sticky; background: #fff; z-index: 2; border-right: 2px solid #f1f5f9 !important; }
        </style>

        <div class="page-header" style="margin-bottom: 20px;">
            <h1>${title}</h1>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="exportAttendanceToCSV()" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Export CSV
                </button>
            </div>
        </div>

        <!-- STATS RIBBON -->
        <div class="stats-ribbon" id="att-stats-ribbon">
            ${renderAttendanceStats()}
        </div>

        <!-- LIVE ACTION SECTION (New) -->
        <div class="att-card" style="margin-bottom: 24px;">
            <div class="section-header" style="background: #f8fafc;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                <div class="section-title">Live Status & Actions</div>
            </div>
            <div style="padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
                <div id="att-page-status-display" style="flex: 1;">
                    ${renderLiveStatusOnPage()}
                </div>
                <div style="display: flex; gap: 12px;">
                    <button onclick="window.handlePageCheckIn()" class="btn btn-primary" style="background: #6366f1; border: none; padding: 12px 24px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);">Check In Now</button>
                    <button onclick="window.handlePageCheckOut()" class="btn btn-secondary" style="padding: 12px 24px; font-weight: 700; border-radius: 12px;">Check Out</button>
                </div>
            </div>
        </div>

        <!-- ADVANCED FILTERS -->
        <div class="pro-filters">
            ${mode === 'team' ? `
                <div class="filter-group">
                    <label class="filter-label">Search Employee</label>
                    <input type="text" id="filter-name" class="pro-input" placeholder="Name or ID..." oninput="applyProFilters()">
                </div>
                <div class="filter-group">
                    <label class="filter-label">Department</label>
                    <select id="filter-dept" class="pro-input" onchange="applyProFilters()">
                        <option value="">All Departments</option>
                        ${(getState().departments || []).map(d => `<option value="${d.name}">${d.name}</option>`).join('')}
                    </select>
                </div>
            ` : ''}
            <div class="filter-group">
                <label class="filter-label">Status</label>
                <select id="filter-status" class="pro-input" onchange="applyProFilters()">
                    <option value="">All Statuses</option>
                    <option value="on-time">On Time</option>
                    <option value="violation">Violation</option>
                    <option value="on-shift">On-Shift</option>
                    <option value="absent">Absent</option>
                    <option value="invalid">Invalid</option>
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Date From</label>
                <input type="date" id="filter-from" class="pro-input" onchange="applyProFilters()" max="${today}">
            </div>
            <div class="filter-group">
                <label class="filter-label">Date To</label>
                <input type="date" id="filter-to" class="pro-input" onchange="applyProFilters()" max="${today}">
            </div>
            <div class="filter-group" style="flex: 0;">
                <button class="btn btn-secondary" onclick="resetProFilters()" style="padding: 10px; height: 42px;">Reset</button>
            </div>
        </div>

        <!-- SECTION 1: MAIN SHIFT & SUMMARY -->
        <div class="att-card main-theme">
            <div class="section-header" style="background: #f0fdf450;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                <div class="section-title">Main Shift & Daily Summary (08:30 - 17:30)</div>
            </div>
            <div class="table-container" style="overflow-x: auto;">
                <table class="att-table">
                    <thead>
                        <tr>
                            ${mode === 'team' ? '<th class="sticky-col" style="left: 0; min-width: 160px;">Employee</th>' : ''}
                            <th class="sticky-col" style="${mode === 'team' ? 'left: 160px;' : 'left: 0;'} min-width: 110px;">Date</th>
                            <th style="text-align: center;">In</th>
                            <th style="text-align: center;">Out</th>
                            <th style="text-align: center; color: #ef4444;">Late</th>
                            <th style="text-align: center; color: #f59e0b;">Early</th>
                            <th style="text-align: center; color: #15803d; font-weight: 800;">Main Hrs</th>
                            <th style="text-align: center; color: #b91c1c;">Vio. Total</th>
                            <th style="text-align: center; font-weight: 800; color: #1e293b;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="main-shift-rows">
                        ${renderMainShiftRows(mode)}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SECTION 2: OT SHIFT (OPTIONAL) -->
        <div class="att-card ot-theme" style="margin-top: 20px;">
            <div class="section-header" style="background: #eff6ff50;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <div class="section-title">Overtime Logs (18:00 - 22:00)</div>
            </div>
            <div class="table-container" style="overflow-x: auto;">
                <table class="att-table">
                    <thead>
                        <tr>
                            ${mode === 'team' ? '<th class="sticky-col" style="left: 0; min-width: 160px;">Employee</th>' : ''}
                            <th class="sticky-col" style="${mode === 'team' ? 'left: 160px;' : 'left: 0;'} min-width: 110px;">Date</th>
                            <th style="text-align: center;">OT In</th>
                            <th style="text-align: center;">OT Out</th>
                            <th style="text-align: center; color: #1e40af; font-weight: 800;">OT Hours</th>
                        </tr>
                    </thead>
                    <tbody id="ot-shift-rows">
                        ${renderOTShiftRows(mode)}
                    </tbody>
                </table>
            </div>
        </div>

    `;
}

function getStatusBadge(att) {
    let color = "#10b981"; // Present/Default Green
    let label = "On Time";
    let bg = "#f0fdf4";

    if (!att.checkIn) {
        color = "#ef4444";
        label = "Absent";
        bg = "#fef2f2";
    } else if (att.checkIn && !att.checkOut) {
        color = "#6366f1";
        label = "On-Shift";
        bg = "#eef2ff";
    } else if (att.lateMinutes > 0 || att.earlyLeaveMinutes > 0) {
        color = "#f59e0b";
        label = "Violation";
        bg = "#fffbeb";
    }

    // Special case for manual "absent" mark from backend
    if (att.status === "absent" && att.checkIn) {
        color = "#ef4444";
        label = "Invalid";
        bg = "#fef2f2";
    }

    return `<span style="padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: ${color}; background: ${bg}; border: 1px solid ${color}30;">${label}</span>`;
}

function renderAttendanceStats() {
    const appData = getState();
    const mode = window.location.pathname.includes('team') ? 'team' : 'my';
    const records = (appData.attendance || []).filter(a => mode === 'my' ? a.employeeId === appData.currentUser?.id : true);

    const stats = {
        present: 0,
        violation: 0,
        onShift: 0,
        absent: 0
    };

    records.forEach(r => {
        if (!r.checkIn) stats.absent++;
        else if (r.checkIn && !r.checkOut) stats.onShift++;
        else if (r.lateMinutes > 0 || r.earlyLeaveMinutes > 0) stats.violation++;
        else stats.present++;
    });

    return `
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #f0fdf4; color: #10b981;">✅</div>
            <div>
                <div class="stat-val">${stats.present}</div>
                <div class="stat-lab">On Time</div>
            </div>
        </div>
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #fffbeb; color: #f59e0b;">⚠️</div>
            <div>
                <div class="stat-val">${stats.violation}</div>
                <div class="stat-lab">Violations</div>
            </div>
        </div>
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #eef2ff; color: #6366f1;">⏱️</div>
            <div>
                <div class="stat-val">${stats.onShift}</div>
                <div class="stat-lab">On-Shift</div>
            </div>
        </div>
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #fef2f2; color: #ef4444;">❌</div>
            <div>
                <div class="stat-val">${stats.absent}</div>
                <div class="stat-lab">Absences</div>
            </div>
        </div>
    `;
}

function renderMainShiftRows(mode, filteredRecords = null) {
    const appData = getState();
    let records = filteredRecords;

    if (!records) {
        const currentUserId = appData.currentUser?.id || parseInt(localStorage.getItem('employee_id'));
        records = (appData.attendance || []).filter(a => mode === 'my' ? a.employeeId === currentUserId : true);
    }

    if (records.length === 0) return `<tr><td colspan="${mode === 'team' ? 9 : 8}" style="text-align: center; padding: 40px; color: #94a3b8; font-style: italic;">No records match these criteria.</td></tr>`;

    return records.map(att => {
        const totalViolation = (att.lateMinutes || 0) + (att.earlyLeaveMinutes || 0);
        const dayTotal = (parseFloat(att.workHours || 0) + parseFloat(att.overtimeHours || 0)).toFixed(1);

        return `
            <tr>
                ${mode === 'team' ? `<td class="sticky-col" style="left: 0; font-weight: 700; color: #1e293b;">${att.employeeName}</td>` : ''}
                <td class="sticky-col" style="${mode === 'team' ? 'left: 160px;' : 'left: 0;'} font-weight: 600; color: #475569;">${att.date}</td>
                <td style="text-align: center; font-weight: 600;">${att.checkIn || '-'}</td>
                <td style="text-align: center; font-weight: 600;">${att.checkOut || '-'}</td>
                <td style="text-align: center;">${att.lateMinutes > 0 ? `<span class="badge-v badge-v-red">${formatDuration(att.lateMinutes)}</span>` : '<span style="color: #cbd5e1;">-</span>'}</td>
                <td style="text-align: center;">${att.earlyLeaveMinutes > 0 ? `<span style="color: #f59e0b; font-weight: 700;">${formatDuration(att.earlyLeaveMinutes)}</span>` : '<span style="color: #cbd5e1;">-</span>'}</td>
                <td style="text-align: center; font-weight: 800; color: #15803d; background: #f0fdf440;">${formatDecimalHours(att.workHours)}</td>
                <td style="text-align: center;">${totalViolation > 0 ? `<span class="badge-v badge-v-red">${formatDuration(totalViolation)}</span>` : '<span style="color: #10b981;">✓</span>'}</td>
                <td style="text-align: center;">${getStatusBadge(att)}</td>
            </tr>
        `;
    }).join('');
}

function renderOTShiftRows(mode, filteredRecords = null) {
    const appData = getState();
    let records = filteredRecords;

    if (!records) {
        const currentUserId = appData.currentUser?.id || parseInt(localStorage.getItem('employee_id'));
        records = (appData.attendance || []).filter(a => mode === 'my' ? a.employeeId === currentUserId : true);
    }

    if (records.length === 0) return `<tr><td colspan="${mode === 'team' ? 5 : 4}" style="text-align: center; padding: 40px; color: #94a3b8; font-style: italic;">-</td></tr>`;

    return records.map(att => `
        <tr style="background: ${att.overtimeHours > 0 ? '#eff6ff50' : 'none'};">
            ${mode === 'team' ? `<td class="sticky-col" style="left: 0; font-weight: 700; color: #1e293b;">${att.employeeName}</td>` : ''}
            <td class="sticky-col" style="${mode === 'team' ? 'left: 160px;' : 'left: 0;'} font-weight: 600; color: #475569;">${att.date}</td>
            <td style="text-align: center; font-weight: 600;">${att.otCheckIn || '-'}</td>
            <td style="text-align: center; font-weight: 600;">${att.otCheckOut || '-'}</td>
            <td style="text-align: center; font-weight: 800; color: #1e40af; background: #eff6ff40;">${formatDecimalHours(att.overtimeHours)}</td>
        </tr>
    `).join('');
}

window.applyProFilters = function () {
    const appData = getState();
    const mode = window.location.pathname.includes('team') ? 'team' : 'my';

    const nameVal = document.getElementById('filter-name')?.value.toLowerCase() || '';
    const deptVal = document.getElementById('filter-dept')?.value || '';
    const statusVal = document.getElementById('filter-status').value;
    const fromDate = document.getElementById('filter-from').value;
    const toDate = document.getElementById('filter-to').value;

    const currentUserId = appData.currentUser?.id || parseInt(localStorage.getItem('employee_id'));
    let records = (appData.attendance || []).filter(a => mode === 'my' ? a.employeeId === currentUserId : true);

    if (nameVal) records = records.filter(r => r.employeeName.toLowerCase().includes(nameVal));
    if (deptVal) {
        const matchedIds = (appData.employees || []).filter(e => e.department === deptVal).map(e => e.id);
        records = records.filter(r => matchedIds.includes(r.employeeId));
    }
    if (statusVal) {
        records = records.filter(r => {
            if (statusVal === 'absent') return !r.checkIn;
            if (statusVal === 'invalid') return r.checkIn && r.status === 'absent';
            if (statusVal === 'on-shift') return r.checkIn && !r.checkOut && r.status !== 'absent';
            if (statusVal === 'violation') return r.checkIn && r.checkOut && (r.lateMinutes > 0 || r.earlyLeaveMinutes > 0) && r.status !== 'absent';
            if (statusVal === 'on-time') return r.checkIn && r.checkOut && r.lateMinutes === 0 && r.earlyLeaveMinutes === 0 && r.status !== 'absent';
            return true;
        });
    }
    if (fromDate) records = records.filter(r => r.date >= fromDate);
    if (toDate) records = records.filter(r => r.date <= toDate);

    document.getElementById('main-shift-rows').innerHTML = renderMainShiftRows(mode, records);
    document.getElementById('ot-shift-rows').innerHTML = renderOTShiftRows(mode, records);

    // Refresh stats for the filtered set
    document.getElementById('att-stats-ribbon').innerHTML = renderAttendanceStats(records);
};

window.resetProFilters = function () {
    ['filter-name', 'filter-dept', 'filter-status', 'filter-from', 'filter-to'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    window.applyProFilters();
};

window.exportAttendanceToCSV = function () {
    const tableBody = document.getElementById('main-shift-rows');
    const rows = Array.from(tableBody.querySelectorAll('tr')).filter(tr => !tr.innerText.includes('No records'));

    if (rows.length === 0) {
        showToast("No data available to export with current filters.", "warning");
        return;
    }

    let csv = "Employee,Date,Check In,Check Out,Late,Early,Work Hours,Violations,Status\n";
    rows.forEach(tr => {
        const cols = Array.from(tr.querySelectorAll('td')).map((td, index) => {
            let val = td.innerText.trim();
            if (val === '✓') val = 'OK';
            if (val === '-') val = '';
            if (index === 1 || val.startsWith('=') || val.startsWith('+') || val.startsWith('-')) {
                return `"\t${val}"`;
            }
            return `"${val}"`;
        });
        csv += cols.join(',') + "\n";
    });

    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function renderLiveStatusOnPage() {
    const appData = getState();
    const today = new Date().toISOString().split('T')[0];
    const myId = appData.currentUser?.id;
    const record = (appData.attendance || []).find(a => a.employeeId === myId && a.date === today);

    if (!record) {
        return `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 12px; height: 12px; background: #94a3b8; border-radius: 50%;"></div>
                <span style="font-weight: 700; color: #64748b;">Not Checked In Today</span>
            </div>
        `;
    }

    if (record.checkIn && !record.checkOut) {
        return `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 12px; height: 12px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse-green 2s infinite;"></div>
                <span style="font-weight: 700; color: #1e293b;">Active on Shift (Since ${record.checkIn})</span>
            </div>
        `;
    }

    return `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 12px; height: 12px; background: #6366f1; border-radius: 50%;"></div>
            <span style="font-weight: 700; color: #1e293b;">Shift Completed (In: ${record.checkIn} - Out: ${record.checkOut})</span>
        </div>
    `;
}

window.handlePageCheckIn = async function () {
    try {
        await checkIn();
        showToast("Checked in successfully! 🚀", "success");
        await fetchAttendance();
        const content = document.getElementById('content-area');
        if (content) content.innerHTML = renderAttendance(window.location.pathname.includes('team') ? 'team' : 'my');
    } catch (e) {
        showToast(e.message, "error");
    }
};

window.handlePageCheckOut = async function () {
    try {
        await checkOut();
        showToast("Checked out successfully!", "success");
        await fetchAttendance();
        const content = document.getElementById('content-area');
        if (content) content.innerHTML = renderAttendance(window.location.pathname.includes('team') ? 'team' : 'my');
    } catch (e) {
        showToast(e.message, "error");
    }
};

