/**
 * Announcements Module - Internal Communication
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';
import { showToast } from '../utils/toast.js';
import { closeModal } from '../utils/modal.js';

export function renderAnnouncements() {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    return `
        <div class="page-header">
            <h1>System Announcements</h1>
            ${roleLevel <= 2 ? `
                <button class="btn btn-primary" onclick="openAddAnnouncementModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Announcement
                </button>
            ` : ''}
        </div>

        <div class="announcements-container" id="announcements-list">
            ${renderAnnouncementItems()}
        </div>
    `;
}

function renderAnnouncementItems() {
    const appData = getState();
    const announcements = appData.announcements || [];

    if (announcements.length === 0) {
        return `
            <div class="card" style="text-align: center; padding: 40px;">
                <p style="color: #64748b;">No announcements for you at this time.</p>
            </div>
        `;
    }

    return announcements.map(ann => `
        <div class="card" style="margin-bottom: 20px;">
            <div class="card-header" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 15px;">
                <div>
                    <h2 class="card-title" style="color: #1e293b; margin-bottom: 4px;">${ann.title}</h2>
                    <span style="font-size: 0.85rem; color: #94a3b8;">
                        Posted by: <strong>${ann.sender_name}</strong> • ${new Date(ann.created_at).toLocaleString('en-US')}
                    </span>
                </div>
                <span class="badge badge-info">General</span>
            </div>
            <div class="card-body" style="padding-top: 15px; line-height: 1.6; color: #334155;">
                <p style="white-space: pre-wrap;">${ann.message}</p>
            </div>
        </div>
    `).join('');
}

window.openAddAnnouncementModal = function () {
    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">Create New Announcement</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-announcement-form" onsubmit="handleAddAnnouncement(event)">
                        <div class="form-group">
                            <label class="form-label">Title</label>
                            <input type="text" class="form-input" name="title" placeholder="Enter title..." required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Message</label>
                            <textarea class="form-textarea" name="message" style="height: 150px;" placeholder="Enter message..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Target Audience</label>
                            <select class="form-select" name="target_type">
                                <option value="all">All Employees</option>
                                <option value="department">By Department</option>
                                <option value="role">By Position/Role</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="document.getElementById('add-announcement-form').requestSubmit()">Post Announcement</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modal;
};

window.handleAddAnnouncement = async function (event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/announcements`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: formData.get('title'),
                message: formData.get('message'),
                target_type: formData.get('target_type')
            })
        });

        if (response.ok) {
            showToast("Announcement posted successfully!", "success");
            closeModal();
            import('../core/api.js').then(m => m.fetchDashboardData().then(() => {
                const content = document.getElementById('content-area');
                if (content) content.innerHTML = renderAnnouncements();
            }));
        } else {
            const err = await response.json();
            showToast("Error: " + (err.detail || "Could not post"), "error");
        }
    } catch (e) {
        showToast("Connection error", "error");
    }
};
