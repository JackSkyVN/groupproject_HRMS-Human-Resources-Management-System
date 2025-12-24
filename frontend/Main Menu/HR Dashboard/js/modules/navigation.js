/**
 * Navigation Module - Sidebar, page routing, header
 */

import { getState, setCurrentPage } from '../core/state.js';
import { logout } from '../core/api.js';

export function initNavigation() {
    updateSidebarVisibility();
    setupNavListeners();
}

function setupNavListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
            const canManage = roleLevel <= 3;

            if (page === 'attendance') {
                switchPage(canManage ? 'attendance-team' : 'attendance-my');
            } else if (page === 'salary') {
                switchPage(canManage ? 'salary-team' : 'salary-my');
            } else {
                switchPage(page);
            }
        });
    });
}

export async function switchPage(page) {
    setCurrentPage(page);

    document.querySelectorAll('.nav-item').forEach(btn => {
        const btnPage = btn.getAttribute('data-page');
        const isActive = btnPage === page ||
            (page.startsWith('attendance-') && btnPage === 'attendance') ||
            (page.startsWith('salary-') && btnPage === 'salary');

        btn.classList.toggle('active', isActive);
        // Only toggle parent active if it's a nav-group helper
        if (btn.parentElement && btn.parentElement.classList.contains('nav-group')) {
            btn.parentElement.classList.toggle('active', isActive);
        }
    });

    renderPage(page);
}

export function updateSidebarVisibility() {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    // Correctly hide Employees nav for Level 4
    const employeesNav = document.querySelector('.nav-item[data-page="employees"]');
    if (employeesNav) {
        employeesNav.style.display = roleLevel <= 3 ? 'flex' : 'none';
    }

    // Update Sidebar display text
    const navLinks = {
        'dashboard': 'Dashboard',
        'employees': 'Employees',
        'attendance': 'Attendance',
        'leave': 'Leave Management',
        'salary': 'Salary Management',
        'announcements': 'Announcements'
    };

    document.querySelectorAll('.nav-item').forEach(btn => {
        const page = btn.getAttribute('data-page');
        if (navLinks[page]) {
            const textSpan = btn.querySelector('.nav-text');
            if (textSpan) textSpan.textContent = navLinks[page];
        }
    });

    // Remove Performance module entirely
    const performanceNav = document.getElementById('performance-nav-group') || document.querySelector('[data-page="performance"]')?.parentElement;
    if (performanceNav && performanceNav.classList.contains('nav-group')) {
        performanceNav.remove();
    } else if (performanceNav && performanceNav.getAttribute('data-page') === 'performance') {
        performanceNav.remove();
    }
}

export function setupHeaderListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout());
    }

    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            import('../utils/toast.js').then(m => m.showToast("Opening personal profile...", "info"));
        });
    }
}

export function renderPage(page) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    const loaders = {
        'dashboard': () => import('../modules/dashboard.js').then(m => contentArea.innerHTML = m.renderDashboard()),
        'employees': () => import('../modules/employees.js').then(m => {
            contentArea.innerHTML = m.renderEmployees();
            m.setupEmployeesListeners();
        }),
        'leave': () => import('../modules/leaves.js').then(m => contentArea.innerHTML = m.renderLeave()),
        'attendance-team': () => import('../modules/attendance.js').then(m => contentArea.innerHTML = m.renderAttendance('team')),
        'attendance-my': () => import('../modules/attendance.js').then(m => contentArea.innerHTML = m.renderAttendance('my')),
        'salary-team': () => import('../modules/payroll.js').then(m => contentArea.innerHTML = m.renderSalary('team')),
        'salary-my': () => import('../modules/payroll.js').then(m => contentArea.innerHTML = m.renderSalary('my')),
        'announcements': () => import('../modules/announcements.js').then(m => contentArea.innerHTML = m.renderAnnouncements())
    };

    if (loaders[page]) {
        loaders[page]().catch(err => {
            console.error(`Error loading page ${page}:`, err);
            contentArea.innerHTML = `<div class="card" style="padding:20px; color:red;">Error loading page: ${err.message}</div>`;
        });
    } else {
        contentArea.innerHTML = `
            <div class="page-header"><h1>Page Not Found</h1></div>
            <div class="card" style="text-align: center; padding: 50px;">
                <p>System could not find this feature. Please return to Dashboard.</p>
            </div>
        `;
    }
}

window.switchPage = switchPage;
