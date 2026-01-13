/**
 * Snapshots Module - Biometric Verification Gallery
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';

export async function renderSnapshots() {
    const appData = getState();
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    return `
        <div style="padding: 48px; font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100vh;">
            <h1 style="font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 32px; margin-top: 0;">Snapshots</h1>
            
            <!-- Filters -->
            <div style="background: white; padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    ${roleLevel <= 2 ? `
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px;">EMPLOYEE</label>
                            <input type="text" id="snapshot-employee-filter" placeholder="Search by name or ID" style="width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                    ` : ''}
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px;">DATE FROM</label>
                        <input type="date" id="snapshot-from" style="width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px;">DATE TO</label>
                        <input type="date" id="snapshot-to" style="width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="display: flex; align-items: end; gap: 8px;">
                        <button onclick="window.loadSnapshotsData()" style="flex: 1; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Apply</button>
                        <button onclick="window.resetSnapshotFilters()" style="padding: 10px 16px; background: #f1f5f9; color: #64748b; border: none; border-radius: 8px; cursor: pointer;">Reset</button>
                    </div>
                </div>
            </div>

            <!-- Gallery Container -->
            <div id="snapshots-gallery" style="background: white; padding: 32px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="text-align: center; padding: 60px; color: #94a3b8;">
                    Click "Apply" to load snapshots
                </div>
            </div>
        </div>
    `;
}

window.loadSnapshotsData = async function () {
    const container = document.getElementById('snapshots-gallery');
    container.innerHTML = '<div style="text-align: center; padding: 60px; color: #94a3b8;">Loading...</div>';

    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const employeeFilter = document.getElementById('snapshot-employee-filter')?.value || '';
    const fromDate = document.getElementById('snapshot-from').value;
    const toDate = document.getElementById('snapshot-to').value;

    try {
        const { fetchAPI } = await import('../core/api.js');
        let endpoint = '/api/v1/attendance?';

        if (roleLevel > 2) {
            endpoint += `employee_id=${localStorage.getItem('employee_id')}&`;
        }

        if (fromDate) endpoint += `date_from=${fromDate}&`;
        if (toDate) endpoint += `date_to=${toDate}&`;

        const response = await fetchAPI(endpoint);

        // Handle both array and object response
        const data = Array.isArray(response) ? response : (response.results || response.data || []);

        // Filter records with snapshots
        let recordsWithSnapshots = data.filter(r => r.snapshot_checkin || r.snapshot_checkout);

        // Employee search filter (for Admin/HR)
        if (employeeFilter && roleLevel <= 2) {
            recordsWithSnapshots = recordsWithSnapshots.filter(r =>
                r.employee_name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
                String(r.employee_id).includes(employeeFilter)
            );
        }

        if (recordsWithSnapshots.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <div style="font-size: 18px; font-weight: 600; color: #475569;">No Snapshots Found</div>
                </div>
            `;
            return;
        }

        // Render gallery
        const galleryHTML = recordsWithSnapshots.map(record => {
            const items = [];

            if (record.snapshot_checkin) {
                items.push({
                    image: record.snapshot_checkin,
                    type: 'Check-In',
                    time: record.check_in_time,
                    score: record.face_score_checkin,
                    color: '#10b981'
                });
            }

            if (record.snapshot_checkout) {
                items.push({
                    image: record.snapshot_checkout,
                    type: 'Check-Out',
                    time: record.check_out_time,
                    score: record.face_score_checkout,
                    color: '#ef4444'
                });
            }

            return items.map(item => `
                <div style="background: #f8fafc; border-radius: 12px; overflow: hidden; border: 2px solid ${item.color}20; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''" onclick="viewSnapshot('${API_BASE_URL}/static/snapshots/${item.image}')">
                    <img src="${API_BASE_URL}/static/snapshots/${item.image}" style="width: 100%; aspect-ratio: 1; object-fit: cover;" alt="Snapshot">
                    <div style="padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 13px; font-weight: 700; color: ${item.color};">${item.type}</span>
                            <span style="font-size: 11px; background: ${item.color}20; color: ${item.color}; padding: 2px 8px; border-radius: 999px; font-weight: 600;">${(item.score * 100).toFixed(1)}%</span>
                        </div>
                        ${roleLevel <= 2 ? `<div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">${record.employee_name}</div>` : ''}
                        <div style="font-size: 12px; color: #64748b;">${record.work_date} ${item.time}</div>
                    </div>
                </div>
            `).join('');
        }).join('');

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">
                ${galleryHTML}
            </div>
        `;

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #ef4444;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Error Loading Snapshots</div>
                <div style="font-size: 14px;">${err.message}</div>
            </div>
        `;
    }
};

window.viewSnapshot = async function (url) {
    const { createModal } = await import('../utils/modal.js');
    createModal({
        title: 'Snapshot Quick View',
        content: `
            <div style="text-align: center;">
                <img src="${url}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            </div>
        `,
        submitText: 'Close',
        onSubmit: () => { }
    });
};

window.resetSnapshotFilters = function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('snapshot-from').value = '';
    document.getElementById('snapshot-to').value = '';
    if (document.getElementById('snapshot-employee-filter')) {
        document.getElementById('snapshot-employee-filter').value = '';
    }
};

export function setupSnapshotsHandlers() {
    // Auto-load today's snapshots
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('snapshot-from').value = today;
    document.getElementById('snapshot-to').value = today;
    window.loadSnapshotsData();
}
