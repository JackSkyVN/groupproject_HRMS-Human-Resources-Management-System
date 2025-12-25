/**
 * Payroll Module - Professional Salary Management (USD Strict Mode)
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';
import { showToast } from '../utils/toast.js';
import { fetchPayroll, markPayrollAsPaid, fetchSalaryAdjustments, submitSalaryAdjustment, approveSalaryAdjustment, rejectSalaryAdjustment } from '../core/api.js';
import { createModal } from '../utils/modal.js';

let currentSubview = 'list'; // 'list' or 'adjustments'

function formatDuration(decimalHours) {
    if (!decimalHours || decimalHours <= 0) return '-';
    const totalMinutes = Math.round(decimalHours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

export function renderSalary(mode = 'my', subview = null) {
    if (subview) currentSubview = subview;
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const title = mode === 'my' ? 'My Salary' : 'Employee Salary';

    return `
        <div class="page-header" style="margin-bottom: 24px;">
            <div>
                <h1 style="font-family: 'Outfit', sans-serif; font-weight: 800; color: #1e293b; margin: 0;">${title}</h1>
            </div>
            <div id="salary-header-actions" style="display: flex; gap: 12px;">
                ${currentSubview === 'list' ? `
                    <button class="btn btn-secondary" onclick="exportPayrollToCSV()" style="display: flex; align-items: center; gap: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        Export CSV
                    </button>
                ` : `
                    ${roleLevel <= 3 ? `
                    <button class="btn btn-primary" onclick="window.openAdjustmentModal()" style="display: flex; align-items: center; gap: 8px; background: #6366f1; border: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        New Request
                    </button>
                    ` : ''}
                `}
            </div>
        </div>

        <div style="display: flex; gap: 24px; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
            <button onclick="window.switchSalaryTab('list')" style="background: none; border: none; font-family: 'Outfit', sans-serif; font-weight: 700; color: ${currentSubview === 'list' ? '#6366f1' : '#94a3b8'}; cursor: pointer; font-size: 1rem; position: relative; padding: 0 4px;">
                Payroll Table
                ${currentSubview === 'list' ? '<div style="position: absolute; bottom: -10px; left: 0; width: 100%; height: 2px; background: #6366f1;"></div>' : ''}
            </button>
            <button onclick="window.switchSalaryTab('adjustments')" style="background: none; border: none; font-family: 'Outfit', sans-serif; font-weight: 700; color: ${currentSubview === 'adjustments' ? '#6366f1' : '#94a3b8'}; cursor: pointer; font-size: 1rem; position: relative; padding: 0 4px;">
                Salary Requests
                ${currentSubview === 'adjustments' ? '<div style="position: absolute; bottom: -10px; left: 0; width: 100%; height: 2px; background: #6366f1;"></div>' : ''}
            </button>
        </div>

        <div id="salary-module-container">
            ${currentSubview === 'list' ? renderPayrollUI(mode) : renderAdjustmentsUI(mode)}
        </div>
    `;
}

function renderPayrollUI(mode) {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    return `
        <!-- STATS RIBBON -->
        <div id="payroll-stats-ribbon" class="stats-ribbon" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
            ${renderSalaryStats()}
        </div>

        <!-- FILTER SECTION -->
        <div class="card" style="margin-bottom: 24px; padding: 20px; border-radius: 16px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: end;">
                ${mode === 'team' ? `
                <div class="filter-group">
                    <label class="filter-label">Employee</label>
                    <input type="text" id="pay-filter-name" class="pro-input" placeholder="Name or ID..." oninput="applyPayrollFilters()">
                </div>
                ` : ''}
                <div class="filter-group">
                    <label class="filter-label">Status</label>
                    <select id="pay-filter-status" class="pro-input" onchange="applyPayrollFilters()">
                        <option value="">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="draft">Pending</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Month</label>
                    <select id="pay-filter-month" class="pro-input" onchange="applyPayrollFilters()">
                        <option value="">Any Month</option>
                        ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${new Date(0, i).toLocaleString('en', { month: 'long' })}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">Year</label>
                    <select id="pay-filter-year" class="pro-input" onchange="applyPayrollFilters()">
                        <option value="">Any Year</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary" onclick="resetPayrollFilters()" style="flex: 1; height: 42px;">Reset</button>
                </div>
            </div>
        </div>

        <div class="card" style="border-radius: 16px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden;">
            <div class="table-container" style="margin: 0;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            ${mode === 'team' ? '<th style="padding: 16px; text-align: left; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Employee</th>' : ''}
                            <th style="padding: 16px; text-align: left; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Period</th>
                            <th style="padding: 16px; text-align: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Worked</th>
                            <th style="padding: 16px; text-align: right; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Base Salary</th>
                            <th style="padding: 16px; text-align: right; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Total Net</th>
                            <th style="padding: 16px; text-align: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Detail</th>
                            <th style="padding: 16px; text-align: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Status</th>
                            ${(mode === 'team' && roleLevel <= 2) ? '<th style="padding: 16px; text-align: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Action</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="payroll-rows-container">
                        ${renderSalaryRows(mode)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderSalaryStats(filteredData = null) {
    const appData = getState();
    const mode = window.location.pathname.includes('team') ? 'team' : 'my';
    let data = filteredData || (appData.salaries || []).filter(s => mode === 'my' ? s.employeeId === appData.currentUser?.id : true);

    const stats = {
        totalExp: 0,
        avgNet: 0,
        paidCount: 0,
        pendingCount: 0
    };

    if (data.length > 0) {
        stats.totalExp = data.reduce((sum, s) => sum + (s.netSalary || 0), 0);
        stats.avgNet = stats.totalExp / data.length;
        stats.paidCount = data.filter(s => s.status === 'paid').length;
        stats.pendingCount = data.filter(s => s.status === 'draft').length;
    }

    return `
        <div class="stat-mini-card" style="background: white; padding: 20px; border-radius: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #f0fdf4; color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">💵</div>
            <div>
                <div style="font-size: 1.25rem; font-weight: 800; font-family: 'Outfit', sans-serif; color: #1e293b;">$${Math.round(stats.totalExp).toLocaleString()}</div>
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Budget</div>
            </div>
        </div>
        <div class="stat-mini-card" style="background: white; padding: 20px; border-radius: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">📈</div>
            <div>
                <div style="font-size: 1.25rem; font-weight: 800; font-family: 'Outfit', sans-serif; color: #1e293b;">$${Math.round(stats.avgNet).toLocaleString()}</div>
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Avg Net Salary</div>
            </div>
        </div>
        <div class="stat-mini-card" style="background: white; padding: 20px; border-radius: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #fffbeb; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">⏳</div>
            <div>
                <div style="font-size: 1.25rem; font-weight: 800; font-family: 'Outfit', sans-serif; color: #1e293b;">${stats.pendingCount}</div>
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Pending</div>
            </div>
        </div>
    `;
}

function renderSalaryRows(mode, filteredData = null) {
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    let salaries = filteredData;

    if (!salaries) {
        const currentUserId = appData.currentUser?.id || parseInt(localStorage.getItem('employee_id'));
        salaries = (appData.salaries || []).filter(s => mode === 'my' ? s.employeeId === currentUserId : true);
    }

    if (appData.isInitialLoading) return `<tr><td colspan="${mode === 'team' ? 8 : 6}" style="text-align: center; padding: 40px; color: #94a3b8;">Loading...</td></tr>`;

    if (salaries.length === 0) return `
        <tr>
            <td colspan="${mode === 'team' ? 8 : 6}" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px; filter: grayscale(1); opacity: 0.2;">💵</div>
                <div style="font-weight: 700; color: #64748b; font-size: 1.1rem; font-family: 'Outfit', sans-serif;">Empty Vault</div>
                <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 5px;">No salary records found for the selected criteria.</div>
            </td>
        </tr>
    `;

    return salaries.map(s => {
        const isPaid = s.status === 'paid';
        const badgeColor = isPaid ? '#10b981' : '#f59e0b';
        const badgeBg = isPaid ? '#f0fdf4' : '#fffbeb';
        const badgeText = isPaid ? 'PAID' : 'PENDING';

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                ${mode === 'team' ? `<td style="padding: 16px; font-weight: 700; color: #1e293b;">${s.employeeName}</td>` : ''}
                <td style="padding: 16px; color: #475569; font-weight: 500;">
                    <div style="font-weight: 700; color: #1e293b;">${new Date(0, s.month - 1).toLocaleString('en', { month: 'long' })}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">${s.year}</div>
                </td>
                <td style="padding: 16px; text-align: center; color: #6366f1; font-weight: 700;">${formatDuration(s.overtimeHours)}</td>
                <td style="padding: 16px; text-align: center; font-weight: 600; color: #6366f1;">${s.actualDays}d</td>
                <td style="padding: 16px; text-align: right; color: #64748b;">$${Math.round(s.basicSalary).toLocaleString()}</td>
                <td style="padding: 16px; text-align: right;">
                    <div style="font-weight: 800; color: #1e293b; font-size: 1rem;">$${Math.round(s.netSalary).toLocaleString()}</div>
                </td>
                <td style="padding: 16px; text-align: center;">
                    <button class="btn btn-sm btn-secondary" onclick="window.showSalaryDetail(${s.id})" style="padding: 4px 12px; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; gap: 4px; margin: 0 auto;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                    </button>
                </td>
                <td style="padding: 16px; text-align: center;">
                    <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; border: 1px solid ${badgeColor}30;">${badgeText}</span>
                </td>
                ${(mode === 'team' && roleLevel <= 2) ? `
                <td style="padding: 16px; text-align: center;">
                    ${!isPaid ? `
                        <button class="btn btn-sm btn-primary" onclick="window.confirmPayment(${s.id})" style="padding: 4px 12px; font-size: 0.7rem; font-weight: 700;">
                            Pay
                        </button>
                    ` : '<span style="color: #cbd5e1; font-size: 0.7rem;">Successed</span>'}
                </td>
                ` : ''}
            </tr>
        `;
    }).join('');
}

window.applyPayrollFilters = function () {
    const appData = getState();
    const mode = window.location.pathname.includes('team') ? 'team' : 'my';

    const nameVal = document.getElementById('pay-filter-name')?.value.toLowerCase() || '';
    const statusVal = document.getElementById('pay-filter-status').value;
    const monthVal = document.getElementById('pay-filter-month').value;
    const yearVal = document.getElementById('pay-filter-year').value;

    let records = (appData.salaries || []).filter(s => mode === 'my' ? s.employeeId === appData.currentUser?.id : true);

    if (nameVal) records = records.filter(r => r.employeeName.toLowerCase().includes(nameVal));
    if (statusVal) records = records.filter(r => r.status === statusVal);
    if (monthVal) records = records.filter(r => r.month === parseInt(monthVal));
    if (yearVal) records = records.filter(r => r.year === parseInt(yearVal));

    document.getElementById('payroll-rows-container').innerHTML = renderSalaryRows(mode, records);
    document.getElementById('payroll-stats-ribbon').innerHTML = renderSalaryStats(records);
};

window.switchSalaryTab = async function (tab) {
    const mode = window.location.pathname.includes('team') ? 'team' : 'my';
    const subRoute = tab === 'adjustments' ? 'salary-request' : 'payroll';

    // Use the global navigateTo from navigation module
    if (window.navigateTo) {
        window.navigateTo(`salary-${mode}/${subRoute}`);
    } else {
        // Fallback for direct testing
        currentSubview = tab;
        const contentArea = document.getElementById('content-area');
        if (contentArea) contentArea.innerHTML = renderSalary(mode);
    }
};

window.openAdjustmentModal = function () {
    const appData = getState();
    const employees = appData.employees || [];

    const content = `
        <div style="display: grid; gap: 16px; font-family: 'Inter', sans-serif;">
            <div class="filter-group">
                <label class="filter-label">Select Employee</label>
                <select id="adj-emp-id" class="pro-input">
                    ${employees.map(e => `<option value="${e.id}">${e.name} (${e.department})</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Target Salary (Month)</label>
                <input type="number" id="adj-salary" class="pro-input" placeholder="e.g. 2500">
            </div>
            <div class="filter-group">
                <label class="filter-label">Effective Date</label>
                <input type="date" id="adj-date" class="pro-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="filter-group">
                <label class="filter-label">Reason / Remark</label>
                <textarea id="adj-reason" class="pro-input" style="height: 100px; resize: none;" placeholder="Reason for increase or decrease..."></textarea>
            </div>
        </div>
    `;

    createModal({
        title: "Salary Adjustment Request",
        content: content,
        submitText: "Submit Request",
        onSubmit: async () => {
            const data = {
                employee_id: parseInt(document.getElementById('adj-emp-id').value),
                target_salary: parseFloat(document.getElementById('adj-salary').value),
                effective_date: document.getElementById('adj-date').value,
                reason: document.getElementById('adj-reason').value
            };

            if (!data.target_salary) {
                showToast("Please enter target salary", "error");
                return;
            }

            try {
                await submitSalaryAdjustment(data);
                showToast("Adjustment request submitted!", "success");
                await fetchSalaryAdjustments();
                window.switchSalaryTab('adjustments');
            } catch (e) {
                showToast(e.message, "error");
            }
        }
    });
};

window.processAdjustment = async function (id, action) {
    const verb = action === 'approve' ? 'Approve' : 'Reject';
    if (!confirm(`Are you sure you want to ${verb} this salary adjustment?`)) return;

    try {
        if (action === 'approve') await approveSalaryAdjustment(id);
        else await rejectSalaryAdjustment(id);

        showToast(`Request ${action}d successfully`, "success");
        await Promise.all([fetchSalaryAdjustments(), fetchPayroll()]);
        window.switchSalaryTab('adjustments');
    } catch (e) {
        showToast(e.message, "error");
    }
};

window.showAdjustmentReason = function (reason) {
    alert("Reason for adjustment:\n\n" + reason);
};

function renderAdjustmentsUI(mode) {
    return `
        <div class="card" style="border-radius: 16px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden;">
            <div class="table-container" style="margin: 0;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 16px; text-align: left; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Employee</th>
                            <th style="padding: 16px; text-align: right; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Current</th>
                            <th style="padding: 16px; text-align: right; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Target</th>
                            <th style="padding: 16px; text-align: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Effective Date</th>
                            <th style="padding: 16px; text-align: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Status</th>
                            <th style="padding: 16px; text-align: center; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="adjustment-rows-container">
                        ${renderAdjustmentRows(mode)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAdjustmentRows(mode) {
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const adjs = appData.salaryAdjustments || [];

    if (adjs.length === 0) return `
        <tr>
            <td colspan="6" style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px; filter: grayscale(1); opacity: 0.2;">📄</div>
                <div style="font-weight: 700; color: #64748b; font-size: 1.1rem; font-family: 'Outfit', sans-serif;">No Requests Yet</div>
                <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 5px;">Salary change requests will appear here once submitted.</div>
            </td>
        </tr>
    `;

    return adjs.map(a => {
        let statusColor = '#f59e0b'; // pending
        let statusBg = '#fffbeb';
        if (a.status === 'approved') { statusColor = '#10b981'; statusBg = '#f0fdf4'; }
        if (a.status === 'rejected') { statusColor = '#ef4444'; statusBg = '#fef2f2'; }

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 16px;">
                    <div style="font-weight: 700; color: #1e293b;">${a.employee_name}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">Req by: ${a.requester_name}</div>
                </td>
                <td style="padding: 16px; text-align: right; font-weight: 600; color: #64748b;">$${Math.round(a.current_salary).toLocaleString()}</td>
                <td style="padding: 16px; text-align: right; font-weight: 700; color: #6366f1;">$${Math.round(a.target_salary).toLocaleString()}</td>
                <td style="padding: 16px; text-align: center; color: #475569;">${a.effective_date}</td>
                <td style="padding: 16px; text-align: center;">
                    <span style="padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusColor}30; text-transform: uppercase;">${a.status}</span>
                </td>
                <td style="padding: 16px; text-align: center;">
                    ${(a.status === 'pending' && roleLevel <= 2) ? `
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button class="btn btn-sm btn-primary" onclick="window.processAdjustment(${a.id}, 'approve')" style="background: #10b981; border: none; padding: 4px 12px; font-size: 0.7rem;">Approve</button>
                            <button class="btn btn-sm" onclick="window.processAdjustment(${a.id}, 'reject')" style="background: #ef4444; color: white; border: none; padding: 4px 12px; font-size: 0.7rem;">Reject</button>
                        </div>
                    ` : `
                        <button class="btn btn-sm btn-secondary" onclick="window.showAdjustmentReason('${a.reason || 'No reason provided'}')" style="padding: 4px 12px; font-size: 0.7rem; font-weight: 700;">Reason</button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

window.resetPayrollFilters = function () {
    ['pay-filter-name', 'pay-filter-status', 'pay-filter-month', 'pay-filter-year'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    window.applyPayrollFilters();
};

window.generatePayrollBatch = async function () {
    const month = prompt("Enter Calculation Month (1-12):", new Date().getMonth() + 1);
    if (!month) return;
    const year = prompt("Enter Year:", new Date().getFullYear());
    if (!year) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/payroll/generate?month=${month}&year=${year}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            showToast("Salary records processed successfully!", "success");
            await fetchPayroll();
            window.applyPayrollFilters();
        } else {
            const err = await response.json();
            showToast("Error: " + (err.detail || "Calculation Failed"), "error");
        }
    } catch (e) {
        showToast("Network Error", "error");
    }
};

window.showSalaryDetail = function (id) {
    const appData = getState();
    const s = (appData.salaries || []).find(x => x.id === id);
    if (!s) return;

    const monthName = new Date(0, s.month - 1).toLocaleString('en', { month: 'long' });

    // Calculate breakdown
    const gross = s.grossSalary || (s.basicSalary + (s.bonus || 0) + 80 - (s.deduction || 0));
    const tax = gross * 0.1;

    const content = `
        <div style="font-family: 'Inter', sans-serif;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f1f5f9;">
                <div>
                    <div style="font-size: 0.85rem; color: #64748b; font-weight: 600;">EMPLOYEE</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #1e293b;">${s.employeeName}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.85rem; color: #64748b; font-weight: 600;">PERIOD</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #1e293b;">${monthName} ${s.year}</div>
                </div>
            </div>

            <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                    <span style="color: #64748b;">Base Salary</span>
                    <span style="font-weight: 700; color: #1e293b;">$${Math.round(s.basicSalary).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                    <span style="color: #64748b;">Worked Days (${s.actualDays} / 24)</span>
                    <span style="font-weight: 700; color: #1e293b;">$${Math.round((s.actualDays / 24) * s.basicSalary).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem; padding-top: 8px; border-top: 1px dashed #f1f5f9;">
                    <span style="color: #10b981; font-weight: 600;">Overtime</span>
                    <span style="font-weight: 700; color: #10b981;">+$${Math.round(s.bonus || 0).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                    <span style="color: #3b82f6; font-weight: 600;">Allowance</span>
                    <span style="font-weight: 700; color: #3b82f6;">+$${Math.round(s.allowance || 80).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem; padding-bottom: 8px; border-bottom: 1px dashed #f1f5f9;">
                    <span style="color: #ef4444; font-weight: 600;">Attendance</span>
                    <span style="font-weight: 700; color: #ef4444;">-$${Math.round(s.deduction || 0).toLocaleString()}</span>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 700; color: #1e293b;">Gross Salary</span>
                    <span style="font-weight: 800; color: #1e293b;">$${Math.round(gross).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span style="color: #64748b;">Tax (10%)</span>
                    <span style="font-weight: 600; color: #ef4444;">-$${Math.round(tax).toLocaleString()}</span>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: linear-gradient(135deg, #1e293b, #334155); border-radius: 12px; color: white;">
                <div>
                    <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; opacity: 0.8; letter-spacing: 0.05em;">Total Net Payable</div>
                    <div style="font-size: 0.85rem; opacity: 0.6;">Transferred via Bank</div>
                </div>
                <div style="font-size: 1.75rem; font-weight: 900; font-family: 'Outfit', sans-serif;">$${Math.round(s.netSalary).toLocaleString()}</div>
            </div>
        </div>
    `;

    createModal({
        title: "Salary View",
        content: content,
        submitText: "Close",
        cancelText: "Print PDF",
        onSubmit: () => { },
        onCancel: () => {
            window.print();
        }
    });
};

window.confirmPayment = async function (id) {
    if (!confirm("Finalize this USD payment? The payment date will be recorded as today.")) return;

    try {
        await markPayrollAsPaid(id);
        showToast("USD Payment Recorded!", "success");
        await fetchPayroll();
        window.applyPayrollFilters();
    } catch (e) {
        showToast(e.message, "error");
    }
};

window.exportPayrollToCSV = function () {
    const tableBody = document.getElementById('payroll-rows-container');
    const rows = Array.from(tableBody.querySelectorAll('tr')).filter(tr => !tr.innerText.includes('No salary records'));

    if (rows.length === 0) {
        alert("No records to export.");
        return;
    }

    let csv = "Employee,Period,Worked Days,Base Salary,Net Amount,Status\n";
    rows.forEach(tr => {
        const cols = Array.from(tr.querySelectorAll('td')).map((td, idx) => {
            // Skip the Details column (Breakdown)
            if (idx === 4) return null; // 0:Name, 1:Period, 2:Worked, 3:Base, 4:Breakdown

            let val = td.innerText.trim().replace(/\n/g, ' ');
            if (val.includes('$')) val = val.replace(/\$/g, '');
            if (val.includes('+')) val = val.replace(/\+/g, '');
            if (val.includes('-')) val = val.replace(/-/g, '');
            if (val === 'View') return null;

            return `"\t${val}"`;
        }).filter(v => v !== null);
        csv += cols.join(',') + "\n";
    });

    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Salary_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
