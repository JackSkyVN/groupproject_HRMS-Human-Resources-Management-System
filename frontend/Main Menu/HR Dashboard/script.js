// Data Storage
const appData = {
    employees: [
        { id: 1, name: 'John Doe', position: 'Software Engineer', department: 'Engineering', email: 'john.doe@company.com', phone: '+1234567890', joinDate: '2022-01-15', status: 'Active', salary: 85000 },
        { id: 2, name: 'Jane Smith', position: 'Product Manager', department: 'Product', email: 'jane.smith@company.com', phone: '+1234567891', joinDate: '2021-06-20', status: 'Active', salary: 95000 },
        { id: 3, name: 'Mike Johnson', position: 'Designer', department: 'Design', email: 'mike.johnson@company.com', phone: '+1234567892', joinDate: '2023-03-10', status: 'Active', salary: 75000 },
        { id: 4, name: 'Sarah Williams', position: 'HR Manager', department: 'HR', email: 'sarah.williams@company.com', phone: '+1234567893', joinDate: '2020-11-05', status: 'Active', salary: 80000 },
        { id: 5, name: 'David Brown', position: 'Marketing Specialist', department: 'Marketing', email: 'david.brown@company.com', phone: '+1234567894', joinDate: '2022-08-22', status: 'On Leave', salary: 70000 }
    ],
    leaveRequests: [
        { id: 1, employeeId: 1, employeeName: 'John Doe', type: 'Vacation', startDate: '2024-12-20', endDate: '2024-12-27', days: 7, reason: 'Family vacation', status: 'Approved' },
        { id: 2, employeeId: 2, employeeName: 'Jane Smith', type: 'Sick Leave', startDate: '2024-11-15', endDate: '2024-11-16', days: 2, reason: 'Medical checkup', status: 'Approved' },
        { id: 3, employeeId: 3, employeeName: 'Mike Johnson', type: 'Personal', startDate: '2024-11-25', endDate: '2024-11-25', days: 1, reason: 'Personal matters', status: 'Pending' },
        { id: 4, employeeId: 5, employeeName: 'David Brown', type: 'Vacation', startDate: '2024-11-18', endDate: '2024-11-22', days: 5, reason: 'Traveling', status: 'Pending' }
    ],
    attendance: [
        { id: 1, employeeId: 1, employeeName: 'John Doe', date: '2024-11-18', checkIn: '09:00', checkOut: '18:00', status: 'Present', hours: '9h' },
        { id: 2, employeeId: 2, employeeName: 'Jane Smith', date: '2024-11-18', checkIn: '08:45', checkOut: '17:30', status: 'Present', hours: '8.75h' },
        { id: 3, employeeId: 3, employeeName: 'Mike Johnson', date: '2024-11-18', checkIn: '09:15', checkOut: '18:15', status: 'Late', hours: '9h' },
        { id: 4, employeeId: 4, employeeName: 'Sarah Williams', date: '2024-11-18', checkIn: '-', checkOut: '-', status: 'Absent', hours: '0h' },
        { id: 5, employeeId: 5, employeeName: 'David Brown', date: '2024-11-18', checkIn: '-', checkOut: '-', status: 'On Leave', hours: '0h' }
    ],
    performance: [
        { id: 1, employeeId: 1, employeeName: 'John Doe', period: 'Q4 2024', rating: 4.5, goals: 'Complete 3 major projects', achievements: 'Delivered 4 projects ahead of schedule', feedback: 'Excellent performance' },
        { id: 2, employeeId: 2, employeeName: 'Jane Smith', period: 'Q4 2024', rating: 4.8, goals: 'Launch 2 new features', achievements: 'Successfully launched 3 features with positive user feedback', feedback: 'Outstanding leadership' },
        { id: 3, employeeId: 3, employeeName: 'Mike Johnson', period: 'Q4 2024', rating: 4.2, goals: 'Redesign main dashboard', achievements: 'Completed redesign with improved UX metrics', feedback: 'Great creativity and attention to detail' },
        { id: 4, employeeId: 4, employeeName: 'Sarah Williams', period: 'Q4 2024', rating: 4.6, goals: 'Improve employee satisfaction', achievements: 'Implemented new benefits program, 15% satisfaction increase', feedback: 'Excellent strategic thinking' }
    ],
    salaries: []
};

// Initialize salaries
appData.employees.forEach(emp => {
    const baseSalary = emp.salary;
    const bonus = Math.floor(baseSalary * 0.1);
    const benefits = Math.floor(baseSalary * 0.15);
    const tax = Math.floor((baseSalary + bonus) * 0.2);
    const netSalary = baseSalary + bonus + benefits - tax;
    
    appData.salaries.push({
        id: emp.id,
        employeeId: emp.id,
        employeeName: emp.name,
        baseSalary: baseSalary,
        bonus: bonus,
        benefits: benefits,
        tax: tax,
        netSalary: netSalary,
        month: 'November 2024',
        status: 'Processed'
    });
});

let currentPage = 'dashboard';
let nextId = {
    employees: 6,
    leaveRequests: 5,
    attendance: 6,
    performance: 5
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    renderPage('dashboard');
});

// Navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const page = item.getAttribute('data-page');
            renderPage(page);
        });
    });
}

function renderPage(page) {
    currentPage = page;
    const contentArea = document.getElementById('content-area');
    
    switch(page) {
        case 'dashboard':
            contentArea.innerHTML = renderDashboard();
            break;
        case 'employees':
            contentArea.innerHTML = renderEmployees();
            setupEmployeesListeners();
            break;
        case 'leave':
            contentArea.innerHTML = renderLeave();
            setupLeaveListeners();
            break;
        case 'attendance':
            contentArea.innerHTML = renderAttendance();
            setupAttendanceListeners();
            break;
        case 'performance':
            contentArea.innerHTML = renderPerformance();
            setupPerformanceListeners();
            break;
        case 'salary':
            contentArea.innerHTML = renderSalary();
            setupSalaryListeners();
            break;
    }
}

// Dashboard
function renderDashboard() {
    const totalEmployees = appData.employees.length;
    const activeEmployees = appData.employees.filter(e => e.status === 'Active').length;
    const pendingLeaves = appData.leaveRequests.filter(l => l.status === 'Pending').length;
    const presentToday = appData.attendance.filter(a => a.status === 'Present').length;

    return `
        <div class="page-header">
            <h1>Dashboard</h1>
            <p>Overview of your HR management system</p>
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
                <div class="stat-value">${presentToday}</div>
                <div class="stat-description">Out of ${totalEmployees} employees</div>
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
                <div class="stat-description">Awaiting approval</div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title">Avg Performance</span>
                    <div class="stat-icon purple">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </div>
                </div>
                <div class="stat-value">4.5</div>
                <div class="stat-description">Based on recent reviews</div>
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
                            <th>Activity</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.leaveRequests.slice(0, 5).map(leave => `
                            <tr>
                                <td>${leave.employeeName}</td>
                                <td>Leave Request - ${leave.type}</td>
                                <td>${leave.startDate}</td>
                                <td><span class="badge badge-${leave.status === 'Approved' ? 'success' : 'warning'}">${leave.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Employees
function renderEmployees() {
    return `
        <div class="page-header">
            <h1>Employees</h1>
            <p>Manage your organization's workforce</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Employee Directory</h2>
                <button class="btn btn-primary" onclick="openAddEmployeeModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Employee
                </button>
            </div>
            
            <div class="search-bar">
                <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input type="text" class="search-input" id="employee-search" placeholder="Search employees...">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Position</th>
                            <th>Department</th>
                            <th>Email</th>
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

function renderEmployeesRows(searchTerm = '') {
    const filtered = appData.employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
        return '<tr><td colspan="6" style="text-align: center; padding: 40px;">No employees found</td></tr>';
    }

    return filtered.map(emp => `
        <tr>
            <td>${emp.name}</td>
            <td>${emp.position}</td>
            <td>${emp.department}</td>
            <td>${emp.email}</td>
            <td><span class="badge badge-${emp.status === 'Active' ? 'success' : 'warning'}">${emp.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="viewEmployee(${emp.id})">View</button>
                    <button class="btn btn-small btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setupEmployeesListeners() {
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const tbody = document.getElementById('employees-table-body');
            tbody.innerHTML = renderEmployeesRows(e.target.value);
        });
    }
}

function openAddEmployeeModal() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Add New Employee</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-employee-form" onsubmit="handleAddEmployee(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input type="text" class="form-input" name="name" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Position</label>
                                <input type="text" class="form-input" name="position" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Department</label>
                                <select class="form-select" name="department" required>
                                    <option value="">Select Department</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Product">Product</option>
                                    <option value="Design">Design</option>
                                    <option value="HR">HR</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Sales">Sales</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-input" name="email" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Phone</label>
                                <input type="tel" class="form-input" name="phone" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Join Date</label>
                                <input type="date" class="form-input" name="joinDate" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Salary</label>
                            <input type="number" class="form-input" name="salary" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="document.getElementById('add-employee-form').requestSubmit()">Add Employee</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

function handleAddEmployee(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newEmployee = {
        id: nextId.employees++,
        name: formData.get('name'),
        position: formData.get('position'),
        department: formData.get('department'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        joinDate: formData.get('joinDate'),
        salary: parseInt(formData.get('salary')),
        status: 'Active'
    };
    appData.employees.push(newEmployee);
    
    // Add salary data
    const baseSalary = newEmployee.salary;
    const bonus = Math.floor(baseSalary * 0.1);
    const benefits = Math.floor(baseSalary * 0.15);
    const tax = Math.floor((baseSalary + bonus) * 0.2);
    const netSalary = baseSalary + bonus + benefits - tax;
    
    appData.salaries.push({
        id: newEmployee.id,
        employeeId: newEmployee.id,
        employeeName: newEmployee.name,
        baseSalary: baseSalary,
        bonus: bonus,
        benefits: benefits,
        tax: tax,
        netSalary: netSalary,
        month: 'November 2024',
        status: 'Pending'
    });
    
    closeModal();
    renderPage('employees');
}

function viewEmployee(id) {
    const employee = appData.employees.find(e => e.id === id);
    if (!employee) return;

    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Employee Details</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="salary-details">
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Name:</span>
                            <span class="salary-detail-value">${employee.name}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Position:</span>
                            <span class="salary-detail-value">${employee.position}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Department:</span>
                            <span class="salary-detail-value">${employee.department}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Email:</span>
                            <span class="salary-detail-value">${employee.email}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Phone:</span>
                            <span class="salary-detail-value">${employee.phone}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Join Date:</span>
                            <span class="salary-detail-value">${employee.joinDate}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Status:</span>
                            <span class="salary-detail-value"><span class="badge badge-${employee.status === 'Active' ? 'success' : 'warning'}">${employee.status}</span></span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Salary:</span>
                            <span class="salary-detail-value">$${employee.salary.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        appData.employees = appData.employees.filter(e => e.id !== id);
        appData.salaries = appData.salaries.filter(s => s.employeeId !== id);
        renderPage('employees');
    }
}

// Leave Management
function renderLeave() {
    return `
        <div class="page-header">
            <h1>Leave Management</h1>
            <p>Track and manage employee leave requests</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Leave Requests</h2>
                <button class="btn btn-primary" onclick="openAddLeaveModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Request
                </button>
            </div>

            <div class="filter-section">
                <select class="filter-select" id="leave-status-filter" onchange="filterLeaveRequests()">
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                </select>
                <select class="filter-select" id="leave-type-filter" onchange="filterLeaveRequests()">
                    <option value="all">All Types</option>
                    <option value="Vacation">Vacation</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Personal">Personal</option>
                </select>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="leave-table-body">
                        ${renderLeaveRows()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderLeaveRows(statusFilter = 'all', typeFilter = 'all') {
    let filtered = appData.leaveRequests;

    if (statusFilter !== 'all') {
        filtered = filtered.filter(l => l.status === statusFilter);
    }
    if (typeFilter !== 'all') {
        filtered = filtered.filter(l => l.type === typeFilter);
    }

    if (filtered.length === 0) {
        return '<tr><td colspan="7" style="text-align: center; padding: 40px;">No leave requests found</td></tr>';
    }

    return filtered.map(leave => `
        <tr>
            <td>${leave.employeeName}</td>
            <td>${leave.type}</td>
            <td>${leave.startDate}</td>
            <td>${leave.endDate}</td>
            <td>${leave.days} days</td>
            <td><span class="badge badge-${leave.status === 'Approved' ? 'success' : leave.status === 'Pending' ? 'warning' : 'danger'}">${leave.status}</span></td>
            <td>
                <div class="action-buttons">
                    ${leave.status === 'Pending' ? `
                        <button class="btn btn-small btn-success" onclick="approveLeave(${leave.id})">Approve</button>
                        <button class="btn btn-small btn-danger" onclick="rejectLeave(${leave.id})">Reject</button>
                    ` : `
                        <button class="btn btn-small btn-secondary" onclick="viewLeave(${leave.id})">View</button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

function setupLeaveListeners() {
    // Filters are handled by onchange events in HTML
}

function filterLeaveRequests() {
    const statusFilter = document.getElementById('leave-status-filter').value;
    const typeFilter = document.getElementById('leave-type-filter').value;
    const tbody = document.getElementById('leave-table-body');
    tbody.innerHTML = renderLeaveRows(statusFilter, typeFilter);
}

function openAddLeaveModal() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">New Leave Request</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-leave-form" onsubmit="handleAddLeave(event)">
                        <div class="form-group">
                            <label class="form-label">Employee</label>
                            <select class="form-select" name="employeeId" required>
                                <option value="">Select Employee</option>
                                ${appData.employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Leave Type</label>
                            <select class="form-select" name="type" required>
                                <option value="">Select Type</option>
                                <option value="Vacation">Vacation</option>
                                <option value="Sick Leave">Sick Leave</option>
                                <option value="Personal">Personal</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-input" name="startDate" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-input" name="endDate" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reason</label>
                            <textarea class="form-textarea" name="reason" required></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="document.getElementById('add-leave-form').requestSubmit()">Submit Request</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

function handleAddLeave(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const employeeId = parseInt(formData.get('employeeId'));
    const employee = appData.employees.find(e => e.id === employeeId);
    
    const startDate = new Date(formData.get('startDate'));
    const endDate = new Date(formData.get('endDate'));
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const newLeave = {
        id: nextId.leaveRequests++,
        employeeId: employeeId,
        employeeName: employee.name,
        type: formData.get('type'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        days: days,
        reason: formData.get('reason'),
        status: 'Pending'
    };
    appData.leaveRequests.push(newLeave);
    closeModal();
    renderPage('leave');
}

function approveLeave(id) {
    const leave = appData.leaveRequests.find(l => l.id === id);
    if (leave) {
        leave.status = 'Approved';
        renderPage('leave');
    }
}

function rejectLeave(id) {
    const leave = appData.leaveRequests.find(l => l.id === id);
    if (leave) {
        leave.status = 'Rejected';
        renderPage('leave');
    }
}

function viewLeave(id) {
    const leave = appData.leaveRequests.find(l => l.id === id);
    if (!leave) return;

    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Leave Request Details</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="salary-details">
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Employee:</span>
                            <span class="salary-detail-value">${leave.employeeName}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Type:</span>
                            <span class="salary-detail-value">${leave.type}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Start Date:</span>
                            <span class="salary-detail-value">${leave.startDate}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">End Date:</span>
                            <span class="salary-detail-value">${leave.endDate}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Duration:</span>
                            <span class="salary-detail-value">${leave.days} days</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Reason:</span>
                            <span class="salary-detail-value">${leave.reason}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Status:</span>
                            <span class="salary-detail-value"><span class="badge badge-${leave.status === 'Approved' ? 'success' : leave.status === 'Pending' ? 'warning' : 'danger'}">${leave.status}</span></span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

// Attendance
function renderAttendance() {
    return `
        <div class="page-header">
            <h1>Attendance</h1>
            <p>Monitor daily employee attendance</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Today's Attendance - November 18, 2024</h2>
                <button class="btn btn-primary" onclick="openMarkAttendanceModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Mark Attendance
                </button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Hours</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.attendance.map(att => `
                            <tr>
                                <td>${att.employeeName}</td>
                                <td>${att.date}</td>
                                <td>${att.checkIn}</td>
                                <td>${att.checkOut}</td>
                                <td>${att.hours}</td>
                                <td><span class="badge badge-${att.status === 'Present' ? 'success' : att.status === 'Late' ? 'warning' : att.status === 'On Leave' ? 'info' : 'danger'}">${att.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function setupAttendanceListeners() {
    // No additional listeners needed
}

function openMarkAttendanceModal() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Mark Attendance</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="mark-attendance-form" onsubmit="handleMarkAttendance(event)">
                        <div class="form-group">
                            <label class="form-label">Employee</label>
                            <select class="form-select" name="employeeId" required>
                                <option value="">Select Employee</option>
                                ${appData.employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-input" name="date" value="2024-11-18" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Check In</label>
                                <input type="time" class="form-input" name="checkIn" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Check Out</label>
                                <input type="time" class="form-input" name="checkOut" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" name="status" required>
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="Absent">Absent</option>
                                <option value="On Leave">On Leave</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="document.getElementById('mark-attendance-form').requestSubmit()">Mark Attendance</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

function handleMarkAttendance(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const employeeId = parseInt(formData.get('employeeId'));
    const employee = appData.employees.find(e => e.id === employeeId);
    
    const checkIn = formData.get('checkIn');
    const checkOut = formData.get('checkOut');
    
    // Calculate hours
    const checkInTime = new Date(`2024-01-01 ${checkIn}`);
    const checkOutTime = new Date(`2024-01-01 ${checkOut}`);
    const hours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);

    const newAttendance = {
        id: nextId.attendance++,
        employeeId: employeeId,
        employeeName: employee.name,
        date: formData.get('date'),
        checkIn: checkIn,
        checkOut: checkOut,
        status: formData.get('status'),
        hours: `${hours}h`
    };
    appData.attendance.push(newAttendance);
    closeModal();
    renderPage('attendance');
}

// Performance
function renderPerformance() {
    return `
        <div class="page-header">
            <h1>Performance Reviews</h1>
            <p>Track and evaluate employee performance</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Performance Reviews</h2>
                <button class="btn btn-primary" onclick="openAddPerformanceModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Review
                </button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Period</th>
                            <th>Rating</th>
                            <th>Goals</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.performance.map(perf => `
                            <tr>
                                <td>${perf.employeeName}</td>
                                <td>${perf.period}</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div class="progress-bar" style="width: 100px;">
                                            <div class="progress-fill" style="width: ${(perf.rating / 5) * 100}%; background-color: ${perf.rating >= 4.5 ? '#10b981' : perf.rating >= 4 ? '#3b82f6' : '#f59e0b'};"></div>
                                        </div>
                                        <span>${perf.rating}/5</span>
                                    </div>
                                </td>
                                <td>${perf.goals}</td>
                                <td>
                                    <button class="btn btn-small btn-secondary" onclick="viewPerformance(${perf.id})">View Details</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function setupPerformanceListeners() {
    // No additional listeners needed
}

function openAddPerformanceModal() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Add Performance Review</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-performance-form" onsubmit="handleAddPerformance(event)">
                        <div class="form-group">
                            <label class="form-label">Employee</label>
                            <select class="form-select" name="employeeId" required>
                                <option value="">Select Employee</option>
                                ${appData.employees.map(emp => `<option value="${emp.id}">${emp.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Review Period</label>
                            <input type="text" class="form-input" name="period" placeholder="e.g., Q4 2024" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rating (0-5)</label>
                            <input type="number" class="form-input" name="rating" min="0" max="5" step="0.1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Goals</label>
                            <textarea class="form-textarea" name="goals" required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Achievements</label>
                            <textarea class="form-textarea" name="achievements" required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Feedback</label>
                            <textarea class="form-textarea" name="feedback" required></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="document.getElementById('add-performance-form').requestSubmit()">Submit Review</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

function handleAddPerformance(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const employeeId = parseInt(formData.get('employeeId'));
    const employee = appData.employees.find(e => e.id === employeeId);

    const newPerformance = {
        id: nextId.performance++,
        employeeId: employeeId,
        employeeName: employee.name,
        period: formData.get('period'),
        rating: parseFloat(formData.get('rating')),
        goals: formData.get('goals'),
        achievements: formData.get('achievements'),
        feedback: formData.get('feedback')
    };
    appData.performance.push(newPerformance);
    closeModal();
    renderPage('performance');
}

function viewPerformance(id) {
    const perf = appData.performance.find(p => p.id === id);
    if (!perf) return;

    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Performance Review Details</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="salary-details">
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Employee:</span>
                            <span class="salary-detail-value">${perf.employeeName}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Review Period:</span>
                            <span class="salary-detail-value">${perf.period}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Rating:</span>
                            <span class="salary-detail-value">${perf.rating}/5</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Goals:</span>
                            <span class="salary-detail-value">${perf.goals}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Achievements:</span>
                            <span class="salary-detail-value">${perf.achievements}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Feedback:</span>
                            <span class="salary-detail-value">${perf.feedback}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

// Salary Management
function renderSalary() {
    return `
        <div class="page-header">
            <h1>Salary Management</h1>
            <p>Manage employee salaries and payroll</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Employee Salaries - November 2024</h2>
                <button class="btn btn-success" onclick="processAllPayroll()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Process All Payroll
                </button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Base Salary</th>
                            <th>Bonus</th>
                            <th>Benefits</th>
                            <th>Tax</th>
                            <th>Net Salary</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.salaries.map(salary => `
                            <tr>
                                <td>${salary.employeeName}</td>
                                <td>$${salary.baseSalary.toLocaleString()}</td>
                                <td>$${salary.bonus.toLocaleString()}</td>
                                <td>$${salary.benefits.toLocaleString()}</td>
                                <td>$${salary.tax.toLocaleString()}</td>
                                <td>$${salary.netSalary.toLocaleString()}</td>
                                <td><span class="badge badge-${salary.status === 'Processed' ? 'success' : 'warning'}">${salary.status}</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn btn-small btn-secondary" onclick="viewSalaryDetails(${salary.employeeId})">Details</button>
                                        ${salary.status === 'Pending' ? `
                                            <button class="btn btn-small btn-success" onclick="processSalary(${salary.employeeId})">Process</button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function setupSalaryListeners() {
    // No additional listeners needed
}

function viewSalaryDetails(employeeId) {
    const salary = appData.salaries.find(s => s.employeeId === employeeId);
    if (!salary) return;

    const modal = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Salary Breakdown - ${salary.employeeName}</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="salary-details">
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Base Salary</span>
                            <span class="salary-detail-value">$${salary.baseSalary.toLocaleString()}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Performance Bonus (10%)</span>
                            <span class="salary-detail-value">$${salary.bonus.toLocaleString()}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Benefits (15%)</span>
                            <span class="salary-detail-value">$${salary.benefits.toLocaleString()}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Tax Deduction (20%)</span>
                            <span class="salary-detail-value">-$${salary.tax.toLocaleString()}</span>
                        </div>
                        <div class="salary-detail-row salary-total">
                            <span class="salary-detail-label">Net Salary</span>
                            <span class="salary-detail-value">$${salary.netSalary.toLocaleString()}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Payment Month</span>
                            <span class="salary-detail-value">${salary.month}</span>
                        </div>
                        <div class="salary-detail-row">
                            <span class="salary-detail-label">Status</span>
                            <span class="salary-detail-value"><span class="badge badge-${salary.status === 'Processed' ? 'success' : 'warning'}">${salary.status}</span></span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    ${salary.status === 'Pending' ? `
                        <button class="btn btn-success" onclick="processSalary(${salary.employeeId}); closeModal();">Process Payment</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
}

function processSalary(employeeId) {
    const salary = appData.salaries.find(s => s.employeeId === employeeId);
    if (salary) {
        salary.status = 'Processed';
        renderPage('salary');
        alert(`Salary processed for ${salary.employeeName}`);
    }
}

function processAllPayroll() {
    let processed = 0;
    appData.salaries.forEach(salary => {
        if (salary.status === 'Pending') {
            salary.status = 'Processed';
            processed++;
        }
    });
    renderPage('salary');
    alert(`Processed payroll for ${processed} employee(s)`);
}

// Modal Functions
function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modal-container').innerHTML = '';
}
