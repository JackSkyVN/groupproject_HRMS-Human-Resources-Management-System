/**
 * Module Nhân Viên - Quản lý Nhân Viên
 */

import { getState } from '../core/state.js';
import { deleteEmployee as apiDeleteEmployee } from '../core/api.js';
import { showToast } from '../utils/toast.js';
import { isDepartmentManagedByPosition } from '../utils/helpers.js';
import { showConfirmDialog } from '../utils/dialogs.js';


export function renderEmployees() {
    return `
        <div class="page-header">
            <h1>Employee Management</h1>
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
    // Chỉ Admin (L1), HR General (L2) và HR Dept (L3) mới thấy nút Add
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
    const currentPosition = localStorage.getItem('position_name') || '';
    let data = [...(appData.employees || [])];

    // Áp dụng lọc Department cho HR Staff (Level 3)
    if (roleLevel === 3) {
        data = data.filter(emp => isDepartmentManagedByPosition(emp.department, currentPosition));
    }

    const filtered = data.filter(emp =>
        (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
        return '<tr><td colspan="6" style="text-align: center; padding: 40px;">No employees found</td></tr>';
    }

    return filtered.map(emp => `
        <tr>
            <td><strong>${emp.name || '-'}</strong></td>
            <td>${emp.position || '-'}</td>
            <td>${emp.department || '-'}</td>
            <td><span class="badge badge-${emp.status === 'active' ? 'success' : 'warning'}">${(emp.status || 'N/A').toUpperCase()}</span></td>
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

// Hàm global
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
                <span class="detail-label">Full Name:</span> <span class="detail-value">${emp.full_name || '-'}</span>
                <span class="detail-label">Username:</span> <span class="detail-value">${emp.username || '-'}</span>
                <span class="detail-label">Email:</span> <span class="detail-value">${emp.email || '-'}</span>
                <span class="detail-label">Phone:</span> <span class="detail-value">${emp.phone || 'N/A'}</span>
            </div>
            <div class="detail-section">
                <div class="detail-grid">
                    <span class="detail-label">Dept:</span> <span class="detail-value">${emp.department_name || 'N/A'}</span>
                    <span class="detail-label">Position:</span> <span class="detail-value">${emp.position_name || 'N/A'}</span>
                    <span class="detail-label">Status:</span> <span class="detail-value"><span class="badge badge-${emp.status === 'active' ? 'success' : 'warning'}">${(emp.status || 'N/A').toUpperCase()}</span></span>
                    <span class="detail-label">Hire Date:</span> <span class="detail-value">${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : '-'}</span>
                    <span class="detail-label">Salary:</span> <span class="detail-value" style="color:#059669; font-weight:bold;">${emp.salary ? '$' + emp.salary.toLocaleString() : '-'}</span>
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
    showConfirmDialog('Are you sure you want to delete this employee from the system?', async () => {
        try {
            await apiDeleteEmployee(id);
            showToast('Employee deleted', 'success');

            // Làm mới dữ liệu và re-render
            const { fetchEmployees, fetchPayroll } = await import('../core/api.js');
            await fetchEmployees();
            await fetchPayroll();
            const appData = getState();
            const contentArea = document.getElementById('content-area');
            if (contentArea) {
                contentArea.innerHTML = renderEmployees(); // Giả sử renderEmployees() là hàm đúng
            }
            setupEmployeesListeners();
        } catch (error) {
            showToast(error.message, 'danger');
        }
    });
};

window.openAddEmployeeModal = async function () {
    const { fetchMetadata } = await import('../core/api.js');
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    // LUÔN LUÔN fetch metadata mới - không cache
    console.log('Force fetching fresh metadata...');
    await fetchMetadata();

    // Đợi một chút để state cập nhật
    await new Promise(resolve => setTimeout(resolve, 100));

    // Lọc thông minh dựa trên role của người tạo
    let filteredDepartments = [...(appData.departments_raw || [])];
    let filteredPositions = [...(appData.positions_raw || [])];

    console.log('Available departments:', filteredDepartments);
    console.log('Available positions:', filteredPositions);
    console.log('👤 User role level:', roleLevel);

    if (roleLevel === 1) {
        // Admin tạo: Director ($3000) hoặc HR Manager ($2000)
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
        // HR Manager tạo HR Staff (Level 3)
        // HAI KỊCH BẢN:
        // 1. HR Department -> Hiện 5 vị trí HR Staff cụ thể
        // 2. Departments khác (có leadership) -> Chỉ hiện leadership positions

        // Departments cần loại trừ (không có leadership positions)
        const excludedDeptIds = [11, 12, 15, 17, 27]; // DN-QN, Da Nang, Ha Lam, Land, Tender Expert

        // Bộ lọc: Giữ departments CÓ leadership positions
        filteredDepartments = filteredDepartments.filter(d => {
            // Loại trừ Members Council (Admin tạo những cái này)
            const name = d.name.toLowerCase();
            if (name.includes('member') || name.includes('council')) {
                console.log(`Excluding Members Council: ${d.name}`);
                return false;
            }

            // Loại trừ departments không có leadership
            if (excludedDeptIds.includes(d.id)) {
                console.log(`Excluding no-leadership dept: ${d.name}`);
                return false;
            }

            return true;
        });

        // Không lọc positions ở đây - sẽ làm động trong updateSalaryDisplay
        console.log('HR Manager - Can create HR Staff for departments with leadership');
    } else if (roleLevel === 3) {
        // HR Staff tạo: Nhân viên thường cho nhóm được giao
        const currentPosition = localStorage.getItem('position_name') || '';
        console.log('🔍 LEVEL 3 GROUP FILTERING: Position:', currentPosition);

        filteredDepartments = filteredDepartments.filter(d => {
            const match = isDepartmentManagedByPosition(d.name, currentPosition);
            console.log(`  Dept ${d.name} managed by ${currentPosition}? ${match}`);
            return match;
        });

        filteredPositions = filteredPositions.filter(p => p.name.toLowerCase() === 'employee');
        console.log('HR Staff - Assigned Grouping ONLY');
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
                    font-weight: 700;
                    font-size: 16px;
                    cursor: not-allowed;
                    border: 1.5px solid #05966933;
                }
                #add-employee-form .salary-hint {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 4px;
                    font-style: italic;
                }
                #add-employee-form select:disabled {
                    background: #f3f4f6;
                    cursor: not-allowed;
                    opacity: 0.7;
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
                            ${filteredDepartments.map(d => `<option value="${d.id}">${d.name || '-'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Position<span class="required">*</span></label>
                        <select name="position_id" id="position-select" required disabled>
                            <option value="">Select Department First</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Hire Date<span class="required">*</span></label>
                        <input type="date" name="hire_date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Estimated Salary</label>
                        <input type="text" id="salary-display" class="salary-display" value="" readonly>
                    </div>
                </div>
            </form>
        `;

        createModal({
            title: '+ Add New Employee',
            content: content,
            submitText: 'Create Account',
            onSubmit: async () => {
                const form = document.getElementById('add-employee-form');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // Xây dựng email đầy đủ từ prefix
                const emailPrefix = document.getElementById('email-prefix').value;
                data.email = `${emailPrefix}@finova.vn`;

                // Tự động set hire_date thành hôm nay (backend yêu cầu)
                data.hire_date = new Date().toISOString().split('T')[0];

                // Chuyển IDs sang int
                data.department_id = parseInt(data.department_id);
                data.position_id = parseInt(data.position_id);

                // Tính và gửi salary dựa trên position
                const positionSelect = document.getElementById('position-select');
                const deptSelect = document.getElementById('department-select');
                const posId = positionSelect.value;
                const deptId = deptSelect.value;

                if (posId && deptId) {
                    const position = appData.positions_raw.find(p => p.id == posId);
                    const department = appData.departments_raw.find(d => d.id == deptId);

                    let salary = 1400; // base default
                    if (position) {
                        const posName = (position.name || '').toLowerCase();
                        const dName = department ? (department.name || '').toLowerCase() : '';

                        if (posName.includes('chairman')) salary = 5000;
                        else if (posName.includes('director')) salary = 4000;
                        else if (posName.includes('deputy director')) salary = 3500;
                        else if (posName.includes('manager') || posName.includes('trưởng')) salary = 2000;
                        else if (posName.includes('acting') || posName.includes('quyền')) salary = 2800;
                        else if (dName.includes('it') || dName.includes('tech')) salary = 2500;
                        else if (dName.includes('hr') || dName.includes('human')) salary = 2200;
                        else if (dName.includes('finance')) salary = 2300;
                        else if (dName.includes('sales')) salary = 1800;
                        else if (dName.includes('marketing')) salary = 1700;
                        else salary = 1900;
                    }

                    data.salary = salary;
                    console.log(`💰 Calculated salary: ${salary} for position: ${position?.name}`);
                }

                // Không gửi role_id - backend sẽ tự assign

                // Dọn dẹp các field tùy chọn rỗng
                if (!data.phone) delete data.phone;
                // LUÔN loại bỏ date_of_birth - gây lỗi validation
                delete data.date_of_birth;

                try {
                    const { createEmployee, fetchEmployees } = await import('../core/api.js');
                    console.log('📤 Sending data to backend:', data);
                    await createEmployee(data);
                    showToast('Employee created', 'success');

                    // Làm mới và re-render
                    const { fetchPayroll } = await import('../core/api.js');
                    await fetchEmployees();
                    await fetchPayroll();
                    const contentArea = document.getElementById('content-area');
                    if (contentArea) {
                        contentArea.innerHTML = renderEmployees();
                        setupEmployeesListeners();
                    }
                } catch (error) {
                    console.error('Create employee error:', error);
                    const errorMsg = error.message || error.detail || JSON.stringify(error) || 'Failed to create employee';
                    showToast(errorMsg, 'danger');
                }
            }
        });

        // Thêm listener để cập nhật hiển thị salary dựa trên lựa chọn position
        const positionSelect = document.getElementById('position-select');
        const deptSelect = document.getElementById('department-select');
        const salaryDisplay = document.getElementById('salary-display');

        const updateSalaryValue = () => {
            const deptId = deptSelect.value;
            const posId = positionSelect.value;

            if (!posId || posId === "" || !deptId) {
                salaryDisplay.value = '';
                return;
            }

            const position = appData.positions_raw.find(p => p.id == posId);
            const department = appData.departments_raw.find(d => d.id == deptId);

            let salary = 1400; // base default
            if (position) {
                const posName = (position.name || '').toLowerCase();
                const dName = department ? (department.name || '').toLowerCase() : '';

                if (posName.includes('chairman')) salary = 5000;
                else if (posName.includes('director')) salary = 4000;
                else if (posName.includes('deputy director')) salary = 3500;
                else if (posName.includes('manager') || posName.includes('trưởng')) salary = 2000;
                else if (posName.includes('acting') || posName.includes('quyền')) salary = 2800;
                else if (dName.includes('it') || dName.includes('tech')) salary = 2500;
                else if (dName.includes('hr') || dName.includes('human')) salary = 2200;
                else if (dName.includes('finance')) salary = 2300;
                else if (dName.includes('sales')) salary = 1800;
                else if (dName.includes('marketing')) salary = 1700;
                else salary = 1900;
            }

            salaryDisplay.value = salary ? `$${salary.toLocaleString()} / month` : '-';
        };

        const repopulatePositions = () => { // Tái tạo danh sách positions
            const deptId = deptSelect.value;
            const currentRoleLevel = parseInt(localStorage.getItem('role_level') || '4');

            // Tái tạo positions dựa trên department (Dropdown phụ thuộc)
            if (deptId) {
                positionSelect.disabled = false;
                const department = filteredDepartments.find(d => d.id == deptId);
                const deptName = department ? (department.name || '').toLowerCase() : '';

                // Lấy tất cả positions cho dept này
                let deptPositions = appData.positions_raw.filter(p => p.department_id == deptId);

                // LỌC NGHIÊM NGẶT CHỈ ADMIN (Level 1)
                if (currentRoleLevel === 1) {
                    if (deptName.includes('hr') || deptName.includes('human')) {
                        deptPositions = deptPositions.filter(p =>
                            p.name.includes('Acting Deputy Director') ||
                            p.name.includes('Deputy Director of Department')
                        );
                    } else if (deptName.includes('council') || deptName.includes('member')) {
                        deptPositions = deptPositions.filter(p =>
                            p.name.includes('Chairman')
                        );
                    }
                }

                // LỌC CHO HR MANAGER (Level 2)
                else if (currentRoleLevel === 2) {
                    if (deptName.includes('hr') || deptName.includes('human')) {
                        // HR Department: Hiện CHỈ 5 vị trí HR Staff cụ thể
                        deptPositions = deptPositions.filter(p => {
                            const pName = p.name.toLowerCase();
                            return pName.includes('hr manages');
                        });
                    } else {
                        // Departments khác: Hiện CHỈ leadership positions
                        const leadershipKeywords = [
                            'director', 'manager', 'head', 'deputy', 'chief', 'chairman',
                            'trưởng', 'phó', 'giám đốc'
                        ];
                        deptPositions = deptPositions.filter(p => {
                            const pName = p.name.toLowerCase();
                            return leadershipKeywords.some(keyword => pName.includes(keyword));
                        });
                    }
                }

                // LOẠI BỎ TRÙNG LẶP
                const uniqueNames = new Map();
                deptPositions.forEach(p => {
                    if (!uniqueNames.has(p.name)) {
                        uniqueNames.set(p.name, p);
                    }
                });
                deptPositions = Array.from(uniqueNames.values());

                // Set HTML và triggers
                if (deptPositions.length > 0) {
                    positionSelect.innerHTML = deptPositions.map(p => {
                        let displayName = p.name || '-';
                        if (deptName.includes('council') && displayName.includes('Chairman')) {
                            displayName = 'Chairman';
                        }
                        return `<option value="${p.id}">${displayName}</option>`;
                    }).join('');

                    // Kích hoạt cập nhật salary cho lựa chọn đầu tiên mới
                    updateSalaryValue();
                } else {
                    positionSelect.innerHTML = '<option value="">No positions available</option>';
                    salaryDisplay.value = '';
                }
            } else {
                positionSelect.disabled = true;
                positionSelect.innerHTML = '<option value="">Select Department First</option>';
                salaryDisplay.value = '';
            }
        };

        positionSelect.addEventListener('change', updateSalaryValue);
        deptSelect.addEventListener('change', repopulatePositions);
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
                    showToast('Employee updated', 'success');
                    const { fetchPayroll } = await import('../core/api.js');
                    await fetchEmployees();
                    await fetchPayroll();
                    const contentArea = document.getElementById('content-area');
                    if (contentArea) contentArea.innerHTML = renderEmployees();
                    setupEmployeesListeners();
                } catch (error) {
                    showToast(error.message, 'danger');
                }
            }
        });

        // Thêm logic xem trước salary
        const editPosSelect = document.getElementById('edit-pos-select');
        const editDeptSelect = document.getElementById('edit-dept-select');
        const editSalaryDisplay = document.getElementById('edit-salary-display');

        const updatePreview = () => {
            const deptId = editDeptSelect.value;
            const currentRoleLevel = parseInt(localStorage.getItem('role_level') || '4');

            // Dropdown phụ thuộc cho Edit
            if (deptId) {
                const department = appData.departments_raw.find(d => d.id == deptId);
                const deptName = department ? (department.name || '').toLowerCase() : '';

                let deptPositions = appData.positions_raw.filter(p => p.department_id == deptId);

                // DỰ PHÒNG: Nếu không có position nào liên kết với dept này (cấu trúc database), dùng tất cả positions
                if (deptPositions.length === 0) {
                    deptPositions = [...appData.positions_raw];
                }

                // LỌC NGHIÊM NGẶT CHỈ ADMIN
                if (currentRoleLevel === 1) {
                    if (deptName.includes('hr') || deptName.includes('human')) {
                        deptPositions = deptPositions.filter(p =>
                            p.name.includes('Acting Deputy Director') ||
                            p.name.includes('Deputy Director of Department')
                        );
                    } else if (deptName.includes('council') || deptName.includes('member')) {
                        deptPositions = deptPositions.filter(p => p.name.includes('Chairman'));
                    }
                }

                // LOẠI BỎ TRÙNG LẶP: Đảm bảo tên position duy nhất
                const uniqueNames = new Map();
                deptPositions.forEach(p => {
                    if (!uniqueNames.has(p.name)) {
                        uniqueNames.set(p.name, p);
                    }
                });
                deptPositions = Array.from(uniqueNames.values());

                // Nếu department thay đổi, cập nhật danh sách position và tự chọn
                const previousPosId = editPosSelect.value;
                if (deptPositions.length > 0) {
                    editPosSelect.innerHTML = deptPositions.map(p => {
                        let displayName = p.name || '-';
                        if (deptName.includes('council') && displayName.includes('Chairman')) {
                            displayName = 'Chairman';
                        }
                        return `<option value="${p.id}" ${p.id == previousPosId ? 'selected' : ''}>${displayName}</option>`;
                    }).join('');

                    if (!editPosSelect.value) {
                        editPosSelect.selectedIndex = 0;
                    }
                } else {
                    editPosSelect.innerHTML = '<option value="">No positions available</option>';
                    editSalaryDisplay.value = '';
                    return;
                }
            }

            const posId = editPosSelect.value;
            if (!posId || posId === "") {
                editSalaryDisplay.value = '';
                return;
            }

            const position = appData.positions_raw.find(p => p.id == posId);
            const department = appData.departments_raw.find(d => d.id == deptId);

            let salary = 1400;
            if (position) {
                const posName = (position.name || '').toLowerCase();
                const dName = department ? (department.name || '').toLowerCase() : '';

                if (posName.includes('chairman')) salary = 5000;
                else if (posName.includes('director')) salary = 4000;
                else if (posName.includes('deputy director')) salary = 3500;
                else if (posName.includes('manager') || posName.includes('trưởng')) salary = 2000;
                else if (posName.includes('acting') || posName.includes('quyền')) salary = 2800;
                else if (dName.includes('it') || dName.includes('tech')) salary = 2500;
                else if (dName.includes('hr') || dName.includes('human')) salary = 2200;
                else if (dName.includes('finance')) salary = 2300;
                else if (dName.includes('sales')) salary = 1800;
                else if (dName.includes('marketing')) salary = 1700;
                else salary = 1900;
            }
            editSalaryDisplay.value = `$${salary.toLocaleString()} / month`;
        };

        editPosSelect.addEventListener('change', updatePreview);
        editDeptSelect.addEventListener('change', updatePreview);

        // Gọi preview ban đầu để lọc positions và hiện salary
        updatePreview();

    } catch (error) {
        showToast(error.message, 'danger');
    }
};
