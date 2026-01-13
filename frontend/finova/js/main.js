/**
 * Main Entry Point - HR Dashboard
 */

import { initState } from './core/state.js';
import { fetchDashboardData } from './core/api.js';
import { initNavigation, setupHeaderListeners } from './modules/navigation.js';
import { renderPage } from './modules/navigation.js';

/**
 * Initialize application
 */
async function initApp() {
    console.log('[App] Initializing HR Dashboard...');

    // 1. Khởi tạo state
    initState();

    // 2. Thiết lập navigation
    initNavigation();

    // 3. Lấy tất cả dữ liệu từ backend
    try {
        const { getState, getCurrentPage } = await import('./core/state.js');
        const { renderPage } = await import('./modules/navigation.js');

        const state = getState();
        state.isInitialLoading = true; // Đánh dấu đang loading

        await fetchDashboardData();

        state.isInitialLoading = false; // Đánh dấu hoàn tất

        const currentPage = getCurrentPage();

        if (currentPage) {
            console.log(`[App] Data loaded, refreshing page: ${currentPage}`);
            renderPage(currentPage);
        }
    } catch (error) {
        console.error('[App] Failed to load dashboard data:', error);
        const { getState } = await import('./core/state.js');
        getState().isInitialLoading = false;
    }

    // 4. Rendering ban đầu được xử lý bởi initNavigation dựa trên URL hash

    console.log('[App] Initialization complete');
}

// Khởi động app khi DOM ready
document.addEventListener('DOMContentLoaded', initApp);
