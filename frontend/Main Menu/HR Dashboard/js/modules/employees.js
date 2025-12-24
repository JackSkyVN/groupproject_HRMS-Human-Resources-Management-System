/**
 * Employees Module - Staff Management
 */

import { getState } from '../core/state.js';
import { deleteEmployee as apiDeleteEmployee } from '../core/api.js';
import { showToast } from '../utils/toast.js';

export function renderEmployees() {
    return `
        <div class="page-header">
            <h1>Staff Management</h1>
        </div>

        <div class="card">
            <div class="card-header" style="justify-content: flex-end;">
                ${renderAddEmployeeButton()}
            </div>
            
            <div class="search-bar">
                <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input type="text" class="search-input" id="employee-search" placeholder="Search employees by name, department...">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Employee Code</th>
                            <th>Position</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="employees-table-body">
                        ${renderEmployeesRows()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAddEmployeeButton() {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    // Only Admin (L1), HR General (L2) and HR Dept (L3) can see the Add button
    if (roleLevel <= 3) {
        return `<button class="btn btn-primary" onclick="openAddEmployeeModal()">+ Add Employee</button>`;
    }
    return '';
}

export function renderEmployeesRows(searchTerm = '') {
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    const filtered = (appData.employees || []).filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (filtered.length === 0) {
        return '<tr><td colspan="6" style="text-align: center; padding: 40px;">No employees found</td></tr>';
    }

    return filtered.map(emp => `
        <tr>
            <td><strong>${emp.name}</strong></td>
            <td>${emp.employeeCode || '-'}</td>
            <td>${emp.position}</td>
            <td>${emp.department}</td>
            <td><span class="badge badge-${emp.status === 'active' ? 'success' : 'warning'}">${emp.status === 'active' ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="viewEmployee(${emp.id})">View</button>
                    ${roleLevel < emp.roleLevel ? `<button class="btn btn-small btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

export function setupEmployeesListeners() {
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const tbody = document.getElementById('employees-table-body');
            if (tbody) tbody.innerHTML = renderEmployeesRows(e.target.value);
        });
    }
}

// Global functions
window.viewEmployee = function (id) {
    showToast('Employee details feature coming soon', 'info');
};

window.deleteEmployee = async function (id) {
    if (!confirm('Are you sure you want to delete this employee from the system?')) return;

    try {
        await apiDeleteEmployee(id);
        showToast('Employee deleted successfully', 'success');
        import('../core/api.js').then(m => m.fetchDashboardData().then(() => {
            const content = document.getElementById('content-area');
            if (content) content.innerHTML = renderEmployees();
            setupEmployeesListeners();
        }));
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.openAddEmployeeModal = function () {
    showToast('Add Employee feature will be added in a future update', 'info');
};
