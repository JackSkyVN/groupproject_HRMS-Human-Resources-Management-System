/**
 * Profile Module
 */

import { getState } from '../core/state.js';
import { showToast } from '../utils/toast.js';

export function viewEmployee(id) {
    const appData = getState();
    const emp = appData.employees.find(e => e.id === id);

    if (!emp) {
        showToast('Employee not found', 'error');
        return;
    }

    const roles = JSON.parse(localStorage.getItem('roles') || '[]');
    const role = roles.includes('admin') ? 'Admin' : 'Employee';

    const modal = `
        <div class="modal-overlay" onclick="window.closeModal()">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Employee Profile</h2>
                    <button class="modal-close" onclick="window.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="salary-details" style="display: grid; gap: 12px;">
                        <div class="salary-detail-row" style="display: flex; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <span class="salary-detail-label" style="font-weight: 600; color: #64748b;">Full Name:</span>
                            <span class="salary-detail-value">${emp.name}</span>
                        </div>
                        <div class="salary-detail-row" style="display: flex; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <span class="salary-detail-label" style="font-weight: 600; color: #64748b;">Email:</span>
                            <span class="salary-detail-value">${emp.email}</span>
                        </div>
                        <div class="salary-detail-row" style="display: flex; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <span class="salary-detail-label" style="font-weight: 600; color: #64748b;">Position:</span>
                            <span class="salary-detail-value">${emp.position}</span>
                        </div>
                        <div class="salary-detail-row" style="display: flex; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <span class="salary-detail-label" style="font-weight: 600; color: #64748b;">Department:</span>
                            <span class="salary-detail-value">${emp.department}</span>
                        </div>
                        <div class="salary-detail-row" style="display: flex; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <span class="salary-detail-label" style="font-weight: 600; color: #64748b;">Phone:</span>
                            <span class="salary-detail-value">${emp.phone}</span>
                        </div>
                        <div class="salary-detail-row" style="display: flex; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <span class="salary-detail-label" style="font-weight: 600; color: #64748b;">Status:</span>
                            <span class="salary-detail-value"><span class="badge badge-success">${emp.status}</span></span>
                        </div>
                        <div class="salary-detail-row" style="display: flex; justify-content: space-between; padding: 10px; background: #f8fafc; border-radius: 6px; margin-top: 10px; font-style: italic; color: #888;">
                            <span class="salary-detail-label">ID:</span>
                            <span class="salary-detail-value">#${emp.id}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modal;
}

export function openMyProfile() {
    const appData = getState();
    if (appData.currentUser?.profile) {
        viewEmployee(appData.currentUser.profile.id);
    } else {
        showToast('Profile not loaded', 'warning');
    }
}

// Make viewEmployee global for onclick
window.viewEmployee = viewEmployee;
