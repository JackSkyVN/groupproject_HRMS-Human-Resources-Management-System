/**
 * Module AI Insights - Cháº©n Ä‘oÃ¡n thá»i gian thá»±c cho Admin/HR
 */

import { getState } from '../core/state.js';
import { fetchAPI } from '../core/api.js';
import { showToast } from '../utils/toast.js';

let refreshInterval = null;

export async function renderAIInsights() {
    try {
        const [stats, perfStats, sessions, logs] = await Promise.all([
            fetchAPI('/api/v1/face-attendance/stats'),
            fetchAPI('/api/v1/face-attendance/performance-stats'),
            fetchAPI('/api/v1/face-attendance/active-sessions'),
            fetchAPI('/api/v1/face-attendance/logs?limit=20')
        ]);

        // Báº¯t Ä‘áº§u auto-refresh
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => refreshDashboard(), 5000);

        return `
            <div class="page-header">
                <h1>Diagnostic Dashboard</h1>
            </div>

            <!-- Live Sessions -->
            <div class="card" style="margin-bottom: 24px; padding: 0; overflow: hidden;">
                <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
                    <h3 style="margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${sessions.count > 0 ? '#10b981' : '#94a3b8'}; box-shadow: 0 0 10px ${sessions.count > 0 ? '#10b981' : '#94a3b8'};"></div>
                        Live Sessions (${sessions.count})
                    </h3>
                    <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">Auto-refresh: 5s</span>
                </div>
                <div id="live-sessions-container" style="padding: 24px;">
                    ${renderLiveSessions(sessions.active_sessions)}
                </div>
            </div>

            <!-- Performance Metrics -->
            <div class="card" style="margin-bottom: 24px; padding: 0; overflow: hidden;">
                <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #fafafa;">
                    <h3 style="margin: 0; font-size: 1rem; font-weight: 700;">Performance Metrics</h3>
                </div>
                <div id="performance-metrics-container" style="padding: 24px;">
                    ${renderPerformanceMetrics(perfStats)}
                </div>
            </div>

            <!-- Overall Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
                <div class="card" style="margin-bottom: 0; padding: 24px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">Total Attempts</div>
                    <div style="font-size: 2rem; font-weight: 800; color: #1e293b;">${stats.total_attempts}</div>
                </div>
                <div class="card" style="margin-bottom: 0; padding: 24px; border-left: 4px solid #10b981;">
                    <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">Success Rate</div>
                    <div style="font-size: 2rem; font-weight: 800; color: #10b981;">${stats.success_rate}%</div>
                </div>
                <div class="card" style="margin-bottom: 0; padding: 24px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">Avg Confidence</div>
                    <div style="font-size: 2rem; font-weight: 800; color: #f59e0b;">${stats.avg_score}</div>
                </div>
            </div>

            <!-- Historical Logs Table -->
            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
                    <h3 style="margin: 0; font-size: 1rem; font-weight: 700;">Recent Verification Logs</h3>
                    <button class="btn btn-secondary btn-small" onclick="window.refreshAIInsights()">Refresh Data</button>
                </div>
                
                <!-- FILTERS -->
                <div style="padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 12px;">
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Search Employee</label>
                            <input 
                                type="text" 
                                id="ai-employee-search" 
                                placeholder="Name or ID..." 
                                onkeyup="window.applyAIFilters()"
                                style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;"
                            />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Outcome</label>
                            <select 
                                id="ai-outcome-filter" 
                                onchange="window.applyAIFilters()"
                                style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; font-weight: 600; background: white;"
                            >
                                <option value="all">All Outcomes</option>
                                <option value="matched">MATCHED</option>
                                <option value="rejected">REJECTED</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Date From</label>
                            <input 
                                type="date" 
                                id="ai-date-from" 
                                onchange="window.applyAIFilters()"
                                style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;"
                            />
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Date To</label>
                            <input 
                                type="date" 
                                id="ai-date-to" 
                                onchange="window.applyAIFilters()"
                                style="width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem;"
                            />
                        </div>
                    </div>
                    <button 
                        onclick="window.resetAIFilters()" 
                        style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer;"
                    >Reset</button>
                </div>
                
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: #f8fafc; text-align: left;">
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Employee</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Timestamp</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Score</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Pose</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Outcome</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Diagnostics</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 16px 24px; font-weight: 700; color: #1e293b;">${log.employee_name}</td>
                                    <td style="padding: 16px 24px; color: #64748b;">${new Date(log.timestamp).toLocaleString()}</td>
                                    <td style="padding: 16px 24px;">
                                        <span style="font-weight: 800; color: ${log.score > 0.5 ? '#10b981' : '#f59e0b'}">${log.score.toFixed(3)}</span>
                                    </td>
                                    <td style="padding: 16px 24px;">
                                        <span style="padding: 4px 8px; border-radius: 6px; background: #f1f5f9; font-size: 0.75rem; font-weight: 700; color: #475569;">${log.pose}</span>
                                    </td>
                                    <td style="padding: 16px 24px;">
                                        <span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: ${log.matched ? '#10b981' : '#ef4444'}">
                                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${log.matched ? '#10b981' : '#ef4444'}"></div>
                                            ${log.matched ? 'MATCHED' : 'REJECTED'}
                                        </span>
                                    </td>
                                    <td style="padding: 16px 24px; font-family: monospace; font-size: 0.8rem; color: #64748b;">
                                        ${log.diag ? `Off: ${log.diag.off} | Br: ${log.diag.br} | VR: ${log.diag.vrat}` : 'N/A'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${logs.length === 0 ? `
                    <div style="padding: 40px; text-align: center; color: #94a3b8;">No verification logs found yet.</div>
                ` : ''}
            </div>
        `;
    } catch (err) {
        console.error(err);
        return `<div class="card" style="padding: 40px; text-align: center; color: #ef4444;">Failed to load AI Insights: ${err.message}</div>`;
    }
}

function renderLiveSessions(sessions) {
    if (!sessions || sessions.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <p style="font-weight: 600; margin: 0;">No active sessions</p>
            </div>
        `;
    }

    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
            ${sessions.map(session => `
                <div style="padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1.1rem;">
                            ${session.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">${session.employee_name}</div>
                            <div style="font-size: 0.75rem; color: #64748b;">ID: ${session.employee_id}</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                        <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Intent:</span>
                        <span style="background: ${session.intent === 'checkin' ? '#dcfce7' : '#fef3c7'}; color: ${session.intent === 'checkin' ? '#166534' : '#92400e'}; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">
                            ${session.intent === 'checkin' ? 'Check-In' : 'Check-Out'}
                        </span>
                    </div>
                    <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 8px; text-align: center;">
                        ${new Date(session.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPerformanceMetrics(stats) {
    const fpsColor = stats.avg_fps > 1 ? '#10b981' : stats.avg_fps > 0.5 ? '#f59e0b' : '#ef4444';
    const yoloColor = stats.avg_yolo_time < 100 ? '#10b981' : stats.avg_yolo_time < 200 ? '#f59e0b' : '#ef4444';
    const embColor = stats.avg_embedding_time < 50 ? '#10b981' : stats.avg_embedding_time < 100 ? '#f59e0b' : '#ef4444';

    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">FPS (Requests/sec)</span>
                    <span style="font-size: 1.2rem; font-weight: 800; color: ${fpsColor}">${stats.avg_fps}</span>
                </div>
                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(stats.avg_fps * 50, 100)}%; height: 100%; background: ${fpsColor}; transition: width 0.3s;"></div>
                </div>
            </div>

            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">YOLO Detection</span>
                    <span style="font-size: 1.2rem; font-weight: 800; color: ${yoloColor}">${stats.avg_yolo_time}ms</span>
                </div>
                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(stats.avg_yolo_time / 3, 100)}%; height: 100%; background: ${yoloColor}; transition: width 0.3s;"></div>
                </div>
            </div>

            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">Embedding Extract</span>
                    <span style="font-size: 1.2rem; font-weight: 800; color: ${embColor}">${stats.avg_embedding_time}ms</span>
                </div>
                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(stats.avg_embedding_time / 1.5, 100)}%; height: 100%; background: ${embColor}; transition: width 0.3s;"></div>
                </div>
            </div>

            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">Total Requests</span>
                    <span style="font-size: 1.2rem; font-weight: 800; color: #6366f1">${stats.total_requests}</span>
                </div>
                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                    <div style="width: 100%; height: 100%; background: #6366f1;"></div>
                </div>
            </div>
        </div>
    `;
}

async function refreshDashboard() {
    try {
        const [perfStats, sessions] = await Promise.all([
            fetchAPI('/api/v1/face-attendance/performance-stats'),
            fetchAPI('/api/v1/face-attendance/active-sessions')
        ]);

        // Cáº­p nháº­t live sessions
        const sessionsContainer = document.getElementById('live-sessions-container');
        if (sessionsContainer) {
            sessionsContainer.innerHTML = renderLiveSessions(sessions.active_sessions);
        }

        // Cáº­p nháº­t performance metrics
        const perfContainer = document.getElementById('performance-metrics-container');
        if (perfContainer) {
            perfContainer.innerHTML = renderPerformanceMetrics(perfStats);
        }

        // Cáº­p nháº­t session count trong header
        const header = document.querySelector('.card h3');
        if (header && header.textContent.includes('Live Sessions')) {
            const dot = header.querySelector('div');
            if (dot) {
                dot.style.background = sessions.count > 0 ? '#10b981' : '#94a3b8';
                dot.style.boxShadow = `0 0 10px ${sessions.count > 0 ? '#10b981' : '#94a3b8'}`;
            }
            header.childNodes[2].textContent = ` Live Sessions (${sessions.count})`;
        }
    } catch (err) {
        console.error('Failed to refresh dashboard:', err);
    }
}

// Dá»n dáº¹p khi rá»i trang
window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});

// Global function cho nÃºt Refresh Data
window.refreshAIInsights = async function () {
    const refreshBtn = event?.target;
    const originalHTML = refreshBtn?.innerHTML || 'Refresh Data';

    try {
        // Hiá»ƒn thá»‹ loading state
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Refreshing...</span>';
            refreshBtn.style.opacity = '0.7';
            refreshBtn.style.cursor = 'not-allowed';
        }

        const [stats, perfStats, sessions, logs] = await Promise.all([
            fetchAPI('/api/v1/face-attendance/stats'),
            fetchAPI('/api/v1/face-attendance/performance-stats'),
            fetchAPI('/api/v1/face-attendance/active-sessions'),
            fetchAPI('/api/v1/face-attendance/logs?limit=20')
        ]);

        // Reload toÃ n bá»™ trang vá»›i data má»›i
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = await renderAIInsights();
        }

        const timestamp = new Date().toLocaleTimeString();
        showToast(`Data refreshed at ${timestamp}`, 'success');
    } catch (err) {
        console.error('Failed to refresh:', err);
        showToast('Failed to refresh data', 'error');

        // KhÃ´i phá»¥c nÃºt náº¿u lá»—i
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.style.opacity = '1';
            refreshBtn.style.cursor = 'pointer';
        }
    }
};

// Filter functions for AI Insights
window.applyAIFilters = async function () {
    const employee = document.getElementById('ai-employee-search')?.value || '';
    const outcome = document.getElementById('ai-outcome-filter')?.value || 'all';
    const dateFrom = document.getElementById('ai-date-from')?.value || '';
    const dateTo = document.getElementById('ai-date-to')?.value || '';
    const params = new URLSearchParams({ limit: '50' });
    if (employee) params.set('employee_name', employee);
    if (outcome && outcome !== 'all') params.set('outcome', outcome);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    try {
        const logs = await fetchAPI(`/api/v1/face-attendance/logs?${params.toString()}`);
        const tbody = document.querySelector('table tbody');
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">No logs found.</td></tr>`;
        } else {
            tbody.innerHTML = logs.map(log => `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 16px 24px; font-weight: 700; color: #1e293b;">${log.employee_name}</td><td style="padding: 16px 24px; color: #64748b;">${new Date(log.timestamp).toLocaleString()}</td><td style="padding: 16px 24px;"><span style="font-weight: 800; color: ${log.score > 0.5 ? '#10b981' : '#f59e0b'}">${log.score.toFixed(3)}</span></td><td style="padding: 16px 24px;"><span style="padding: 4px 8px; border-radius: 6px; background: #f1f5f9; font-size: 0.75rem; font-weight: 700; color: #475569;">${log.pose}</span></td><td style="padding: 16px 24px;"><span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: ${log.matched ? '#10b981' : '#ef4444'}"><div style="width: 8px; height: 8px; border-radius: 50%; background: ${log.matched ? '#10b981' : '#ef4444'}"></div>${log.matched ? 'MATCHED' : 'REJECTED'}</span></td><td style="padding: 16px 24px; font-family: monospace; font-size: 0.8rem; color: #64748b;">${log.diag ? `Off: ${log.diag.off} | Br: ${log.diag.br} | VR: ${log.diag.vrat}` : 'N/A'}</td></tr>`).join('');
        }
    } catch (err) { console.error(err); }
};

window.resetAIFilters = function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ai-employee-search').value = '';
    document.getElementById('ai-outcome-filter').value = 'all';
    document.getElementById('ai-date-from').value = today;
    document.getElementById('ai-date-to').value = today;
    applyAIFilters();
};

