/**
 * Leaves Module - Leave Request Management
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';
import { showToast } from '../utils/toast.js';
import { closeModal } from '../utils/modal.js';

export function renderLeave() {
    return `
        <div class="page-header">
            <h1>Leave Management</h1>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Leave Requests</h2>
                <button class="btn btn-primary" onclick="openAddLeaveModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Request
                </button>
            </div>

            <div class="filter-section" style="padding: 20px; display: flex; gap: 12px;">
                <select class="filter-select" id="leave-status-filter" onchange="filterLeaveRequests()" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Approver</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="leave-table-body">
                        ${renderLeaveRows()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderLeaveRows(statusFilter = 'all') {
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    let filtered = appData.leaveRequests || [];

    if (statusFilter !== 'all') {
        filtered = filtered.filter(l => l.status === statusFilter);
    }

    if (filtered.length === 0) {
        return '<tr><td colspan="8" style="text-align: center; padding: 40px;">No leave requests found</td></tr>';
    }

    const statusMap = {
        'approved': 'Approved',
        'pending': 'Pending',
        'rejected': 'Rejected'
    };

    return filtered.map(leave => {
        let buttons = `<button class="btn btn-small btn-secondary" onclick="viewLeave(${leave.id})">View</button>`;

        // Tiered Approval: Level 1-3 can approve lower levels
        if (leave.status === 'pending' && roleLevel <= 3 && leave.employeeId !== appData.currentUser?.id) {
            buttons += `
                <button class="btn btn-small btn-success" onclick="approveLeave(${leave.id})">Approve</button>
                <button class="btn btn-small btn-danger" onclick="rejectLeave(${leave.id})">Reject</button>
            `;
        }

        const badgeClass = leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'danger';
        const statusText = statusMap[leave.status] || leave.status;

        return `
        <tr>
            <td><strong>${leave.employeeName}</strong></td>
            <td>${leave.type}</td>
            <td>${leave.startDate}</td>
            <td>${leave.endDate}</td>
            <td>${leave.days} days</td>
            <td><span class="badge badge-${badgeClass}">${statusText}</span></td>
            <td>${leave.approverName || '-'}</td>
            <td>
                <div class="action-buttons">
                    ${buttons}
                </div>
            </td>
        </tr>
    `}).join('');
}

// Global functions
window.filterLeaveRequests = function () {
    const statusFilter = document.getElementById('leave-status-filter').value;
    const tbody = document.getElementById('leave-table-body');
    tbody.innerHTML = renderLeaveRows(statusFilter);
};

window.openAddLeaveModal = function () {
    const appData = getState();
    const today = new Date().toISOString().split('T')[0];
    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">New Leave Request</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-leave-form" onsubmit="handleAddLeave(event)">
                        <div class="form-group">
                            <label class="form-label">Employee</label>
                            <input type="text" class="form-input" value="${appData.currentUser?.full_name || ''}" readonly disabled>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Leave Type</label>
                            <select class="form-select" name="leave_type_id" required>
                                <option value="1">Annual Leave</option>
                                <option value="2">Sick Leave</option>
                                <option value="3">Unpaid Leave</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-input" name="startDate" min="${today}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" class="form-input" name="endDate" min="${today}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reason</label>
                            <textarea class="form-textarea" name="reason" placeholder="Enter reason here..." required></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="document.getElementById('add-leave-form').requestSubmit()">Submit Request</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
};

window.handleAddLeave = async function (event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/leaves`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leave_type_id: parseInt(formData.get('leave_type_id')),
                start_date: formData.get('startDate'),
                end_date: formData.get('endDate'),
                reason: formData.get('reason')
            })
        });

        if (response.ok) {
            showToast("Leave request submitted successfully!", 'success');
            closeModal();
            import('../core/api.js').then(m => m.fetchDashboardData().then(() => {
                const content = document.getElementById('content-area');
                if (content) content.innerHTML = renderLeave();
            }));
        } else {
            const err = await response.json();
            showToast("Error: " + (err.detail || "Could not submit"), "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Server connection error", "error");
    }
};

window.approveLeave = async function (id) {
    await updateLeaveStatus(id, 'approved');
};

window.rejectLeave = async function (id) {
    await updateLeaveStatus(id, 'rejected');
};

window.viewLeave = function (id) {
    showToast('Details feature coming soon', 'info');
};

async function updateLeaveStatus(id, newStatus) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/leaves/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            showToast(`Leave request ${newStatus === 'approved' ? 'approved' : 'rejected'}`, 'success');
            import('../core/api.js').then(m => m.fetchDashboardData().then(() => {
                const content = document.getElementById('content-area');
                if (content) content.innerHTML = renderLeave();
            }));
        } else {
            const err = await res.json();
            showToast("Error: " + (err.detail || "Permission denied"), 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Connection error', 'error');
    }
}
