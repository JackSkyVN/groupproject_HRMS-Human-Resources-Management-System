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
    setupHeaderListeners();

    // 3. Fetch all data from backend
    try {
        await fetchDashboardData();
    } catch (error) {
        console.error('[App] Failed to load dashboard data:', error);
    }

    // 4. Render initial page
    renderPage('dashboard');

    console.log('[App] Initialization complete');
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
