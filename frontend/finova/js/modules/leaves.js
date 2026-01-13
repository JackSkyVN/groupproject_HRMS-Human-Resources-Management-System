/**
 * Module Nghỉ Phép - Quản lý Yêu cầu Nghỉ Phép
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';
import { showToast } from '../utils/toast.js';
import { closeModal } from '../utils/modal.js';
import { isDepartmentManagedByPosition } from '../utils/helpers.js';
import { showConfirmDialog } from '../utils/dialogs.js';

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

    if (appData.isInitialLoading) {
        return '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">Loading leave requests...</td></tr>';
    }

    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const currentPosition = localStorage.getItem('position_name') || '';
    const currentUserId = Number(localStorage.getItem('employee_id') || 0);

    let filtered = (appData.leaveRequests || []);

    // Lọc theo Role cho Level 3
    if (roleLevel === 3) {
        filtered = filtered.filter(l => {
            // HR Staff thấy yêu cầu của chính họ HOẶC yêu cầu từ nhóm department họ quản lý
            if (Number(l.employeeId) === currentUserId) return true;
            return isDepartmentManagedByPosition(l.employeeDeptName, currentPosition);
        });
    }

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

        // Kiểm tra Phê duyệt Tổng quát: Level cao hơn có thể phê duyệt cho level thấp hơn
        // HOẶC Level 1 & Level 2 có thể phê duyệt cho nhau (nhưng KHÔNG tự phê duyệt)
        let canApprove = false;
        if (leave.status === 'pending' && leave.employeeId !== appData.currentUser?.id) {
            const targetLevel = leave.employeeRoleLevel;

            // 1. Phê duyệt Phân cấp Chuẩn
            if (roleLevel < targetLevel) {
                if (roleLevel === 3) {
                    const currentPosition = localStorage.getItem('position_name') || '';
                    if (isDepartmentManagedByPosition(leave.employeeDeptName, currentPosition)) canApprove = true;
                } else {
                    canApprove = true;
                }
            }
            // 2. Phê duyệt Chéo cho L1 & L2
            else if (roleLevel <= 2 && targetLevel <= 2) {
                canApprove = true;
            }
        }

        if (canApprove) {
            buttons += `
                <button class="btn btn-small btn-success" onclick="approveLeave(${leave.id})">Approve</button>
                <button class="btn btn-small btn-danger" onclick="rejectLeave(${leave.id})">Reject</button>
            `;
        }

        // Logic XÓA VĨNH VIỄN:
        // 1. L1/L2 có thể xóa BẤT KỲ yêu cầu
        // 2. Chủ sở hữu có thể xóa nếu vẫn PENDING
        let canDelete = false;
        if (roleLevel <= 2) {
            canDelete = true;
        } else if (leave.employeeId === appData.currentUser?.id && leave.status === 'pending') {
            canDelete = true;
        }

        if (canDelete) {
            buttons += `<button class="btn btn-small btn-danger" onclick="deleteLeave(${leave.id})">Delete</button>`;
        }

        const badgeClass = leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'danger';
        const statusText = statusMap[leave.status] || leave.status;
        const typeText = formatLeaveType(leave.type);

        return `
        <tr>
            <td><strong>${leave.employeeName || '-'}</strong></td>
            <td>${typeText}</td>
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

// Hàm global
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
            showToast("Leave submitted", 'success');
            closeModal();
            const { fetchLeaves } = await import('../core/api.js');
            await fetchLeaves();
            const content = document.getElementById('content-area');
            if (content) content.innerHTML = renderLeave();
        } else {
            const err = await response.json();
            showToast("Error: " + (err.detail || "Could not submit"), "error");
        }
    } catch (e) {
        console.error("[Leaves] Submission failed:", e);
        showToast("Server connection error: " + e.message, "error");
    }
};

window.approveLeave = async function (id) {
    await updateLeaveStatus(id, 'approved');
};

window.rejectLeave = async function (id) {
    await updateLeaveStatus(id, 'rejected');
};

window.viewLeave = async function (id) {
    const appData = getState();
    const leave = (appData.leaveRequests || []).find(l => l.id === id);
    if (!leave) return;

    const { createModal } = await import('../utils/modal.js');
    const content = `
        <style>
            .leave-detail { padding: 10px; line-height: 1.6; }
            .leave-row { display: flex; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .leave-label { width: 120px; color: #64748b; font-weight: 500; }
            .leave-value { flex: 1; color: #1e293b; font-weight: 600; }
            .leave-reason { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 15px; }
        </style>
        <div class="leave-detail">
            <div class="leave-row"> <span class="leave-label">Requester:</span> <span class="leave-value">${leave.employeeName || '-'}</span> </div>
            <div class="leave-row"> <span class="leave-label">Type:</span> <span class="leave-value">${formatLeaveType(leave.type)}</span> </div>
            <div class="leave-row"> <span class="leave-label">Duration:</span> <span class="leave-value">${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}</span> </div>
            <div class="leave-row"> <span class="leave-label">Total Days:</span> <span class="leave-value">${leave.days || '0'} day(s)</span> </div>
            <div class="leave-row"> <span class="leave-label">Status:</span> <span class="leave-value"><span class="badge badge-${leave.status === 'approved' ? 'success' : leave.status === 'pending' ? 'warning' : 'danger'}">${(leave.status || 'pending').toUpperCase()}</span></span> </div>
            ${leave.approverName ? `<div class="leave-row"> <span class="leave-label">Approver:</span> <span class="leave-value">${leave.approverName}</span> </div>` : `<div class="leave-row"> <span class="leave-label">Approver:</span> <span class="leave-value">-</span> </div>`}
            
            <div class="leave-reason">
                <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 5px; font-weight: 600;">REASON FOR LEAVE:</div>
                <div style="font-size: 1rem; color: #334155; font-style: italic;">"${leave.reason || 'No reason provided.'}"</div>
            </div>
        </div>
    `;

    createModal({
        title: `Leave Detail: ${leave.employeeName}`,
        content: content,
        submitText: 'Close',
        isStatic: true
    });
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
            showToast(`Leave ${newStatus === 'approved' ? 'approved' : 'rejected'}`, 'success');
            const { fetchLeaves } = await import('../core/api.js');
            await fetchLeaves();
            const content = document.getElementById('content-area');
            if (content) content.innerHTML = renderLeave();
        } else {
            const err = await res.json();
            showToast("Error: " + (err.detail || "Permission denied"), 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Connection error', 'error');
    }
}

function formatLeaveType(type) {
    if (!type) return 'N/A';
    const map = {
        'annual_leave': 'Annual Leave',
        'sick_leave': 'Sick Leave',
        'unpaid_leave': 'Unpaid Leave',
        'other': 'Other'
    };
    return map[type] || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

window.deleteLeave = async function (id) {
    showConfirmDialog("Delete this leave request?", async () => {

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/leaves/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                showToast("Leave deleted permanently", 'success');
                // Làm mới UI
                const { fetchLeaves } = await import('../core/api.js');
                await fetchLeaves();
                const content = document.getElementById('content-area');
                if (content) content.innerHTML = renderLeave();
            } else {
                const err = await res.json();
                showToast("Error: " + (err.detail || "Could not delete"), 'error');
            }
        } catch (e) {
            console.error("[Leaves] Delete failed:", e);
            showToast("Connection error: " + e.message, 'error');
        }
    });
};
