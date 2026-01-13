/**
 * Module Performance
 */

import { getState } from '../core/state.js';

export function renderPerformance() {
    return `
        <div class="page-header">
            <h1>Performance Reviews</h1>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Performance Metrics</h2>
            </div>

            <div style="padding: 40px; text-align: center; color: #64748b;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 20px;">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <h3>Performance Management</h3>
                <p>Track KPIs, set goals, and conduct performance reviews.</p>
                <p style="margin-top: 20px; font-style: italic;">Coming soon - Full implementation pending</p>
            </div>
        </div>
    `;
}
