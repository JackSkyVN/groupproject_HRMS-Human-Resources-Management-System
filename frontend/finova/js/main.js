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

    // 1. Initialize state
    initState();

    // 2. Setup navigation
    initNavigation();

    // 3. Fetch all data from backend
    try {
        const { getState, getCurrentPage } = await import('./core/state.js');
        const { renderPage } = await import('./modules/navigation.js');

        const state = getState();
        state.isInitialLoading = true; // Mark as loading

        await fetchDashboardData();

        state.isInitialLoading = false; // Mark as done

        // Setup header listeners after data is loaded and DOM is ready
        setupHeaderListeners();

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

    // 4. Initial rendering is now handled by initNavigation based on URL hash

    console.log('[App] Initialization complete');
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
