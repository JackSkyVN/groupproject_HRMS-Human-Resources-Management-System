/**
 * AI Insights Filter Functions
 * These functions handle filtering of AI verification logs
 */

// Initialize filters on page load
window.initAIFilters = function () {
    const today = new Date().toISOString().split('T')[0];

    // Set default dates if not already set
    const dateFrom = document.getElementById('ai-date-from');
    const dateTo = document.getElementById('ai-date-to');

    if (dateFrom && !dateFrom.value) dateFrom.value = today;
    if (dateTo && !dateTo.value) dateTo.value = today;
};

// Apply filters and refresh data
window.applyAIFilters = async function () {
    const employee = document.getElementById('ai-employee-search')?.value || '';
    const outcome = document.getElementById('ai-outcome-filter')?.value || 'all';
    const dateFrom = document.getElementById('ai-date-from')?.value || '';
    const dateTo = document.getElementById('ai-date-to')?.value || '';

    // Build URL params
    const params = new URLSearchParams();
    if (employee) params.set('employee_name', employee);
    if (outcome && outcome !== 'all') params.set('outcome', outcome);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('limit', '50');

    try {
        const { fetchAPI } = await import('../core/api.js');
        const logs = await fetchAPI(`/api/v1/face-attendance/logs?${params.toString()}`);

        // Update table
        updateAILogsTable(logs);
    } catch (err) {
        console.error('Error filtering logs:', err);
        const { showToast } = await import('../utils/toast.js');
        showToast('Failed to filter logs', 'error');
    }
};

function updateAILogsTable(logs) {
    const tbody = document.querySelector('#ai-logs-table tbody');
    if (!tbody) return;

    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
                    No verification logs found for the selected filters.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = logs.map(log => `
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
    `).join('');
}

// Reset filters
window.resetAIFilters = function () {
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('ai-employee-search').value = '';
    document.getElementById('ai-outcome-filter').value = 'all';
    document.getElementById('ai-date-from').value = today;
    document.getElementById('ai-date-to').value = today;

    applyAIFilters();
};
