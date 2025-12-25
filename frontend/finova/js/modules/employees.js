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

    if (appData.isInitialLoading) {
        return '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">Loading employees...</td></tr>';
    }

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
            <td>${emp.position}</td>
            <td>${emp.department}</td>
            <td><span class="badge badge-${emp.status === 'active' ? 'success' : 'warning'}">${emp.status === 'active' ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="viewEmployee(${emp.id})">View</button>
                    ${roleLevel < emp.roleLevel ? `
                        <button class="btn btn-small btn-primary" onclick="editEmployee(${emp.id})">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
                    ` : ''}
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
window.viewEmployee = async function (id) {
    const { getEmployee } = await import('../core/api.js');
    const { createModal } = await import('../utils/modal.js');

    try {
        const emp = await getEmployee(id);
        const content = `
            <style>
                .detail-grid { display: grid; grid-template-columns: 100px 1fr; gap: 10px 20px; padding: 10px; }
                .detail-label { font-weight: 600; color: #64748b; font-size: 0.9rem; }
                .detail-value { font-size: 1rem; color: #1e293b; }
                .detail-section { margin-top: 20px; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
            </style>
            <div class="detail-grid">
                <span class="detail-label">Full Name:</span> <span class="detail-value">${emp.full_name}</span>
                <span class="detail-label">Username:</span> <span class="detail-value">${emp.username}</span>
                <span class="detail-label">Email:</span> <span class="detail-value">${emp.email}</span>
                <span class="detail-label">Phone:</span> <span class="detail-value">${emp.phone || 'N/A'}</span>
            </div>
            <div class="detail-section">
                <div class="detail-grid">
                    <span class="detail-label">Dept:</span> <span class="detail-value">${emp.department_name}</span>
                    <span class="detail-label">Position:</span> <span class="detail-value">${emp.position_name}</span>
                    <span class="detail-label">Status:</span> <span class="detail-value"><span class="badge badge-${emp.status === 'active' ? 'success' : 'warning'}">${emp.status.toUpperCase()}</span></span>
                    <span class="detail-label">Hire Date:</span> <span class="detail-value">${new Date(emp.hire_date).toLocaleDateString()}</span>
                    <span class="detail-label">Salary:</span> <span class="detail-value" style="color:#059669; font-weight:bold;">$${emp.salary?.toLocaleString()}</span>
                </div>
            </div>
        `;

        createModal({
            title: `Employee Profile: ${emp.full_name}`,
            content: content,
            submitText: 'Close',
            isStatic: true
        });
    } catch (error) {
        showToast(error.message, 'danger');
    }
};

window.deleteEmployee = async function (id) {
    if (!confirm('Are you sure you want to delete this employee from the system?')) return;

    try {
        await apiDeleteEmployee(id);
        showToast('Employee deleted successfully', 'success');

        // Refresh data and re-render
        const { fetchEmployees } = await import('../core/api.js');
        await fetchEmployees();
        const content = document.getElementById('content-area');
        if (content) content.innerHTML = renderEmployees();
        setupEmployeesListeners();
    } catch (error) {
        showToast(error.message, 'danger');
    }
};

window.openAddEmployeeModal = async function () {
    const { fetchMetadata } = await import('../core/api.js');
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    // ALWAYS fetch fresh metadata - no caching
    console.log('🔄 Force fetching fresh metadata...');
    await fetchMetadata();

    // Wait a tiny bit for state to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Smart filtering based on creator's role
    let filteredDepartments = [...(appData.departments_raw || [])];
    let filteredPositions = [...(appData.positions_raw || [])];

    console.log('📊 Available departments:', filteredDepartments);
    console.log('📊 Available positions:', filteredPositions);
    console.log('👤 User role level:', roleLevel);

    if (roleLevel === 1) {
        // Admin creates: Director ($3000) or HR Manager ($2000)
        filteredDepartments = filteredDepartments.filter(d => {
            const name = d.name.toLowerCase();
            const match = name.includes('member') || name.includes('council') ||
                name.includes('hr') || name.includes('human');
            console.log(`Dept "${d.name}" matches: ${match}`);
            return match;
        });
        filteredPositions = filteredPositions.filter(p => {
            const name = p.name.toLowerCase();
            const match = name.includes('director') ||
                (name.includes('manager') && name.includes('hr'));
            console.log(`Pos "${p.name}" matches: ${match}`);
            return match;
        });
    } else if (roleLevel === 2) {
        // HR General creates: Manager for ANY department, Fixed $2000
        // Department: ONLY business departments (exclude Member Council & HR Department)
        // Position: ONLY Manager/Trưởng phòng
        filteredDepartments = filteredDepartments.filter(d => {
            const name = d.name.toLowerCase();
            const isBusinessDept = !name.includes('member') &&
                !name.includes('council') &&
                !name.includes('hr') &&
                !name.includes('human');
            console.log(`Dept "${d.name}" is business dept: ${isBusinessDept}`);
            return isBusinessDept;
        });
        filteredPositions = filteredPositions.filter(p => {
            const name = p.name.toLowerCase();
            return name.includes('staff') && name.includes('hr');
        });
        console.log('HR Manager - Business departments only (5 total)');
    } else if (roleLevel === 3) {
        // HR Staff creates: Normal Staff (ONLY their own dept!)
        const currentDeptId = parseInt(localStorage.getItem('department_id'));
        console.log('==========================================');
        console.log('🔍 LEVEL 3 DEBUG:');
        console.log('localStorage.department_id:', localStorage.getItem('department_id'));
        console.log('parseInt result:', currentDeptId);
        console.log('Before filter - departments count:', filteredDepartments.length);
        console.log('Departments:', filteredDepartments.map(d => `${d.id}: ${d.name}`));
        console.log('==========================================');

        if (currentDeptId) {
            filteredDepartments = filteredDepartments.filter(d => {
                const match = d.id === currentDeptId;
                console.log(`  Dept ${d.id} (${d.name}) === ${currentDeptId}? ${match}`);
                return match;
            });
        } else {
            console.error('❌ currentDeptId is null/undefined! Not filtering departments!');
        }

        console.log('After filter - departments count:', filteredDepartments.length);

        filteredPositions = filteredPositions.filter(p => p.name.toLowerCase() === 'staff');
        console.log('HR Staff - Own department ONLY');
    }

    console.log('Filtered departments:', filteredDepartments);
    console.log('Filtered positions:', filteredPositions);

    const { createModal } = window.modalUtils || {};
    const openCreateModal = async () => {
        const { createModal } = await import('../utils/modal.js');

        const content = `
            <style>
                #add-employee-form {
                    font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                #add-employee-form .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                #add-employee-form .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                #add-employee-form .form-group.full-width {
                    grid-column: 1 / -1;
                }
                #add-employee-form label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                }
                #add-employee-form label .required {
                    color: #ef4444;
                    margin-left: 2px;
                }
                #add-employee-form input,
                #add-employee-form select {
                    padding: 10px 14px;
                    border: 1.5px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 15px;
                    font-weight: 400;
                    transition: all 0.2s ease;
                    background: white;
                }
                #add-employee-form input:focus,
                #add-employee-form select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                #add-employee-form input.salary-display {
                    background: #f9fafb;
                    color: #059669;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: not-allowed;
                }
                #add-employee-form .salary-hint {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 4px;
                    font-style: italic;
                }
            </style>
            <form id="add-employee-form" class="form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Full Name<span class="required">*</span></label>
                        <input type="text" name="full_name" required>
                    </div>
                    <div class="form-group">
                        <label>Username<span class="required">*</span></label>
                        <input type="text" name="username" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email<span class="required">*</span></label>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <input type="text" id="email-prefix" placeholder="username" required style="flex: 1;">
                            <span style="color: #6b7280; font-weight: 500;">@finova.vn</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone" placeholder="0123456789">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Password<span class="required">*</span></label>
                        <input type="password" name="password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Date of Birth</label>
                        <input type="date" name="date_of_birth">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Department<span class="required">*</span></label>
                        <select name="department_id" id="department-select" required>
                            <option value="">Select Department</option>
                            ${filteredDepartments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Position<span class="required">*</span></label>
                        <select name="position_id" id="position-select" required>
                            <option value="">Select Position</option>
                            ${filteredPositions.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Hire Date<span class="required">*</span></label>
                        <input type="date" name="hire_date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Salary</label>
                        <input type="text" id="salary-display" class="salary-display" value="" readonly>
                    </div>
                </div>
            </form>
        `;

        createModal({
            title: '+ Add New Staff Member',
            content: content,
            submitText: 'Create Account',
            onSubmit: async () => {
                const form = document.getElementById('add-employee-form');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // Construct full email from prefix
                const emailPrefix = document.getElementById('email-prefix').value;
                data.email = `${emailPrefix}@finova.vn`;

                // Auto-set hire_date to today (required by backend)
                data.hire_date = new Date().toISOString().split('T')[0];

                // Convert IDs to int
                data.department_id = parseInt(data.department_id);
                data.position_id = parseInt(data.position_id);
                // Don't send role_id - backend will auto-assign
                // Don't send salary - backend will auto-calculate

                // Clean up empty optional fields
                if (!data.phone) delete data.phone;
                // ALWAYS remove date_of_birth - causing validation errors
                delete data.date_of_birth;

                try {
                    const { createEmployee, fetchEmployees } = await import('../core/api.js');
                    await createEmployee(data);
                    showToast('Employee created successfully with auto-calculated salary!', 'success');

                    // Refresh and re-render
                    await fetchEmployees();
                    const contentArea = document.getElementById('content-area');
                    if (contentArea) contentArea.innerHTML = renderEmployees();
                    setupEmployeesListeners();
                } catch (error) {
                    console.error('Create employee error:', error);
                    const errorMsg = error.message || error.detail || JSON.stringify(error) || 'Failed to create employee';
                    showToast(errorMsg, 'danger');
                }
            }
        });

        // Add listener to update salary display based on position selection
        const positionSelect = document.getElementById('position-select');
        const deptSelect = document.getElementById('department-select');
        const salaryDisplay = document.getElementById('salary-display');

        const updateSalaryDisplay = () => {
            const posId = positionSelect.value;
            const deptId = deptSelect.value;
            if (!posId) {
                salaryDisplay.value = '';
                return;
            }

            const position = filteredPositions.find(p => p.id == posId);
            const department = filteredDepartments.find(d => d.id == deptId);

            let salary = 1400; // default
            if (position) {
                const posName = position.name.toLowerCase();
                const deptName = department ? department.name.toLowerCase() : '';

                if (posName.includes('director') || posName.includes('giám đốc')) {
                    salary = 3000;
                } else if (posName.includes('admin') && posName.includes('hr')) {
                    salary = 2500;
                } else if (posName.includes('manager') || posName.includes('trưởng')) {
                    salary = 2000;
                } else if (posName.includes('hr') && posName.includes('staff')) {
                    salary = 1800;
                } else if (deptName.includes('it') || deptName.includes('tech')) {
                    salary = 1600;
                } else if (deptName.includes('finance') || deptName.includes('accounting')) {
                    salary = 1600;
                } else if (deptName.includes('sales')) {
                    salary = 1500;
                } else if (deptName.includes('operation')) {
                    salary = 1500;
                } else if (deptName.includes('marketing')) {
                    salary = 1400;
                } else if (deptName.includes('admin')) {
                    salary = 1400;
                } else if (deptName.includes('customer')) {
                    salary = 1300;
                }
            }

            salaryDisplay.value = `$${salary.toLocaleString()} / month`;
        };

        positionSelect.addEventListener('change', updateSalaryDisplay);
        deptSelect.addEventListener('change', updateSalaryDisplay);
    };

    openCreateModal();
};

window.editEmployee = async function (id) {
    const { getEmployee, updateEmployee, fetchMetadata, fetchEmployees } = await import('../core/api.js');
    const { createModal } = await import('../utils/modal.js');
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    try {
        const [employee, _] = await Promise.all([
            getEmployee(id),
            fetchMetadata()
        ]);

        const filteredDepartments = [...(appData.departments_raw || [])];
        const filteredPositions = [...(appData.positions_raw || [])];

        const content = `
            <style>
                #edit-employee-form .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
                #edit-employee-form .form-group { display: flex; flex-direction: column; gap: 6px; }
                #edit-employee-form label { font-size: 14px; font-weight: 500; color: #374151; }
                #edit-employee-form input, #edit-employee-form select { padding: 10px 14px; border: 1.5px solid #d1d5db; border-radius: 6px; font-size: 15px; }
                #edit-employee-form input.readonly { background: #f3f4f6; cursor: not-allowed; }
            </style>
            <form id="edit-employee-form" class="form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" value="${employee.full_name}" required>
                    </div>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" value="${employee.username}" class="readonly" readonly>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="${employee.email}" required>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone" value="${employee.phone || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Department</label>
                        <select name="department_id" id="edit-dept-select" required>
                            ${filteredDepartments.map(d => `<option value="${d.id}" ${d.id === employee.department_id ? 'selected' : ''}>${d.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Position</label>
                        <select name="position_id" id="edit-pos-select" required>
                            ${filteredPositions.map(p => `<option value="${p.id}" ${p.id === employee.position_id ? 'selected' : ''}>${p.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Status</label>
                        <select name="status">
                            <option value="active" ${employee.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${employee.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Salary</label>
                        <input type="text" id="edit-salary-display" value="$${employee.salary ? employee.salary.toLocaleString() : '0'}" class="readonly" readonly>
                    </div>
                </div>
            </form>
        `;

        createModal({
            title: `Edit Employee: ${employee.full_name}`,
            content: content,
            submitText: 'Save Changes',
            onSubmit: async () => {
                const form = document.getElementById('edit-employee-form');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // Convert IDs
                data.department_id = parseInt(data.department_id);
                data.position_id = parseInt(data.position_id);

                try {
                    await updateEmployee(id, data);
                    showToast('Employee updated successfully!', 'success');
                    await fetchEmployees();
                    const contentArea = document.getElementById('content-area');
                    if (contentArea) contentArea.innerHTML = renderEmployees();
                    setupEmployeesListeners();
                } catch (error) {
                    showToast(error.message, 'danger');
                }
            }
        });

        // Add salary preview logic
        const editPosSelect = document.getElementById('edit-pos-select');
        const editDeptSelect = document.getElementById('edit-dept-select');
        const editSalaryDisplay = document.getElementById('edit-salary-display');

        const updatePreview = () => {
            const posId = editPosSelect.value;
            const deptId = editDeptSelect.value;
            const position = filteredPositions.find(p => p.id == posId);
            const department = filteredDepartments.find(d => d.id == deptId);

            let salary = 1400;
            if (position) {
                const posName = position.name.toLowerCase();
                const deptName = department ? department.name.toLowerCase() : '';
                if (posName.includes('director')) salary = 3000;
                else if (posName.includes('manager')) salary = 2000;
                else if (posName.includes('hr') && posName.includes('staff')) salary = 1800;
                else if (deptName.includes('it') || deptName.includes('tech') || deptName.includes('finance')) salary = 1600;
                else if (deptName.includes('sales') || deptName.includes('operation')) salary = 1500;
            }
            editSalaryDisplay.value = `$${salary.toLocaleString()} / month`;
        };

        editPosSelect.addEventListener('change', updatePreview);
        editDeptSelect.addEventListener('change', updatePreview);

    } catch (error) {
        showToast(error.message, 'danger');
    }
};
