/**
 * Module Thông Báo - Truyền thông nội bộ (Thiết kế cao cấp)
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';
import { showToast } from '../utils/toast.js';
import { createModal } from '../utils/modal.js';
import { deleteAnnouncement, fetchAnnouncements, fetchTrashAnnouncements, restoreAnnouncement } from '../core/api.js';

// Quản lý state cho tabs
let currentTab = 'active'; // 'active' hoặc 'trash'

export async function renderAnnouncements() {
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const appData = getState();

    // Hiển skeleton ban đầu nếu chưa có dữ liệu
    if (!appData.announcements || appData.announcements.length === 0) {
        // Vẫn tiếp tục fetch ở background
        fetchAnnouncements().then(() => {
            const contentArea = document.getElementById('content-area');
            if (contentArea && window.location.hash === '#announcements') {
                renderAnnouncements().then(html => contentArea.innerHTML = html);
            }
        });

        if (!appData.announcements) {
            return `<div class="page-header"><h1>Loading Announcements...</h1></div>`;
        }
    }

    const announcements = appData.announcements || [];
    const showTrashTab = roleLevel <= 2; // Chỉ L1/L2 mới thấy trash

    return `
        <div class="page-header" style="margin-bottom: 24px;">
            <h1 style="font-family: 'Outfit', sans-serif; font-weight: 800; color: #1e293b; margin: 0 0 20px 0; font-size: 2rem;">System Announcements</h1>
            
            ${roleLevel <= 3 ? `
                <button class="btn btn-primary" onclick="window.openAddAnnouncementModal()" style="display: inline-flex; align-items: center; gap: 8px; background: #6366f1; border: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); transition: all 0.3s ease; padding: 12px 24px; margin-bottom: 24px; border-radius: 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Announcement
                </button>
            ` : ''}
            
            <!-- Tab Navigation -->
            <div style="display: flex; gap: 8px; border-bottom: 2px solid #f1f5f9; margin-bottom: 24px;">
                <button id="tab-active" onclick="window.switchAnnouncementTab('active')" style="padding: 12px 24px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; background: ${currentTab === 'active' ? '#6366f1' : 'transparent'}; color: ${currentTab === 'active' ? 'white' : '#64748b'}; border: none; border-radius: 12px 12px 0 0; cursor: pointer; transition: all 0.3s ease; margin-bottom: -2px; border-bottom: ${currentTab === 'active' ? '2px solid #6366f1' : 'none'};">
                    Active
                </button>
                ${showTrashTab ? `
                    <button id="tab-trash" onclick="window.switchAnnouncementTab('trash')" style="padding: 12px 24px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; background: ${currentTab === 'trash' ? '#6366f1' : 'transparent'}; color: ${currentTab === 'trash' ? 'white' : '#64748b'}; border: none; border-radius: 12px 12px 0 0; cursor: pointer; transition: all 0.3s ease; margin-bottom: -2px; border-bottom: ${currentTab === 'trash' ? '2px solid #6366f1' : 'none'};">
                        Trash
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- Content based on tab -->
        <div id="announcements-tab-content" class="announcements-container" style="display: grid; gap: 24px; max-width: 900px;">
            ${currentTab === 'active' ? renderActiveTab(announcements, roleLevel) : ''}
            ${currentTab === 'trash' && showTrashTab ? '<div class="loading">Loading trash...</div>' : ''}
        </div>
    `;
}

function renderActiveTab(announcements, roleLevel) {
    if (announcements.length === 0) {
        return renderEmptyState();
    }
    return announcements.map(ann => renderAnnouncementCard(ann, roleLevel, false)).join('');
}

function renderEmptyState() {
    return `
        <div style="text-align: center; padding: 80px 40px; background: white; border-radius: 24px; border: 2px dashed #e2e8f0;">
            <div style="width: 80px; height: 80px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            </div>
            <h3 style="font-family: 'Outfit', sans-serif; color: #1e293b; margin-bottom: 8px; font-weight: 700;">No Announcements</h3>
        </div>
    `;
}

function renderAnnouncementCard(ann, roleLevel, isTrash = false) {
    const isBroadcast = !ann.target_type || ann.target_type === 'all';
    const typeLabel = (ann.target_type || 'all').toUpperCase();
    const targetDetail = ann.target_detail || 'Everyone';

    // Màu và icon theo category
    let color = '#3b82f6'; // Mặc định blue
    let icon = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
    `;

    if (ann.target_type === 'department') {
        color = '#10b981'; // Green
        icon = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        `;
    } else if (ann.target_type === 'role') {
        color = '#f59e0b'; // Amber
        icon = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
        `;
    }

    const dateStr = new Date(ann.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="card" style="border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 10px 30px rgba(0,0,0,0.03); overflow: hidden; transition: transform 0.2s ease; ${isTrash ? 'opacity: 0.7;' : ''}">
            <div style="display: flex; gap: 20px; padding: 24px;">
                <div style="flex-shrink: 0; width: 56px; height: 56px; background: ${color}10; color: ${color}; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                    ${icon}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="font-size: 0.75rem; font-weight: 800; color: ${color}; text-transform: uppercase; letter-spacing: 0.05em; background: ${color}15; padding: 2px 8px; border-radius: 6px;">${typeLabel}</span>
                                <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">${dateStr}</span>
                            </div>
                            <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; color: #1e293b; margin: 0; font-size: 1.25rem;">${ann.title}</h2>
                        </div>
                        ${!isTrash ? `
                            <div style="display: flex; gap: 4px;">
                                ${roleLevel <= 2 ? `
                                    <button onclick="window.confirmDeleteAnnouncement(${ann.notification_id})" title="Delete forever" style="background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.color='#ef4444'; this.style.background='#fef2f2'" onmouseout="this.style.color='#cbd5e1'; this.style.background='none'">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                ` : ''}
                            </div>
                        ` : `
                            <div style="display: flex; gap: 8px;">
                                <button onclick="window.restoreAnnouncementFromTrash(${ann.notification_id})" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                                    Restore
                                </button>
                                <button onclick="window.confirmDeleteAnnouncement(${ann.notification_id})" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                                    Delete Forever
                                </button>
                            </div>
                        `}
                    </div>
                    <div style="color: #475569; line-height: 1.7; font-size: 1rem; white-space: pre-wrap; margin-bottom: 16px;">${ann.message}</div>
                    
                    <!-- Recipient Info -->
                    <div style="background: ${color}08; border-left: 3px solid ${color}; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span style="font-size: 0.85rem; color: #475569;">
                                Sent to: <strong style="color: ${color};">${targetDetail}</strong>
                            </span>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 10px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
                        <div style="width: 32px; height: 32px; background: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.75rem;">
                            ${ann.sender_name.charAt(0)}
                        </div>
                        <div>
                            <span style="font-size: 0.85rem; font-weight: 700; color: #1e293b; display: block;">${ann.sender_name}</span>
                            <span style="font-size: 0.75rem; color: #94a3b8;">HR Communications</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.openAddAnnouncementModal = function () {
    const appData = getState();
    const content = `
        <div style="display: grid; gap: 24px; font-family: 'Outfit', sans-serif; padding: 5px;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0;">
                <div class="filter-group" style="margin-bottom: 20px;">
                    <label class="filter-label" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        title
                    </label>
                    <input type="text" id="ann-title" class="pro-input" placeholder="e.g. Important Update on Office Policy" style="width: 100%;" required>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="filter-group">
                        <select id="ann-target-type" class="pro-input" onchange="window.handleAnnTargetChange()" style="width: 100%;">
                            <option value="all">Everyone</option>
                            <option value="department">Specific Department</option>
                            <option value="role">Specific Position Level</option>
                        </select>
                    </div>
                    <div id="ann-target-id-container" class="filter-group" style="display: none;">
                        <label class="filter-label" id="ann-target-label" style="margin-bottom: 8px;">Selection</label>
                        <select id="ann-target-id-select" class="pro-input" style="width: 100%;"></select>
                    </div>
                </div>
            </div>

            <div class="filter-group">
                <label class="filter-label" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                     Content
                </label>
                <textarea id="ann-message" class="pro-input" style="height: 180px; resize: none; width: 100%; line-height: 1.6; padding: 15px;" placeholder="Write your announcement content here..." required></textarea>
            </div>
        </div>
    `;

    createModal({
        title: "New Announcement",
        content: content,
        submitText: "Post Announcement",
        onSubmit: async () => {
            const payload = {
                title: document.getElementById('ann-title').value,
                message: document.getElementById('ann-message').value,
                target_type: document.getElementById('ann-target-type').value
            };

            if (payload.target_type !== 'all') {
                payload.target_id = parseInt(document.getElementById('ann-target-id-select').value);
            }

            if (!payload.title || !payload.message) {
                showToast("Please fill in all fields", "error");
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/announcements`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    showToast("Announcement published", "success");
                    await fetchAnnouncements();
                    if (window.updateNotificationUI) window.updateNotificationUI();
                    const contentArea = document.getElementById('content-area');
                    if (contentArea) contentArea.innerHTML = await renderAnnouncements();
                } else {
                    const err = await response.json();
                    showToast("Error: " + (err.detail || "Could not post"), "error");
                }
            } catch (e) {
                showToast("Connection error", "error");
            }
        }
    });
};

window.handleAnnTargetChange = function () {
    const appData = getState();
    const type = document.getElementById('ann-target-type').value;
    const idContainer = document.getElementById('ann-target-id-container');
    const idSelect = document.getElementById('ann-target-id-select');
    const label = document.getElementById('ann-target-label');

    if (type === 'all') {
        idContainer.style.display = 'none';
    } else {
        idContainer.style.display = 'block';
        idSelect.innerHTML = '';
        if (type === 'department') {
            label.textContent = 'Select Department';
            (appData.departments_raw || []).forEach(d => {
                idSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });
        } else if (type === 'role') {
            label.textContent = 'Select Position';
            (appData.roles_raw || []).forEach(r => {
                idSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
            });
        }
    }
};

window.confirmDeleteAnnouncement = function (id) {
    createModal({
        title: "Delete Announcement",
        content: `
            <div style="text-align: center; padding: 20px;">
                <div style="color: #ef4444; margin-bottom: 16px;">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </div>
                <h3 style="font-family: 'Outfit', sans-serif; color: #1e293b; margin-bottom: 8px;">Are you sure?</h3>
            </div>
        `,
        submitText: "Yes, Delete It",
        cancelText: "Keep It",
        onSubmit: async () => {
            try {
                await deleteAnnouncement(id);
                showToast("Announcement deleted", "success");
                await fetchAnnouncements();
                const contentArea = document.getElementById('content-area');
                if (contentArea) contentArea.innerHTML = await renderAnnouncements();
            } catch (e) {
                showToast(e.message, "error");
            }
        }
    });
};

// Hàm chuyển tab
window.switchAnnouncementTab = async function (tab) {
    currentTab = tab;
    const contentArea = document.getElementById('announcements-tab-content');
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const appData = getState();

    if (tab === 'active') {
        const announcements = appData.announcements || [];
        contentArea.innerHTML = renderActiveTab(announcements, roleLevel);
    } else if (tab === 'trash') {
        contentArea.innerHTML = '<div class="loading" style="text-align: center; padding: 40px; color: #94a3b8;">Loading trash...</div>';

        try {
            const trashData = await fetchTrashAnnouncements();
            if (trashData.length === 0) {
                contentArea.innerHTML = `
                    <div style="text-align: center; padding: 80px 40px; background: white; border-radius: 24px; border: 2px dashed #e2e8f0;">
                        <div style="width: 80px; height: 80px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </div>
                        <h3 style="font-family: 'Outfit', sans-serif; color: #1e293b; margin-bottom: 8px; font-weight: 700;">Trash is Empty</h3>
                        <p style="color: #94a3b8; font-size: 0.9rem;">Dismissed announcements will appear here.</p>
                    </div>
                `;
            } else {
                contentArea.innerHTML = trashData.map(ann => renderAnnouncementCard(ann, roleLevel, true)).join('');
            }
        } catch (e) {
            showToast('Failed to load trash: ' + e.message, 'error');
            contentArea.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load trash</div>';
        }
    }

    // Cập nhật style các nút tab
    document.getElementById('tab-active').style.background = currentTab === 'active' ? '#6366f1' : 'transparent';
    document.getElementById('tab-active').style.color = currentTab === 'active' ? 'white' : '#64748b';
    document.getElementById('tab-active').style.borderBottom = currentTab === 'active' ? '2px solid #6366f1' : 'none';

    const trashTab = document.getElementById('tab-trash');
    if (trashTab) {
        trashTab.style.background = currentTab === 'trash' ? '#6366f1' : 'transparent';
        trashTab.style.color = currentTab === 'trash' ? 'white' : '#64748b';
        trashTab.style.borderBottom = currentTab === 'trash' ? '2px solid #6366f1' : 'none';
    }
};

// Khôi phục thông báo từ trash
window.restoreAnnouncementFromTrash = async function (id) {
    try {
        await restoreAnnouncement(id);
        showToast('Announcement restored', 'success');
        await fetchAnnouncements(); // Làm mới active announcements
        if (window.updateNotificationUI) window.updateNotificationUI(); // Cập nhật bell
        await window.switchAnnouncementTab('trash'); // Làm mới trash view
    } catch (e) {
        showToast(e.message, 'error');
    }
};

// Dọn dẹp notification từ bell (chỉ localStorage - tạm thời backward compat)
window.localDismissAnnouncement = function (id) {
    // Không còn dùng nữa vì dismiss được xử lý qua bell dropdown
    // Nhưng giữ lại để tương thích ngược
    showToast('Please use the bell icon to dismiss notifications', 'info');
};

