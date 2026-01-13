/**
 * Module Navigation - Sidebar, điều hướng trang, header
 * Triển khai History API cho URLs sạch (đ dụ, /finova/dashboard)
 */

import { getState, setCurrentPage } from '../core/state.js';
import { logout, fetchAnnouncements, dismissNotification } from '../core/api.js';
import { API_BASE_URL } from '../core/config.js';
import './profile-modal.js';  // My Profile modal with tabs

/**
 * Phát hiện base path động. 
 * Nếu chạy trên localhost:5500/finova/index.html, base là /finova
 * Nếu chạy trên localhost:5500/index.html (finova là root), base là rỗng
 */
function getBasePath() {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/finova')) return '/finova';
    return '';
}

export const BASE_PATH = getBasePath();

export function initNavigation() {
    updateSidebarVisibility();
    setupNavListeners();
    setupLogoListener();
    setupHeaderListeners();

    // Xử lý nút back/forward của browser
    window.addEventListener('popstate', () => {
        const path = window.location.pathname;
        const page = parsePageFromPath(path);
        switchPage(page, false);
    });

    // Xử lý tải ban đầu
    const path = window.location.pathname;
    let initialPage = parsePageFromPath(path);
    switchPage(initialPage, false);
}

function parsePageFromPath(path) {
    // Loại bỏ base path và prefix chuyên nghiệp
    let page = path.replace(`${BASE_PATH}/`, '').replace(BASE_PATH, '') || 'dashboard';

    // Loại bỏ các prefix đã biết như /admin/, /hr-manager/, /staff/, etc.
    const prefixes = [
        'admin/',
        'hr-manager/',
        'hr-it/',
        'hr-finance/',
        'hr-construction/',
        'hr-administration/',
        'hr-support/',
        'hr-staff/',
        'staff/',
        'director/',
        'manager-HR/',
        'employee/'
    ];
    for (const p of prefixes) {
        if (page.startsWith(p)) {
            page = page.replace(p, '');
            break;
        }
    }

    if (page === 'index.html' || page === '/' || page === '' || page === 'dashboard') {
        return 'dashboard';
    }

    // Xử lý deep links cho profiles
    if (page.startsWith('myprofile/')) {
        return page;
    }

    return page;
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

export function getRolePrefix() {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const positionName = localStorage.getItem('position_name') || '';

    // Xác định prefix chuyên nghiệp dựa trên role và position
    let prefix = 'staff/'; // Mặc định cho Level 4

    if (roleLevel === 1) {
        prefix = 'admin/';
    } else if (roleLevel === 2) {
        prefix = 'hr-manager/';
    } else if (roleLevel === 3) {
        // HR Staff - xác định subdirectory dựa trên position
        const posLower = positionName.toLowerCase();
        if (posLower.includes('it')) {
            prefix = 'hr-it/';
        } else if (posLower.includes('finance')) {
            prefix = 'hr-finance/';
        } else if (posLower.includes('construction')) {
            prefix = 'hr-construction/';
        } else if (posLower.includes('administration')) {
            prefix = 'hr-administration/';
        } else if (posLower.includes('other') || posLower.includes('support')) {
            prefix = 'hr-support/';
        } else {
            prefix = 'hr-staff/'; // dự phòng
        }
    }
    return prefix;
}

// Hiển thị toàn cục
window.getRolePrefix = getRolePrefix;

export function navigateTo(pageId) {
    const prefix = getRolePrefix();

    // Xây dựng URL chuyên nghiệp
    const newPath = `${BASE_PATH}/${prefix}${pageId}`;

    // Tránh double slashes và sửa URL
    const fixedPath = newPath.replace(/\/+/g, '/');

    window.history.pushState({ pageId }, '', fixedPath);
    switchPage(pageId, false);
}

export async function switchPage(page, updateHistory = true) {
    // Làm sạch page ID - Giữ slashes cho nested routing
    const cleanPage = page.replace('.html', '');

    if (updateHistory) {
        navigateTo(cleanPage);
        return;
    }

    setCurrentPage(cleanPage);

    // Cập nhật trạng thái Sidebar
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
 * Quyền Sidebar & Bản địa hóa
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

    // 2. Xử lý Submenus cho Attendance & Salary
    const attendanceGroup = document.getElementById('attendance-nav-group');
    const salaryGroup = document.getElementById('salary-nav-group');

    if (attendanceGroup) {
        let submenu = attendanceGroup.querySelector('.submenu');
        if (!submenu) {
            submenu = document.createElement('div');
            submenu.className = 'submenu';
            attendanceGroup.appendChild(submenu);
        }

        // LUÔN cập nhật submenu HTML để đảm bảo code mới nhất
        submenu.innerHTML = `
            <button class="submenu-item" data-page="attendance-my">
                <span class="nav-text">My Attendance</span>
            </button>
            <button class="submenu-item" data-page="attendance-team" data-requires-level="3">
                <span class="nav-text">Employee Attendance</span>
            </button>
            <button class="submenu-item" data-page="ai-insights" data-requires-level="2">
                <span class="nav-text">Diagnostic Insights</span>
            </button>
            <button class="submenu-item" data-page="face-requests" data-requires-level="3">
                <span class="nav-text">Face ID Requests</span>
            </button>
            <button class="submenu-item" data-page="gate-monitoring" data-requires-level="2">
                <span class="nav-text">Gate Monitoring</span>
            </button>
            <button class="submenu-item" data-page="snapshots" data-requires-level="2">
                <span class="nav-text">Snapshots</span>
            </button>
        `;

        // Luôn hiện submenu, nhưng ẩn các item cụ thể dựa trên role
        submenu.style.display = 'block';

        // Ẩn Employee Attendance cho Level 4
        const employeeAttendanceBtn = submenu.querySelector('[data-page="attendance-team"]');
        if (employeeAttendanceBtn) {
            employeeAttendanceBtn.style.display = roleLevel <= 3 ? 'block' : 'none';
        }

        // Ẩn AI Insights cho Level 3 và 4
        const aiMetricsBtn = submenu.querySelector('[data-page="ai-insights"]');
        if (aiMetricsBtn) {
            aiMetricsBtn.style.display = roleLevel <= 2 ? 'block' : 'none';
        }

        // Ẩn Face ID Requests cho Level 3 và 4
        const faceRequestsBtn = submenu.querySelector('[data-page="face-requests"]');
        if (faceRequestsBtn) {
            faceRequestsBtn.style.display = roleLevel <= 3 ? 'block' : 'none';
        }

        // Ẩn Gate Monitoring cho Level 3 và 4
        const gateMonitoringBtn = submenu.querySelector('[data-page="gate-monitoring"]');
        if (gateMonitoringBtn) {
            gateMonitoringBtn.style.display = roleLevel <= 2 ? 'block' : 'none';
        }

        // Ẩn Snapshots cho Level 3 và 4
        const snapshotsBtn = submenu.querySelector('[data-page="snapshots"]');
        if (snapshotsBtn) {
            snapshotsBtn.style.display = roleLevel <= 2 ? 'block' : 'none';
        }
    }

    if (salaryGroup) {
        // Inject hoặc cập nhật submenu Salary
        let submenu = salaryGroup.querySelector('.submenu');
        if (!submenu) {
            submenu = document.createElement('div');
            submenu.className = 'submenu';
            submenu.innerHTML = `
                <button class="submenu-item" data-page="salary-my/payroll">
                    <span class="nav-text">My Salary</span>
                </button>
                <button class="submenu-item" data-page="salary-team/payroll" data-requires-level="3">
                    <span class="nav-text">Employee Salary</span>
                </button>
            `;
            salaryGroup.appendChild(submenu);
        }

        // Luôn hiện submenu
        submenu.style.display = 'block';

        // Ẩn Employee Salary cho Level 4
        const employeeSalaryBtn = submenu.querySelector('[data-page="salary-team/payroll"]');
        if (employeeSalaryBtn) {
            employeeSalaryBtn.style.display = roleLevel <= 3 ? 'block' : 'none';
        }
    }

    // 3. Thiết lập sub-nav listeners (cho các elements được inject mới)
    const submenuItems = document.querySelectorAll('.submenu-item');
    submenuItems.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const page = btn.getAttribute('data-page');
            window.navigateTo(page);
        };
    });

    // Dọn dẹp module performance legacy
    const performanceNav = document.getElementById('performance-nav-group') || document.querySelector('[data-page="performance"]')?.parentElement;
    if (performanceNav) performanceNav.remove();
}

let isHeaderSetup = false;
export function setupHeaderListeners() {
    if (isHeaderSetup) return;
    isHeaderSetup = true;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logout());
    }

    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.navigateTo('myprofile/information');
        });
    }

    // Logic Chuông Thông báo
    const bellBtn = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');

    if (bellBtn && dropdown) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Tính toán vị trí cho dropdown cố định
            const rect = bellBtn.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${rect.bottom + 8}px`;
            dropdown.style.right = `${window.innerWidth - rect.right}px`;
            dropdown.style.left = 'auto';

            // Bật/tắt hiển thị
            if (dropdown.style.display === 'none' || dropdown.style.display === '') {
                dropdown.style.display = 'block';
                updateNotificationUI();
            } else {
                dropdown.style.display = 'none';
            }
        });

        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
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

    // Kiểm tra ban đầu cho thông báo
    updateNotificationUI();
    // Tự động làm mới thông báo mỗi 30 giây
    setInterval(async () => {
        await fetchAnnouncements();
        updateNotificationUI();
    }, 30000);
}

/**
 * Cập nhật badge và các dropdown items
 */
export function updateNotificationUI() {
    const appData = getState();
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');
    const announcements = appData.announcements || [];
    const visibleAnnouncements = announcements; // Backend đã lọc những cái ẩn

    if (badge) {
        badge.textContent = visibleAnnouncements.length;
        badge.style.display = visibleAnnouncements.length > 0 ? 'flex' : 'none';
    }

    if (!list) return;

    if (visibleAnnouncements.length === 0) {
        list.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #94a3b8;">
                <div style="font-size: 2rem; margin-bottom: 10px;">✨</div>
                <p style="font-size: 0.85rem; font-weight: 500;">All caught up!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = visibleAnnouncements.map(ann => `
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

export async function dismissNotif(id, e) {
    if (e) e.stopPropagation();

    try {
        // Gọi API để soft delete
        await dismissNotification(id);

        // Làm mới dữ liệu announcements từ server (sẽ lọc những cái ẩn)
        await fetchAnnouncements();

        // Cập nhật UI chuông
        updateNotificationUI();

        // Nếu đang ở trang announcements, cũng làm mới nó
        const state = getState();
        if (state.currentPage === 'announcements') {
            const { renderAnnouncements } = await import('./announcements.js');
            const contentArea = document.getElementById('content-area');
            if (contentArea) contentArea.innerHTML = await renderAnnouncements();
        }

        // Lưu ý: showToast thường global hoặc có từ nơi khác, 
        // nếu không thì có thể dùng alert hoặc bỏ qua nếu nó không được define.
        // Dựa trên các files khác, nó nên có.
        if (typeof showToast === 'function') {
            showToast('Notification dismissed', 'success');
        }
    } catch (error) {
        console.error('Error dismissing notification:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to dismiss notification', 'error');
        }
    }
}

window.dismissNotif = dismissNotif;
window.updateNotificationUI = updateNotificationUI;

export function renderPage(page) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    // Dọn dẹp camera nếu rời khỏi trang AI attendance
    if (window.cleanupAICamera && typeof window.cleanupAICamera === 'function') {
        window.cleanupAICamera();
    }
    if (window.p_stopEnroll && typeof window.p_stopEnroll === 'function') {
        window.p_stopEnroll();
    }

    const V = new Date().getTime();
    const loaders = {
        'dashboard': () => import(`../modules/dashboard.js?v=${V}`).then(m => contentArea.innerHTML = m.renderDashboard()),
        'employees': () => import(`../modules/employees.js?v=${V}`).then(m => {
            contentArea.innerHTML = m.renderEmployees();
            m.setupEmployeesListeners();
        }),
        'leave': () => import(`../modules/leaves.js?v=${V}`).then(m => contentArea.innerHTML = m.renderLeave()),
        'attendance-team': () => import(`../modules/attendance.js?v=${V}`).then(async m => {
            contentArea.innerHTML = m.renderAttendance('team');
            if (m.setupAttendanceHandlers) m.setupAttendanceHandlers();
        }),
        'attendance-my': () => import(`../modules/attendance.js?v=${V}`).then(async m => {
            contentArea.innerHTML = m.renderAttendance('my');
            if (m.setupAttendanceHandlers) m.setupAttendanceHandlers();
        }),
        'salary-my': () => import(`../modules/payroll.js?v=${V}`).then(async m => {
            const { fetchEmployees, fetchPayroll } = await import(`../core/api.js?v=${V}`);
            await fetchEmployees();
            await fetchPayroll();
            contentArea.innerHTML = m.renderSalary('my');
        }),
        'salary-team': () => import(`../modules/payroll.js?v=${V}`).then(async m => {
            const { fetchEmployees, fetchPayroll } = await import(`../core/api.js?v=${V}`);
            await fetchEmployees();
            await fetchPayroll();
            contentArea.innerHTML = m.renderSalary('team');
        }),
        'announcements': () => import(`../modules/announcements.js?v=${V}`).then(async m => contentArea.innerHTML = await m.renderAnnouncements()),
        'ai-attendance': () => import(`../modules/ai_attendance.js?v=${V}`).then(m => contentArea.innerHTML = m.renderAIAttendance()),
        'myprofile': () => import(`../modules/profile-page.js?v=${V}`).then(async m => {
            contentArea.innerHTML = await m.renderProfilePage();
            m.setupProfilePageHandlers();
        }),
        'ai-insights': () => import(`../modules/ai_insights.js?v=${V}`).then(async m => {
            contentArea.innerHTML = await m.renderAIInsights();
        }),
        'face-requests': () => import(`../modules/face_requests.js?v=${V}`).then(async m => {
            contentArea.innerHTML = await m.renderFaceRequests();
        }),
        'gate-monitoring': () => import(`../modules/gate-monitoring.js?v=${V}`).then(async m => {
            contentArea.innerHTML = await m.renderGateMonitoring();
        }),
        'snapshots': () => import(`../modules/snapshots.js?v=${V}`).then(async m => {
            contentArea.innerHTML = await m.renderSnapshots();
            m.setupSnapshotsHandlers();
        })
    };

    // Xử lý đặc biệt cho nested salary routes
    if (page.startsWith('salary-')) {
        const parts = page.split('/');
        const modeAndBase = parts[0];
        const subPath = parts[1] || 'payroll';
        const mode = modeAndBase.replace('salary-', '');
        const subview = subPath === 'salary-request' ? 'adjustments' : 'list';

        import(`../modules/payroll.js?v=${V}`).then(async m => {
            if (subview === 'adjustments') {
                const api = await import(`../core/api.js?v=${V}`);
                await api.fetchSalaryAdjustments();
            }
            contentArea.innerHTML = m.renderSalary(mode, subview);
        });
        return;
    }

    // Xử lý deep links cho profiles
    if (page.startsWith('myprofile/')) {
        const subTab = page.split('/')[1] || 'information';
        import(`../modules/profile-page.js?v=${V}`).then(async m => {
            contentArea.innerHTML = await m.renderProfilePage();
            m.setupProfilePageHandlers();
            if (subTab !== 'information') window.switchProfileSubTab(subTab);
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
