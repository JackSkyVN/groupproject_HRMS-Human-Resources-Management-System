/**
 * Payroll Module - Salary Management
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';
import { showToast } from '../utils/toast.js';

export function renderSalary(mode = 'my') {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const title = mode === 'my' ? 'My Salary' : 'Payroll Management';

    return `
        <div class="page-header">
            <h1>${title}</h1>
            ${(mode === 'team' && roleLevel <= 2) ? `
                <button class="btn btn-primary" onclick="generatePayroll()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v20M2 12h20"/>
                    </svg>
                    Generate Payroll
                </button>
            ` : ''}
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Salary Details</h2>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            ${mode === 'team' ? '<th>Employee</th>' : ''}
                            <th>Month/Year</th>
                            <th>Base Salary</th>
                            <th>Net Salary</th>
                            <th>Status</th>
                            <th>Payment Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderSalaryRows(mode)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderSalaryRows(mode) {
    const appData = getState();
    let salaries = appData.salaries || [];

    if (mode === 'my') {
        salaries = salaries.filter(s => s.employeeId === appData.currentUser?.id);
    }

    if (salaries.length === 0) {
        const colspan = mode === 'team' ? 6 : 5;
        return `<tr><td colspan="${colspan}" style="text-align: center; padding: 40px;">No salary data found</td></tr>`;
    }

    return salaries.map(salary => {
        const badgeClass = salary.status === 'paid' ? 'success' : 'warning';
        const statusMap = {
            'paid': 'Paid',
            'pending': 'Processing'
        };
        const statusText = statusMap[salary.status] || 'Processing';

        return `
            <tr>
                ${mode === 'team' ? `<td><strong>${salary.employeeName}</strong></td>` : ''}
                <td>${salary.month}/${salary.year}</td>
                <td>${(salary.baseSalary || 0).toLocaleString()} VND</td>
                <td><strong style="color: #1e293b;">${(salary.netSalary || 0).toLocaleString()} VND</strong></td>
                <td><span class="badge badge-${badgeClass}">${statusText}</span></td>
                <td>${salary.paymentDate || '-'}</td>
            </tr>
        `;
    }).join('');
}

window.generatePayroll = async function () {
    const token = localStorage.getItem('token');
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    if (!confirm(`Do you want to generate payroll for all employees for ${month}/${year}?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/payroll/generate?month=${month}&year=${year}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("Payroll generated successfully!", "success");
            import('../core/api.js').then(m => m.fetchDashboardData().then(() => {
                const content = document.getElementById('content-area');
                if (content) content.innerHTML = renderSalary('team');
            }));
        } else {
            const err = await res.json();
            showToast("Error: " + (err.detail || "Could not generate payroll"), "error");
        }
    } catch (e) {
        showToast("Connection error", "error");
    }
};
