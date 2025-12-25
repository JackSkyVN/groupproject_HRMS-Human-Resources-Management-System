/**
 * Navigation Module - Sidebar, page routing, header
 * Implementing History API for clean URLs (e.g., /finova/dashboard)
 */

import { getState, setCurrentPage } from '../core/state.js';
import { logout, fetchAnnouncements, dismissNotification } from '../core/api.js';
import './profile-modal.js';  // My Profile modal with tabs

/**
 * Detect base path dynamically. 
 * If running on localhost:5500/finova/index.html, base is /finova
 * If running on localhost:5500/index.html (where finova is root), base is empty
 */
function getBasePath() {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/finova')) return '/finova';
    return '';
}

const BASE_PATH = getBasePath();

export function initNavigation() {
    updateSidebarVisibility();
    setupNavListeners();
    setupLogoListener();
    setupHeaderListeners();

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        const path = window.location.pathname;
        const page = path.replace(`${BASE_PATH}/`, '').replace(BASE_PATH, '') || 'dashboard';
        switchPage(page, false);
    });

    // Handle initial load
    const path = window.location.pathname;
    let initialPage = path.replace(`${BASE_PATH}/`, '').replace(BASE_PATH, '') || 'dashboard';

    // Cleanup initial page string
    if (initialPage === 'index.html' || initialPage === '/' || initialPage === '' || initialPage === BASE_PATH) {
        initialPage = 'dashboard';
    }

    switchPage(initialPage, false);
}

function setupNavListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = btn.getAttribute('data-page');
            if (!page) return;

            const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
            const canManage = roleLevel <= 3;

            let targetPage = page;
            if (targetPage === 'attendance') {
                targetPage = canManage ? 'attendance-team' : 'attendance-my';
            } else if (targetPage === 'salary') {
                targetPage = canManage ? 'salary-team/payroll' : 'salary-my/payroll';
            }

            navigateTo(targetPage);
        });
    });
}

function setupLogoListener() {
    const logo = document.querySelector('.sidebar-title');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => navigateTo('dashboard'));
    }
}

export function navigateTo(pageId) {
    // Construct clean URL - always show the page name explicitly
    const newPath = `${BASE_PATH}/${pageId}`;

    // Avoid double slashes
    const fixedPath = newPath.replace(/\/+/g, '/');

    window.history.pushState({ pageId }, '', fixedPath);
    switchPage(pageId, false);
}

export async function switchPage(page, updateHistory = true) {
    // Sanitize page ID - Keep slashes for nested routing
    const cleanPage = page.replace('.html', '');

    if (updateHistory) {
        navigateTo(cleanPage);
        return;
    }

    setCurrentPage(cleanPage);

    // Update Sidebar state
    document.querySelectorAll('.nav-item').forEach(btn => {
        const btnPage = btn.getAttribute('data-page');
        const isActive = btnPage === cleanPage ||
            (cleanPage.startsWith('attendance-') && btnPage === 'attendance') ||
            (cleanPage.startsWith('salary-') && btnPage === 'salary');

        btn.classList.toggle('active', isActive);
        if (btn.parentElement && btn.parentElement.classList.contains('nav-group')) {
            btn.parentElement.classList.toggle('active', isActive);
        }
    });

    renderPage(cleanPage);
}

/**
 * Sidebar Permissions & Localization
 */
export function updateSidebarVisibility() {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    const employeesNav = document.querySelector('.nav-item[data-page="employees"]');
    if (employeesNav) {
        employeesNav.style.display = roleLevel <= 3 ? 'flex' : 'none';
    }

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

    // 2. Handle Submenus for Attendance & Salary
    const attendanceGroup = document.getElementById('attendance-nav-group');
    const salaryGroup = document.getElementById('salary-nav-group');

    if (attendanceGroup) {
        const submenu = attendanceGroup.querySelector('.submenu');
        if (submenu) submenu.style.display = roleLevel <= 3 ? 'block' : 'none';
    }

    if (salaryGroup) {
        // Inject or update Salary submenu
        let submenu = salaryGroup.querySelector('.submenu');
        if (!submenu && roleLevel <= 3) {
            submenu = document.createElement('div');
            submenu.className = 'submenu';
            submenu.innerHTML = `
                <button class="submenu-item" data-page="salary-my/payroll">
                    <span class="nav-text">My Salary</span>
                </button>
                <button class="submenu-item" data-page="salary-team/payroll">
                    <span class="nav-text">Employee Salary</span>
                </button>
            `;
            salaryGroup.appendChild(submenu);
        }

        if (submenu) {
            submenu.style.display = roleLevel <= 3 ? 'block' : 'none';
        }
    }

    // 3. Setup sub-nav listeners (for newly injected elements)
    const submenuItems = document.querySelectorAll('.submenu-item');
    submenuItems.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const page = btn.getAttribute('data-page');
            window.navigateTo(page);
        };
    });

    // Cleanup legacy performance module
    const performanceNav = document.getElementById('performance-nav-group') || document.querySelector('[data-page="performance"]')?.parentElement;
    if (performanceNav) performanceNav.remove();
}

export function setupHeaderListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout());
    }

    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.openMyProfileModal();
        });
    }

    // Notification Bell Logic
    const bellBtn = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');

    if (bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            updateNotificationUI();
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            const appData = getState();
            const ids = (appData.announcements || []).map(a => a.notification_id);
            for (const id of ids) {
                try { await dismissNotification(id); } catch (e) { }
            }
            await fetchAnnouncements();
            updateNotificationUI();

            if (window.location.hash === '#announcements') {
                const { renderAnnouncements } = await import('./announcements.js');
                const contentArea = document.getElementById('content-area');
                if (contentArea) contentArea.innerHTML = await renderAnnouncements();
            }
        });
    }

    // Initial check for notifications
    updateNotificationUI();
    // Auto refresh notifications every 30 seconds
    setInterval(async () => {
        await fetchAnnouncements();
        updateNotificationUI();
    }, 30000);
}

/**
 * Update the badge and dropdown items
 */
export function updateNotificationUI() {
    const appData = getState();
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');
    const announcements = appData.announcements || [];

    if (badge) {
        badge.textContent = announcements.length;
        badge.style.display = announcements.length > 0 ? 'flex' : 'none';
    }

    if (!list) return;

    if (announcements.length === 0) {
        list.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #94a3b8;">
                <div style="font-size: 2rem; margin-bottom: 10px;">✨</div>
                <p style="font-size: 0.85rem; font-weight: 500;">All caught up!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = announcements.map(ann => `
        <div class="notification-item" style="display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid #f1f5f9; position: relative; cursor: pointer;" onclick="window.switchPage('announcements')">
            <div style="flex-shrink: 0; width: 40px; height: 40px; background: #eff6ff; color: #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem; margin-bottom: 2px; padding-right: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ann.title}</div>
                <div style="font-size: 0.75rem; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 4px;">${ann.message}</div>
                <div style="font-size: 0.65rem; color: #cbd5e1; font-weight: 600;">${new Date(ann.created_at).toLocaleDateString()}</div>
            </div>
            <button onclick="window.dismissNotif(${ann.notification_id}, event)" class="dismiss-btn" style="position: absolute; top: 12px; right: 12px; border: none; background: none; color: #cbd5e1; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;" onmouseover="this.style.color='#ef4444'; this.style.background='#fef2f2'" onmouseout="this.style.color='#cbd5e1'; this.style.background='none'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');
}

window.dismissNotif = async function (id, e) {
    if (e) e.stopPropagation();
    try {
        await dismissNotification(id);
        const { fetchAnnouncements } = await import('../core/api.js');
        await fetchAnnouncements();
        updateNotificationUI();

        // If we are on announcements page, refresh it
        const { getCurrentPage } = await import('../core/state.js');
        if (getCurrentPage() === 'announcements') {
            const { renderAnnouncements } = await import('./announcements.js');
            const contentArea = document.getElementById('content-area');
            if (contentArea) {
                contentArea.innerHTML = await renderAnnouncements();
            }
        }
    } catch (err) {
        import('../utils/toast.js').then(m => m.showToast(err.message, "error"));
    }
}

window.dismissNotif = dismissNotif;
window.updateNotificationUI = updateNotificationUI;

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
        'announcements': () => import('../modules/announcements.js').then(async m => contentArea.innerHTML = await m.renderAnnouncements()),
        'ai-attendance': () => import('../modules/ai_attendance.js').then(m => contentArea.innerHTML = m.renderAIAttendance())
    };

    // Special handling for nested salary routes: salary-my/payroll, salary-team/salary-request, etc.
    if (page.startsWith('salary-')) {
        const parts = page.split('/');
        const modeAndBase = parts[0];
        const subPath = parts[1] || 'payroll';

        const mode = modeAndBase.replace('salary-', '');
        const subview = subPath === 'salary-request' ? 'adjustments' : 'list';

        import('../modules/payroll.js').then(async m => {
            // Pre-fetch adjustments if needed
            if (subview === 'adjustments') {
                const api = await import('../core/api.js');
                await api.fetchSalaryAdjustments();
            }
            contentArea.innerHTML = m.renderSalary(mode, subview);
        });
        return;
    }

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
                <button onclick="window.switchPage('dashboard')" class="btn btn-primary" style="margin-top:20px;">Go to Dashboard</button>
            </div>
        `;
    }
}

window.switchPage = switchPage;
window.navigateTo = navigateTo;
