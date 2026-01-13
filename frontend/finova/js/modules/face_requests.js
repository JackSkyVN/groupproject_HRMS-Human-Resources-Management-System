/**
 * Quản lý Yêu cầu Reset Face ID - Chỉ Admin/HR
 */

import { getState } from '../core/state.js';
import { fetchAPI } from '../core/api.js';
import { showToast } from '../utils/toast.js';
import { showPromptDialog } from '../utils/dialogs.js';

export async function renderFaceRequests() {
    try {
        console.log('[Face Requests] Fetching requests...');
        const response = await fetchAPI('/api/v1/face-attendance/face-reset-requests?status=all');
        console.log('[Face Requests] Response:', response);

        // Xử lý trường hợp response có thể không phải array
        const requests = Array.isArray(response) ? response : [];

        const pendingCount = requests.filter(r => r.status === 'pending').length;

        return `
            <div class="page-header">
                <h1>Face ID Requests</h1>
            </div>

            <!-- Thống kê -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 32px;">
                <div class="card" style="margin-bottom: 0; padding: 24px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">Pending</div>
                    <div style="font-size: 2rem; font-weight: 800; color: #f59e0b;">${pendingCount}</div>
                </div>
                <div class="card" style="margin-bottom: 0; padding: 24px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">Total Requests</div>
                    <div style="font-size: 2rem; font-weight: 800; color: #3b82f6;">${requests.length}</div>
                </div>
            </div>

            <!-- Bảng Yêu cầu -->
            <div class="card" style="padding: 0; overflow: hidden;">
                <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
                    <h3 style="margin: 0; font-size: 1rem; font-weight: 700;">All Requests</h3>
                    <select id="status-filter" onchange="window.filterRequests(this.value)" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-weight: 600;">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: #f8fafc; text-align: left;">
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Employee</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Reason</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Requested</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Status</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Reviewed By</th>
                                <th style="padding: 16px 24px; color: #64748b; font-weight: 600;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="requests-tbody">
                            ${renderRequestsRows(requests)}
                        </tbody>
                    </table>
                </div>
                ${requests.length === 0 ? `
                    <div style="padding: 40px; text-align: center; color: #94a3b8;">No requests found.</div>
                ` : ''}
            </div>
        `;
    } catch (err) {
        console.error('[Face Requests] Error:', err);
        return `<div class="card" style="padding: 40px; text-align: center; color: #ef4444;">Failed to load requests: ${err.message}</div>`;
    }
}

function renderRequestsRows(requests) {
    if (!requests || requests.length === 0) return '';

    return requests.map(req => {
        const statusColor = req.status === 'pending' ? '#f59e0b' : req.status === 'approved' ? '#10b981' : '#ef4444';
        const statusText = req.status.toUpperCase();

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;" data-status="${req.status}">
                <td style="padding: 16px 24px; font-weight: 700; color: #1e293b;">${req.employee_name}</td>
                <td style="padding: 16px 24px; color: #64748b; max-width: 300px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${req.reason}">${req.reason}</div>
                </td>
                <td style="padding: 16px 24px; color: #64748b; font-size: 0.85rem;">${new Date(req.requested_at).toLocaleString()}</td>
                <td style="padding: 16px 24px;">
                    <span style="padding: 4px 12px; border-radius: 12px; background: ${statusColor}20; color: ${statusColor}; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">
                        ${statusText}
                    </span>
                </td>
                <td style="padding: 16px 24px; color: #64748b; font-size: 0.85rem;">
                    ${req.reviewed_by || '-'}
                    ${req.reviewed_at ? `<br><span style="font-size: 0.75rem; color: #94a3b8;">${new Date(req.reviewed_at).toLocaleString()}</span>` : ''}
                </td>
                <td style="padding: 16px 24px;">
                    ${req.status === 'pending' ? `
                        <div style="display: flex; gap: 8px;">
                            <button onclick="window.approveRequest(${req.id})" class="btn btn-small" style="background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Approve</button>
                            <button onclick="window.rejectRequest(${req.id})" class="btn btn-small" style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">Reject</button>
                        </div>
                    ` : `
                        <span style="color: #94a3b8; font-size: 0.85rem;">Processed</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

window.filterRequests = function (status) {
    const rows = document.querySelectorAll('#requests-tbody tr');
    rows.forEach(row => {
        if (status === 'all' || row.dataset.status === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

window.approveRequest = async function (requestId) {
    showPromptDialog("Optional note for approval:", "", async (note) => {

        try {
            const res = await fetchAPI(`/api/v1/face-attendance/face-reset-request/${requestId}/approve`, {
                method: 'POST',
                body: JSON.stringify({ admin_note: note || null })
            });

            if (res.ok) {
                showToast('Request approved successfully!', 'success');
                window.switchPage('face-requests'); // Làm mới trang
            } else {
                showToast(res.message || 'Failed to approve request', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error approving request', 'error');
        }
    });
};

window.rejectRequest = async function (requestId) {
    showPromptDialog("Reason for rejection (required):", "", async (note) => {

        if (!note || note.trim() === '') {
            showToast('Rejection reason is required', 'error');
            return;
        }

        try {
            const res = await fetchAPI(`/api/v1/face-attendance/face-reset-request/${requestId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ admin_note: note.trim() })
            });

            if (res.ok) {
                showToast('Request rejected', 'success');
                window.switchPage('face-requests'); // Làm mới trang
            } else {
                showToast(res.message || 'Failed to reject request', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error rejecting request', 'error');
        }
    });
};
