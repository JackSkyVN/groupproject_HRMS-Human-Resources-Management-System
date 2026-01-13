/**
 * Attendance Module - Vertically Stacked Shifts
 */

import { getState } from '../core/state.js';
import { fetchAttendance, checkIn, checkOut } from '../core/api.js';
import { showToast } from '../utils/toast.js';

// --- DATE HELPERS (Local Time / Vietnam Time) ---
const parseLocal = (str) => {
    if (!str || typeof str !== 'string' || str === 'N/A') return null;
    let y, m, d;
    if (str.includes('/')) {
        const parts = str.split('/');
        [d, m, y] = parts.map(Number);
    } else if (str.includes('-')) {
        const parts = val => val.split('-');
        const p = parts(str);
        if (p[0].length === 4) { // YYYY-MM-DD
            [y, m, d] = p.map(Number);
        } else { // DD-MM-YYYY
            [d, m, y] = p.map(Number);
        }
    }
    if (y && m && d) return new Date(y, m - 1, d);

    const fallback = new Date(str);
    if (!isNaN(fallback)) {
        fallback.setHours(0, 0, 0, 0);
        return fallback;
    }
    return null;
};

const formatLocal = (date) => {
    if (!date || isNaN(date)) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
// ------------------------------------------------

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

export function renderAttendance(mode = 'my', filteredEmployees = null, filteredRecords = null, dateFrom = null, dateTo = null) {
    const title = mode === 'my' ? 'My Attendance' : 'Employee Attendance';
    const today = new Date().toISOString().split('T')[0];

    // Default dates if not provided
    const defaultFrom = dateFrom || today;
    const defaultTo = dateTo || today;

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
            ${renderAttendanceStats(mode, filteredRecords)}
        </div>

        <!-- ADVANCED FILTERS -->
        <div class="pro-filters">
            ${mode === 'team' ? `
                <div class="filter-group">
                    <label class="filter-label">Search Employee</label>
                    <input type="text" id="filter-name" class="pro-input" placeholder="Name or ID..." onkeyup="debounceSearch()">
                </div>
                <div class="filter-group">
                    <label class="filter-label">Department</label>
                    <select id="filter-dept" class="pro-input" onchange="applyProFilters()">
                        <option value="">All Departments</option>
                        ${(() => {
                const employees = getState().employees || [];
                const depts = [...new Set(employees.map(e => e.department).filter(d => d))];
                return depts.map(d => `<option value="${d}">${d}</option>`).join('');
            })()}
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
                <input type="date" id="filter-from" value="${defaultFrom}" class="pro-input" onchange="window.onDateChange()" max="${today}">
            </div>
            <div class="filter-group">
                <label class="filter-label">Date To</label>
                <input type="date" id="filter-to" value="${defaultTo}" class="pro-input" onchange="window.onDateChange()" max="${today}">
            </div>
            <div class="filter-group" style="flex: 0;">
                <button class="btn btn-secondary" onclick="resetProFilters()" style="padding: 10px; height: 42px;">Reset</button>
            </div>
        </div>

        <script>
            // Initialize dates if empty (runs after HTML is inserted)
            setTimeout(() => {
                const today = '${today}';
                const filterFrom = document.getElementById('filter-from');
                const filterTo = document.getElementById('filter-to');
                
                if (filterFrom && !filterFrom.value) {
                    filterFrom.value = today;
                }
                if (filterTo && !filterTo.value) {
                    filterTo.value = today;
                }
                
                // Trigger render if dates were just set
                if ((filterFrom && filterFrom.value) && (filterTo && filterTo.value)) {
                    const mainBody = document.getElementById('main-shift-rows');
                    if (mainBody && mainBody.innerHTML.includes('Please select dates')) {
                        applyProFilters();
                    }
                }
            }, 0);
        </script>

        <!-- SECTION 1: MAIN SHIFT & SUMMARY -->
        <div class="att-card main-theme">
            <div class="section-header" style="background: #f0fdf450;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                <div class="section-title">Main Shift (08:30 - 17:30)</div>
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
                        ${renderMainShiftRows(mode, filteredEmployees, filteredRecords, defaultFrom, defaultTo)}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SECTION 2: OT SHIFT (OPTIONAL) -->
        <div class="att-card ot-theme" style="margin-top: 20px;">
            <div class="section-header" style="background: #eff6ff50;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <div class="section-title">OT (18:00 - 22:00)</div>
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
                        ${renderOTShiftRows(mode, filteredRecords)}
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

/**
 * Calculate absences based on selected date range (excluding Sundays)
 */
function renderAttendanceStats(mode = 'my', filteredRecords = null) {
    const appData = getState();
    const currentUser = appData.currentUser || {};
    const currentUserId = currentUser.id || parseInt(localStorage.getItem('employee_id'));

    // Robust Date Parsing Helper (Forcing Local Time/Vietnam Time)
    const parseHireDate = (val) => {
        if (!val) return null;
        if (typeof val !== 'string') return null;
        // Case: DD/MM/YYYY
        if (val.includes('/')) {
            const parts = val.split('/');
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        // Case: YYYY-MM-DD (Avoid UTC parsing by using numeric parameters)
        if (val.includes('-')) {
            const parts = val.split('-');
            if (parts.length === 3) {
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
        }
        // Default fallback (though new Date(string) might still hit UTC issues)
        const d = new Date(val);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Get date filter values
    const todayStr = formatLocal(new Date());
    const dateFromInput = document.getElementById('filter-from');
    const dateToInput = document.getElementById('filter-to');

    let rangeStart = parseLocal(dateFromInput?.value) || parseLocal(todayStr);
    let rangeEnd = parseLocal(dateToInput?.value) || parseLocal(todayStr);

    // Cap rangeEnd at today
    const todayLocal = parseLocal(todayStr);
    if (rangeEnd > todayLocal) rangeEnd = todayLocal;

    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(0, 0, 0, 0);

    // Identify employees to calculate for
    let targetEmployees = [];
    if (mode === 'my') {
        targetEmployees = [currentUser];
    } else {
        const allEmployees = appData.employees || [];
        const currentUserDept = currentUser.department;
        const currentUserLevel = currentUser.role_id;

        targetEmployees = allEmployees.filter(emp => emp.id !== currentUserId);
        if (currentUserLevel === 3 && currentUserDept) {
            targetEmployees = targetEmployees.filter(emp => emp.department === currentUserDept);
        }
        // Further filter by search filters if they exist in DOM
        const nameFilterValue = document.getElementById('filter-name')?.value.toLowerCase().trim();
        const deptFilterValue = document.getElementById('filter-dept')?.value;
        if (nameFilterValue) {
            targetEmployees = targetEmployees.filter(emp => {
                const empName = (emp.name || emp.full_name || '').toLowerCase();
                const empId = (emp.id || '').toString();
                return empName.includes(nameFilterValue) || empId.includes(nameFilterValue);
            });
        }
        if (deptFilterValue) {
            targetEmployees = targetEmployees.filter(emp => emp.department === deptFilterValue);
        }
    }

    let totalExpectedWorkDays = 0;
    targetEmployees.forEach(emp => {
        const hireDate = parseLocal(emp.hire_date);
        const actualStart = (hireDate && hireDate > rangeStart) ? hireDate : rangeStart;

        if (actualStart <= rangeEnd) {
            let cur = new Date(actualStart);
            while (cur <= rangeEnd) {
                if (cur.getDay() !== 0) totalExpectedWorkDays++;
                cur.setDate(cur.getDate() + 1);
            }
        }
    });

    // Count actual records
    let records = filteredRecords || appData.attendance || [];
    if (mode === 'my') {
        records = records.filter(r => r.employeeId === currentUserId);
    } else {
        const targetIds = targetEmployees.map(e => e.id);
        records = records.filter(r => targetIds.includes(r.employeeId));
    }

    // Filter by dates too
    const startStr = formatLocal(rangeStart);
    const endStr = formatLocal(rangeEnd);
    records = records.filter(r => r.date >= startStr && r.date <= endStr);

    const onTime = records.filter(r => r.status === 'on-time' || r.status === 'present').length;
    const violations = records.filter(r => r.status === 'late' || r.status === 'early-leave' || r.status === 'violation').length;
    const onShift = records.filter(r => r.checkIn && !r.checkOut).length;
    const checkedInCount = records.filter(r => r.checkIn).length;

    const absences = Math.max(0, totalExpectedWorkDays - checkedInCount);

    return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');
        </style>
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #f0fdf4; color: #10b981;">
                <span class="material-symbols-outlined">check_circle</span>
            </div>
            <div>
                <div class="stat-val">${onTime}</div>
                <div class="stat-lab">On Time</div>
            </div>
        </div>
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #fef2f2; color: #ef4444;">
                <span class="material-symbols-outlined">warning</span>
            </div>
            <div>
                <div class="stat-val">${violations}</div>
                <div class="stat-lab">Violations</div>
            </div>
        </div>
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #eef2ff; color: #6366f1;">
                <span class="material-symbols-outlined">schedule</span>
            </div>
            <div>
                <div class="stat-val">${onShift}</div>
                <div class="stat-lab">On-Shift</div>
            </div>
        </div>
        <div class="stat-mini-card">
            <div class="stat-icon" style="background: #fffbeb; color: #f59e0b;">
                <span class="material-symbols-outlined">block</span>
            </div>
            <div>
                <div class="stat-val">${absences}</div>
                <div class="stat-lab">Absences</div>
            </div>
        </div>
    `;
}

export function renderMainShiftRows(mode = 'my', filteredEmployees = null, filteredRecords = null, overrideFrom = null, overrideTo = null) {
    const appData = getState();
    const currentUserId = appData.currentUser?.id || parseInt(localStorage.getItem('employee_id'));

    // Date Priority: Override Parameter > DOM Value > Today
    const today = formatLocal(new Date());
    const dateFromInput = document.getElementById('filter-from');
    const dateToInput = document.getElementById('filter-to');

    const dateFrom = overrideFrom || (dateFromInput && dateFromInput.value) || today;
    const dateTo = overrideTo || (dateToInput && dateToInput.value) || today;

    const startDate = parseLocal(dateFrom);
    let endDate = parseLocal(dateTo);

    // Cap endDate at today
    const todayObj = parseLocal(today);
    if (endDate > todayObj) endDate = todayObj;

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Robust Date Parsing Helper (Forcing Local Time/Vietnam Time)
    const parseHireDate = (val) => {
        if (!val) return null;
        if (typeof val !== 'string') return null;
        // Case: DD/MM/YYYY
        if (val.includes('/')) {
            const parts = val.split('/');
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        // Case: YYYY-MM-DD (Avoid UTC parsing by using numeric parameters)
        if (val.includes('-')) {
            const parts = val.split('-');
            if (parts.length === 3) {
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
        }
        // Default fallback
        const d = new Date(val);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Generate all work days (excluding Sundays) - used only as fallback/global list
    const allWorkDays = [];
    let cur = new Date(startDate);
    while (cur <= endDate) {
        if (cur.getDay() !== 0) allWorkDays.push(formatLocal(cur));
        cur.setDate(cur.getDate() + 1);
    }

    if (mode === 'my') {
        // MY MODE: Just current user
        const currentUserHireDate = parseLocal(appData.currentUser?.hire_date);

        // Only generate days from MAX(startDate, hireDate)
        const myActualStartDate = (currentUserHireDate && currentUserHireDate > startDate) ? currentUserHireDate : startDate;

        // Regenerate work days for current user specifically
        const myWorkDays = [];
        let myCur = new Date(myActualStartDate);
        while (myCur <= endDate) {
            if (myCur.getDay() !== 0) {
                myWorkDays.push(formatLocal(myCur));
            }
            myCur.setDate(myCur.getDate() + 1);
        }

        let records = filteredRecords || (appData.attendance || []).filter(a => a.employeeId === currentUserId);
        const recMap = {};
        records.forEach(r => { const d = r.date || r.checkIn?.split(' ')[0]; if (d) recMap[d] = r; });

        const complete = myWorkDays.map(d => recMap[d] || {
            date: d, checkIn: null, checkOut: null, status: 'absent',
            employeeId: currentUserId, employeeName: appData.currentUser?.full_name || 'You'
        });

        if (complete.length === 0) {
            return `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">No work days.</td></tr>`;
        }

        return complete.map(att => renderAttendanceRow(att, mode)).join('');
    } else {
        // TEAM MODE: Use pre-filtered employees
        let teamEmployees = filteredEmployees;

        // If no filter applied, get all team employees
        if (!teamEmployees) {
            const allEmployees = appData.employees || [];
            const currentUserDept = appData.currentUser?.department;
            const currentUserLevel = appData.currentUser?.role_id;

            teamEmployees = allEmployees.filter(emp => emp.id !== currentUserId);

            if (currentUserLevel === 3 && currentUserDept) {
                teamEmployees = teamEmployees.filter(emp => emp.department === currentUserDept);
            }
        }

        if (teamEmployees.length === 0) {
            return `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">No team members found.</td></tr>`;
        }

        // Get all attendance records
        const allRecords = (appData.attendance || []);

        // Generate rows for each employee
        const allRows = [];
        teamEmployees.forEach(emp => {
            // Get this employee's records
            let empRecords = allRecords.filter(a => a.employeeId === emp.id);

            // Apply status filter if provided
            if (filteredRecords) {
                empRecords = empRecords.filter(r => filteredRecords.some(fr => fr.id === r.id));
            }

            const recMap = {};
            empRecords.forEach(r => { const d = r.date || r.checkIn?.split(' ')[0]; if (d) recMap[d] = r; });

            // Check if filtering by status
            const statusFilter = document.getElementById('filter-status')?.value || '';

            // Calculate actual start date for this employee (MAX of dateFrom and hire_date)
            const empHireDate = parseLocal(emp.hire_date);
            const actualStartDate = (empHireDate && empHireDate > startDate) ? empHireDate : new Date(startDate);

            // Generate employee's work days from actual start date
            const empWorkDays = [];
            let empCur = new Date(actualStartDate);
            while (empCur <= endDate) {
                if (empCur.getDay() !== 0) { // Skip Sunday
                    empWorkDays.push(formatLocal(empCur));
                }
                empCur.setDate(empCur.getDate() + 1);
            }

            if (statusFilter && statusFilter !== 'absent') {
                // Non-absent status filter: ONLY show actual matching records
                Object.values(recMap).forEach(att => {
                    // Only include if date is within employee's work period
                    const attDate = new Date(att.date || att.checkIn?.split(' ')[0]);
                    if (attDate >= actualStartDate && attDate <= endDate) {
                        allRows.push(att);
                    }
                });
            } else if (statusFilter === 'absent') {
                // Absent status filter: Generate all days, ONLY push absent ones
                empWorkDays.forEach(d => {
                    if (!recMap[d]) {
                        // No record for this day = absent
                        const att = {
                            date: d, checkIn: null, checkOut: null, status: 'absent',
                            employeeId: emp.id, employeeName: emp.name || emp.full_name || 'Unknown'
                        };
                        allRows.push(att);
                    }
                });
            } else {
                // No status filter: Generate complete days with absents
                empWorkDays.forEach(d => {
                    const att = recMap[d] || {
                        date: d, checkIn: null, checkOut: null, status: 'absent',
                        employeeId: emp.id, employeeName: emp.name || emp.full_name || 'Unknown'
                    };
                    allRows.push(att);
                });
            }
        });

        if (allRows.length === 0) {
            return `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">No work days.</td></tr>`;
        }

        return allRows.map(att => renderAttendanceRow(att, mode)).join('');
    }
}

function renderAttendanceRow(att, mode) {
    const totalViolation = (att.lateMinutes || 0) + (att.earlyLeaveMinutes || 0);

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
}

function renderOTShiftRows(mode, filteredRecords = null) {
    const appData = getState();
    let records = filteredRecords;

    if (!records) {
        const currentUserId = appData.currentUser?.id || parseInt(localStorage.getItem('employee_id'));
        records = (appData.attendance || []).filter(a => mode === 'my' ? a.employeeId === currentUserId : true);
    }

    // Only show records with actual OT
    const otRecords = records.filter(r => r.overtimeHours && r.overtimeHours > 0);

    if (otRecords.length === 0) return `<tr><td colspan="${mode === 'team' ? 5 : 4}" style="text-align: center; padding: 40px; color: #94a3b8; font-style: italic;">No overtime records found.</td></tr>`;

    return otRecords.map(att => `
        <tr style="background: ${att.overtimeHours > 0 ? '#eff6ff50' : 'none'};">
            ${mode === 'team' ? `<td class="sticky-col" style="left: 0; font-weight: 700; color: #1e293b;">${att.employeeName}</td>` : ''}
            <td class="sticky-col" style="${mode === 'team' ? 'left: 160px;' : 'left: 0;'} font-weight: 600; color: #475569;">${att.date}</td>
            <td style="text-align: center; font-weight: 600;">${att.otCheckIn || '-'}</td>
            <td style="text-align: center; font-weight: 600;">${att.otCheckOut || '-'}</td>
            <td style="text-align: center; font-weight: 800; color: #1e40af; background: #eff6ff40;">${formatDecimalHours(att.overtimeHours)}</td>
        </tr>
    `).join('');
}



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




// Debounce timer for search
let searchTimeout;
window.debounceSearch = function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => applyProFilters(), 300);
};

// Handle date changes - force full re-render with EXPLICIT date passing
window.onDateChange = function () {
    const mode = window.location.pathname.includes('team') ? 'team' : 'my';
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        // Get current filter values
        const nameFilter = document.getElementById('filter-name')?.value || '';
        const deptFilter = document.getElementById('filter-dept')?.value || '';
        const statusFilter = document.getElementById('filter-status')?.value || '';
        const dateFrom = document.getElementById('filter-from')?.value || '';
        const dateTo = document.getElementById('filter-to')?.value || '';

        // Full re-render passing dates directly to avoid stale DOM values
        contentArea.innerHTML = renderAttendance(mode, null, null, dateFrom, dateTo);

        // Restore filter values (since HTML was replaced)
        setTimeout(() => {
            if (nameFilter) {
                const nameInput = document.getElementById('filter-name');
                if (nameInput) nameInput.value = nameFilter;
            }
            if (deptFilter) {
                const deptSelect = document.getElementById('filter-dept');
                if (deptSelect) deptSelect.value = deptFilter;
            }
            if (statusFilter) {
                const statusSelect = document.getElementById('filter-status');
                if (statusSelect) statusSelect.value = statusFilter;
            }

            // Re-apply filter logic
            if (nameFilter || deptFilter || statusFilter) {
                applyProFilters();
            }
        }, 0);
    }
};

window.applyProFilters = function () {
    const nameFilter = document.getElementById('filter-name')?.value.toLowerCase().trim() || '';
    const deptFilter = document.getElementById('filter-dept')?.value || '';
    const statusFilter = document.getElementById('filter-status')?.value || '';
    const dateFrom = document.getElementById('filter-from')?.value || '';
    const dateTo = document.getElementById('filter-to')?.value || '';

    const mode = window.location.pathname.includes('team') ? 'team' : 'my';
    const appData = getState();
    const currentUserId = appData.currentUser?.id || parseInt(localStorage.getItem('employee_id'));

    // 1. Filter EMPLOYEES
    let filteredEmployees = null;
    if (mode === 'team') {
        const allEmployees = appData.employees || [];
        const currentUserDept = appData.currentUser?.department;
        const currentUserLevel = appData.currentUser?.role_id;

        filteredEmployees = allEmployees.filter(emp => emp.id !== currentUserId);

        // Department/Level restriction
        if (currentUserLevel === 3 && currentUserDept) {
            filteredEmployees = filteredEmployees.filter(emp => emp.department === currentUserDept);
        }

        // Search Name/ID
        if (nameFilter) {
            filteredEmployees = filteredEmployees.filter(emp => {
                const empName = (emp.name || emp.full_name || '').toLowerCase();
                const empId = (emp.id || '').toString();
                return empName.includes(nameFilter) || empId.includes(nameFilter);
            });
        }

        // Selected Department
        if (deptFilter) {
            filteredEmployees = filteredEmployees.filter(emp => emp.department === deptFilter);
        }
    }

    // 2. Filter RECORDS (for Status filter)
    let filteredRecords = null;
    if (statusFilter) {
        filteredRecords = (appData.attendance || []).filter(r => {
            const status = r.status?.toLowerCase() || 'absent';
            if (statusFilter === 'on-time') return status === 'on-time' || status === 'present';
            if (statusFilter === 'violation') return status === 'late' || status === 'early-leave';
            return status === statusFilter;
        });
    }

    // Update the shifts with correctly filtered data and dates
    const mainBody = document.getElementById('main-shift-rows');
    const otBody = document.getElementById('ot-shift-rows');
    if (mainBody) mainBody.innerHTML = renderMainShiftRows(mode, filteredEmployees, filteredRecords, dateFrom, dateTo);
    if (otBody) otBody.innerHTML = renderOTShiftRows(mode, filteredRecords);

    // Refresh stats
    const statsRibbon = document.getElementById('att-stats-ribbon');
    if (statsRibbon) statsRibbon.innerHTML = renderAttendanceStats(mode, filteredRecords);
};

window.resetProFilters = function () {
    const today = formatLocal(new Date());
    const nameInput = document.getElementById('filter-name');
    const deptSelect = document.getElementById('filter-dept');
    const statusSelect = document.getElementById('filter-status');
    const dateFromInput = document.getElementById('filter-from');
    const dateToInput = document.getElementById('filter-to');

    if (nameInput) nameInput.value = '';
    if (deptSelect) deptSelect.value = '';
    if (statusSelect) statusSelect.value = '';
    if (dateFromInput) dateFromInput.value = today;
    if (dateToInput) dateToInput.value = today;

    const mode = window.location.pathname.includes('team') ? 'team' : 'my';
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.innerHTML = renderAttendance(mode, null, null, today, today);
    }
};
