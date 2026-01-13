/**
 * Module Profile Page - Thiết kế Độ Trung Thực Cao
 * Khớp với screenshot user cung cấp: Bố cục Giữa, Chỉnh sửa Avatar, Icons, Grid Layout.
 */

import { getState } from '../core/state.js';
import { API_BASE_URL } from '../core/config.js';
import { showToast } from '../utils/toast.js';
import { showPromptDialog } from '../utils/dialogs.js';

console.log('[Module] Profile Page loaded - Version: FORCE_REFRESH_V2');

export async function renderProfilePage() {
    const appData = getState();
    const profile = appData.currentUser;

    if (!profile) {
        // Thử fetch nếu thiếu (race condition khi refresh)
        try {
            const { fetchProfile } = await import('../core/api.js');
            await fetchProfile();
            profile = getState().currentUser;
        } catch (e) {
            console.error("[Profile] Failed to fetch profile in render:", e);
        }
    }

    if (!profile) {
        return `
            <div style="padding: 100px 40px; text-align: center; background: #f8fafc; min-height: 100vh;">
                <div style="width: 80px; height: 80px; border: 4px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 24px;"></div>
                <h2 style="color: #1e293b; font-family: 'Inter', sans-serif;">Loading Profile...</h2>
                <p style="color: #64748b; margin-top: 12px;">If this takes too long, please check your connection.</p>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </div>
        `;
    }

    return `
        <div style="width: 100%; min-height: 100%; background: #f8fafc; padding: 48px 0; display: block; overflow-y: visible;">
            <div style="width: 100%; max-width: 1400px; padding: 0 32px; padding-bottom: 120px; font-family: 'Inter', sans-serif; margin: 0 auto;">
                <!-- Tiêu đề Trang (Căn trái) -->
                <div style="margin-bottom: 40px;">
                    <h1 style="font-size: 32px; font-weight: 700; color: #1e293b; margin: 0;">My Profile</h1>
                </div>

                <!-- Điều hướng Tab (GIỮA) -->
                <div style="display: flex; justify-content: center; gap: 40px; border-bottom: 1px solid #e2e8f0; margin-bottom: 40px;">
                    <button id="profile-tab-info" class="tab-btn active" onclick="window.switchProfileSubTab('information')" style="display: flex; align-items: center; gap: 8px; padding: 12px 0; background: none; border: none; border-bottom: 3px solid #3b82f6; color: #3b82f6; font-weight: 600; cursor: pointer; font-size: 16px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Information
                    </button>
                    <button id="profile-tab-password" class="tab-btn" onclick="window.switchProfileSubTab('password-change')" style="display: flex; align-items: center; gap: 8px; padding: 12px 0; background: none; border: none; border-bottom: 3px solid transparent; color: #64748b; font-weight: 500; cursor: pointer; font-size: 16px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Password
                    </button>
                    <button id="profile-tab-registration" class="tab-btn" onclick="window.switchProfileSubTab('registration')" style="display: flex; align-items: center; gap: 8px; padding: 12px 0; background: none; border: none; border-bottom: 3px solid transparent; color: #64748b; font-weight: 500; cursor: pointer; font-size: 16px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        Registration ID
                    </button>
                </div>

                <!-- Vùng Nội dung Profile -->
                <div id="profile-tab-content-container" style="background: white; border: 1px solid #f1f5f9; border-radius: 24px; box-shadow: 0 4px 30px rgba(0,0,0,0.03); padding: 48px; display: block;">
                    ${renderInformationTab(profile)}
                </div>
            </div>
        </div>

        <style>
            .tab-btn { transition: all 0.2s; }
            .tab-btn:hover { color: #3b82f6; }
            .form-label { display: block; margin-bottom: 10px; color: #64748b; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            .form-input-p { width: 100%; padding: 14px 16px; border: none; border-radius: 12px; background: #f8fafc; color: #1e293b; font-size: 15px; font-weight: 500; transition: all 0.2s; border: 1px solid transparent; }
            .form-input-p:focus { outline: none; border-color: #6366f1; background: #fff; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
            .form-input-p:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
            
            #avatar-container:hover #avatar-overlay { opacity: 1 !important; }
        </style>
    `;
}

function renderInformationTab(profile) {
    if (!profile) {
        return `<div style="padding: 40px; text-align: center;"><p style="color: #94a3b8;">Profile data not available. Please refresh the page.</p></div>`;
    }

    const initials = profile.full_name?.charAt(0) || 'U';
    const isAdmin = profile.roles?.includes('admin') || profile.position_name?.toLowerCase().includes('admin');
    const avatarUrl = profile.profile_picture ? `${profile.profile_picture}?t=${new Date().getTime()}` : null;

    const html = `
        <!-- Header Profile & Avatar (GIỮA) -->
        <div style="display: flex; justify-content: center; margin-bottom: 48px;">
            <div style="display: flex; align-items: center; gap: 24px;">
                <div id="avatar-container" style="position: relative; width: 120px; height: 120px; cursor: pointer; flex-shrink: 0;" onclick="document.getElementById('p-avatar-input').click()">
                    ${avatarUrl ?
            `<img src="${avatarUrl}" id="p-avatar-img" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">` :
            `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.25);">
                            ${initials}
                        </div>`
        }
                    <!-- Hover Overlay -->
                    <div id="avatar-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                    <input type="file" id="p-avatar-input" style="display: none;" accept="image/*" onchange="window.p_handleAvatarChange(event)">
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <h2 style="font-size: 32px; font-weight: 800; color: #1e293b; margin: 0;">${profile.full_name || 'N/A'}</h2>
                        ${isAdmin ? `<span style="background: #eef2ff; color: #6366f1; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em;">ADMIN</span>` : ''}
                    </div>
                    <p style="color: #64748b; font-size: 16px; font-weight: 500; margin: 0;">${profile.position_name || 'N/A'} • ${profile.department_name || 'N/A'}</p>
                </div>
            </div>
        </div>

        <form id="profile-info-form-p">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px 24px; margin-bottom: 40px;">
                <div>
                    <label class="form-label">Employee ID</label>
                    <input type="text" value="${profile.employee_id || ''}" disabled class="form-input-p">
                </div>
                <div>
                    <label class="form-label">Username</label>
                    <input type="text" value="${profile.username || ''}" disabled class="form-input-p">
                </div>
                <div>
                    <label class="form-label">Full Name</label>
                    <input type="text" id="p-fullname" value="${profile.full_name || ''}" class="form-input-p">
                </div>
                <div>
                    <label class="form-label">Date of Birth</label>
                    <input type="date" id="p-dob" value="${profile.date_of_birth || ''}" class="form-input-p">
                </div>
                <div>
                    <label class="form-label">Email Address</label>
                    <input type="email" id="p-email" value="${profile.email || ''}" class="form-input-p">
                </div>
                <div>
                    <label class="form-label">Phone Number</label>
                    <input type="text" id="p-phone" value="${profile.phone || ''}" class="form-input-p" placeholder="Enter phone number">
                </div>
                <div>
                    <label class="form-label">Department</label>
                    <input type="text" value="${profile.department_name || 'N/A'}" disabled class="form-input-p">
                </div>
                <div>
                    <label class="form-label">Position</label>
                    <input type="text" value="${profile.position_name || 'N/A'}" disabled class="form-input-p">
                </div>
                <div>
                    <label class="form-label">HIRE DATE</label>
                    <input type="text" value="${profile.hire_date || 'N/A'}" disabled class="form-input-p">
                </div>
                <div>
                    <label class="form-label">Salary</label>
                    <input type="text" value="${profile.salary || 'N/A'}" disabled class="form-input-p">
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 48px;">
                <button type="submit" style="padding: 16px 48px; background: #6366f1; color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                    💾 Update Information
                </button>
            </div>
        </form>
    `;

    return html;
}

function renderSecurityTab() {
    return `
        <div style="max-width: 600px; margin: 0 auto;">
            <form id="p-password-form">
                <div style="display: grid; gap: 24px;">
                    <div>
                        <label class="form-label">Current Password</label>
                        <input type="password" id="p-pass-current" required class="form-input-p" placeholder="••••••••">
                    </div>
                    <div>
                        <label class="form-label">New Password</label>
                        <input type="password" id="p-pass-new" required class="form-input-p" placeholder="Enter new password" oninput="window.p_validatePassword()">
                        <div id="p-pass-requirements" style="margin-top: 16px; padding: 20px; background: #f8fafc; border-radius: 16px; font-size: 13px; border: 1px solid #f1f5f9;">
                            <div style="margin-bottom: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Security Requirements:</div>
                            <div id="p-req-length" style="color: #ef4444; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; font-weight: 500;"><span>○</span> 8+ characters</div>
                            <div id="p-req-upper" style="color: #ef4444; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; font-weight: 500;"><span>○</span> One uppercase letter</div>
                            <div id="p-req-number" style="color: #ef4444; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; font-weight: 500;"><span>○</span> One number (0-9)</div>
                            <div id="p-req-special" style="color: #ef4444; display: flex; align-items: center; gap: 10px; font-weight: 500;"><span>○</span> One special character</div>
                        </div>
                    </div>
                    <div>
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="p-pass-confirm" required class="form-input-p" placeholder="Confirm new password">
                    </div>
                    <div style="padding-top: 12px;">
                        <button type="submit" id="p-pass-submit" disabled style="width: 100%; padding: 16px; background: #94a3b8; color: white; border: none; border-radius: 14px; font-weight: 700; cursor: not-allowed; transition: all 0.2s; font-size: 16px;">
                            Update Password
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
}

function renderRegistrationTab() {
    return `
        <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px;">
            
            <div style="display: flex; gap: 40px; width: 100%; align-items: flex-start;">
                <div style="flex: 1;">
                    <div id="p-camera-container" style="width: 100%; aspect-ratio: 4/3; background: #0f172a; border-radius: 24px; position: relative; overflow: hidden; border: 8px solid #f8fafc; box-shadow: 0 10px 40px rgba(0,0,0,0.05);">
                        <video id="p-enroll-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
                        <canvas id="p-enroll-canvas" style="display: none;"></canvas>
                        
                        <!-- Khung Hướng dẫn Đăng ký -->
                        <div id="p-enroll-guide" style="position: absolute; inset: 0; border: 2px dashed rgba(255,255,255,0.3); border-radius: 50%; width: 60%; height: 80%; margin: auto; pointer-events: none; transition: all 0.3s; display: none;"></div>
                        
                        <!-- Overlay/Nút Start -->
                        <div id="p-enroll-overlay" style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                            <div style="width: 64px; height: 64px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </div>
                            <div id="p-face-status-info" style="margin-bottom: 20px;"></div>
                            <button id="p-start-enroll-btn" onclick="window.p_startEnroll()" class="btn btn-primary" style="padding: 16px 40px; border-radius: 14px; font-weight: 700; font-size: 16px;">Start</button>
                            <button id="p-request-reset-btn" onclick="window.p_requestFaceReset()" class="btn btn-secondary" style="padding: 12px 32px; border-radius: 14px; font-weight: 600; font-size: 14px; margin-top: 12px; display: none;">Request Face ID Reset</button>
                        </div>

                        <!-- Trạng thái Thời gian thực -->
                        <div id="p-enroll-status" style="position: absolute; bottom: 30px; left: 0; right: 0; text-align: center; display: none; z-index: 10;">
                            <span id="p-enroll-text" style="background: rgba(0,0,0,0.85); color: white; padding: 10px 24px; border-radius: 40px; font-size: 14px; font-weight: 700; backdrop-filter: blur(4px); box-shadow: 0 4px 20px rgba(0,0,0,0.2);">Initializing...</span>
                        </div>

                        <!-- Thanh Tiến độ (30s) -->
                        <div id="p-enroll-progress-container" style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: rgba(255,255,255,0.1); display: none;">
                            <div id="p-enroll-progress-bar" style="width: 0%; height: 100%; background: #3b82f6; transition: width 0.1s linear;"></div>
                        </div>
                    </div>
                </div>

                <!-- Hướng dẫn & Các Giai đoạn -->
                <div style="width: 320px; display: flex; flex-direction: column; gap: 20px;">
                    <div style="padding: 24px; background: #f8fafc; border-radius: 20px; border: 1px solid #f1f5f9;">
                        <h4 style="font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.1em;">Current Stage</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;" id="p-enroll-stages">
                            <div id="stage-neutral" style="display: flex; align-items: center; gap: 12px; font-weight: 600; color: #64748b; padding: 10px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0;">
                                <div class="stage-icon" style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #cbd5e1;"></div>
                                <span>Look Straight</span>
                            </div>
                            <div id="stage-left" style="display: flex; align-items: center; gap: 12px; font-weight: 600; color: #64748b; padding: 10px; border-radius: 12px; opacity: 0.5;">
                                <div class="stage-icon" style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #cbd5e1;"></div>
                                <span>Turn Head Left</span>
                            </div>
                            <div id="stage-right" style="display: flex; align-items: center; gap: 12px; font-weight: 600; color: #64748b; padding: 10px; border-radius: 12px; opacity: 0.5;">
                                <div class="stage-icon" style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #cbd5e1;"></div>
                                <span>Turn Head Right</span>
                            </div>
                            <div id="stage-complete" style="display: flex; align-items: center; gap: 12px; font-weight: 600; color: #64748b; padding: 10px; border-radius: 12px; opacity: 0.5;">
                                <div class="stage-icon" style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #cbd5e1;"></div>
                                <span>Look Straight to Finish</span>
                            </div>
                        </div>
                    </div>

                    <div style="padding: 24px; background: #f0f9ff; border-radius: 20px; border: 1px solid #e0f2fe;">
                        <p id="p-ai-tip" style="margin: 0; color: #0c4a6e; font-size: 13px; line-height: 1.5; font-weight: 500;"></p>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .stage-active { background: #eff6ff !important; border-color: #3b82f6 !important; color: #3b82f6 !important; opacity: 1 !important; transform: translateX(5px); transition: all 0.3s; }
            .stage-done { color: #10b981 !important; }
            .stage-done .stage-icon { background: #10b981 !important; border-color: #10b981 !important; }
            .stage-icon::after { content: '✓'; color: white; display: none; justify-content: center; align-items: center; font-size: 12px; }
            .stage-done .stage-icon::after { display: flex; }
        </style>
    `;
}

// Xử lý Global
window.p_handleAvatarChange = async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        return showToast('Please select an image file', 'error');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            showToast('Avatar updated', 'success');

            // Cập nhật UI
            const avatarImg = document.getElementById('p-avatar-img');
            const avatarContainer = document.getElementById('avatar-container');
            if (avatarImg) {
                avatarImg.src = `${data.profile_picture}?t=${new Date().getTime()}`;
            } else {
                // Chuyển từ chữ cái đầu sang img
                avatarContainer.innerHTML = `
                    <img src="${data.profile_picture}?t=${new Date().getTime()}" id="p-avatar-img" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <div id="avatar-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                `;
            }
            // Cập nhật global state
            const { fetchProfile } = await import('../core/api.js');
            await fetchProfile();
        } else {
            const err = await response.json();
            showToast(err.detail || 'Upload failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.switchProfileSubTab = function (tab) {
    const container = document.getElementById('profile-tab-content-container');
    if (!container) return; // Thoát nếu gọi trước khi DOM sẵn sàng
    const btns = document.querySelectorAll('.tab-btn');
    const appData = getState();

    // Cập nhật styling tab active
    btns.forEach(btn => {
        btn.style.borderBottomColor = 'transparent';
        btn.style.color = '#64748b';
        btn.style.fontWeight = '500';
    });

    const activeBtnId = tab === 'password-change' ? 'profile-tab-password' : (tab === 'registration' ? 'profile-tab-registration' : 'profile-tab-info');
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.style.borderBottomColor = '#3b82f6';
        activeBtn.style.color = '#3b82f6';
        activeBtn.style.fontWeight = '600';
    }

    // Cập nhật Nội dung
    if (tab === 'information') {
        container.innerHTML = renderInformationTab(appData.currentUser);
        setupInfoForm();
    } else if (tab === 'password-change') {
        container.innerHTML = renderSecurityTab();
        setupSecurityForm();
    } else if (tab === 'registration') {
        container.innerHTML = renderRegistrationTab();
        updateFaceIDStatus(); // Kiểm tra và cập nhật trạng thái Face ID
    }

    // Cập nhật URL - Dùng helpers tập trung để giữ prefix dựa trên role và base path
    const prefix = window.getRolePrefix ? window.getRolePrefix() : '';
    const basePath = window.location.pathname.startsWith('/finova') ? '/finova' : '';

    const newUrl = `${basePath}/${prefix}myprofile/${tab}`.replace(/\/+/g, '/');
    window.history.pushState({}, '', newUrl);
};

function setupInfoForm() {
    const form = document.getElementById('profile-info-form-p');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('p-fullname').value.trim();
        const email = document.getElementById('p-email').value.trim();
        const dob = document.getElementById('p-dob').value;
        const phone = document.getElementById('p-phone').value.trim();

        if (!fullName || !email) return showToast('Fill all fields', 'error');

        try {
            const { updateMyProfile, fetchProfile } = await import('../core/api.js');
            await updateMyProfile({ full_name: fullName, email, date_of_birth: dob, phone: phone });
            showToast('Profile updated', 'success');
            await fetchProfile();

            // RE-RENDER: Làm mới view ngay lập tức để hiện dữ liệu mới không cần F5
            window.switchProfileSubTab('information');
        } catch (err) { showToast(err.message, 'error'); }
    });
}

function setupSecurityForm() {
    const form = document.getElementById('p-password-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldP = document.getElementById('p-pass-current').value;
        const newP = document.getElementById('p-pass-new').value;
        const confP = document.getElementById('p-pass-confirm').value;

        if (newP !== confP) return showToast('Passwords mismatch', 'error');

        try {
            const { changeMyPassword } = await import('../core/api.js');
            await changeMyPassword(oldP, newP);
            showToast('Password changed', 'success');
            form.reset();
        } catch (err) { showToast(err.message, 'error'); }
    });
}

let p_stream = null;
let p_enrollment_active = false;
let p_enroll_stage = 'neutral';
let p_enroll_progress = 0;
let p_enroll_timer = null;

window.p_startEnroll = async function () {
    const overlay = document.getElementById('p-enroll-overlay');
    const status = document.getElementById('p-enroll-status');
    const video = document.getElementById('p-enroll-video');
    const guide = document.getElementById('p-enroll-guide');
    const progress = document.getElementById('p-enroll-progress-container');

    try {
        p_stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 }
        });
        video.srcObject = p_stream;
        overlay.style.display = 'none';
        status.style.display = 'block';
        guide.style.display = 'block';
        progress.style.display = 'block';

        p_enrollment_active = true;
        p_enroll_progress = 0;
        p_enroll_stage = 'neutral';
        updateStageUI();

        // Bắt đầu timer đăng ký 30s
        p_enroll_timer = setInterval(() => {
            p_enroll_progress += (10 / 30); // 10% mỗi ~3s cho tổng 30s
            if (p_enroll_progress > 100) p_enroll_progress = 100;

            const bar = document.getElementById('p-enroll-progress-bar');
            if (bar) bar.style.width = `${p_enroll_progress}%`;

            // Logic để chuyển giai đoạn tự động
            if (p_enroll_progress > 33 && p_enroll_progress < 66 && p_enroll_stage === 'neutral') {
                p_enroll_stage = 'left';
                updateStageUI();
            } else if (p_enroll_progress > 66 && p_enroll_progress < 98 && p_enroll_stage === 'left') {
                p_enroll_stage = 'right';
                updateStageUI();
            } else if (p_enroll_progress >= 100 && p_enroll_stage !== 'complete') {
                p_enroll_stage = 'complete';
                updateStageUI(); // QUAN TRỌNG: Cập nhật UI để user biết phải đối diện về phía trước!
            }
        }, 100);

        setTimeout(() => p_captureFrame(), 1000);
    } catch (err) { showToast("Camera Access Denied", "error"); }
};

function updateStageUI() {
    const stages = ['neutral', 'left', 'right', 'complete'];
    stages.forEach(s => {
        const el = document.getElementById(`stage-${s}`);
        if (!el) return;
        el.className = s === p_enroll_stage ? 'stage-active' : '';
        // Nếu đã qua giai đoạn, đánh dấu là done
        const currentIdx = stages.indexOf(p_enroll_stage);
        const stageIdx = stages.indexOf(s);
        if (stageIdx < currentIdx && currentIdx !== -1) el.classList.add('stage-done');
    });

    const tip = document.getElementById('p-ai-tip');
    if (p_enroll_stage === 'neutral') tip.textContent = "Please look directly at the camera and keep a neutral expression.";
    else if (p_enroll_stage === 'left') tip.textContent = "Slowly turn your head to the LEFT while keeping the camera in view.";
    else if (p_enroll_stage === 'right') tip.textContent = "Great! Now slowly turn your head to the RIGHT.";
    else if (p_enroll_stage === 'complete') tip.textContent = "Almost done! Please face forward for final template registration.";
}

async function p_captureFrame() {
    if (!p_enrollment_active || !p_stream) return;

    const v = document.getElementById('p-enroll-video');
    const c = document.getElementById('p-enroll-canvas');
    if (!v || !c) return;

    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const img = c.toDataURL('image/jpeg', 0.82);

    try {
        const { fetchAPI } = await import('../core/api.js');
        const currentStep = p_enroll_stage === 'complete' ? 'complete' : p_enroll_stage;

        const res = await fetchAPI('/api/v1/face-attendance/enroll-step', {
            method: 'POST',
            body: JSON.stringify({ image_data: img, step_id: currentStep })
        });

        if (res.ok) {
            document.getElementById('p-enroll-text').textContent = res.message || "Face Captured";

            if (currentStep === 'complete') {
                finalizeEnrollment();
                return;
            }
        } else {
            document.getElementById('p-enroll-text').textContent = res.message || "Center your face...";
        }

        // Vòng lặp capture
        setTimeout(() => p_captureFrame(), 600);
    } catch (err) {
        console.error(err);
        setTimeout(() => p_captureFrame(), 1000);
    }
}

function finalizeEnrollment() {
    p_enrollment_active = false;
    if (p_enroll_timer) clearInterval(p_enroll_timer);

    const bar = document.getElementById('p-enroll-progress-bar');
    if (bar) {
        bar.style.width = '100%';
        bar.style.background = '#10b981';
    }

    document.getElementById('stage-right').classList.add('stage-done');
    document.getElementById('p-enroll-text').textContent = "Registration Successful";
    document.getElementById('p-ai-tip').textContent = "Biometric identity secured. Redirecting to dashboard...";

    showToast("Face biometrics registered", "success");

    // Stop camera immediately
    if (p_stream) {
        p_stream.getTracks().forEach(t => t.stop());
        p_stream = null;
    }

    // Clear video display
    const video = document.getElementById('p-enroll-video');
    if (video) {
        video.srcObject = null;
    }

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
        window.switchPage('dashboard');
    }, 2000);
}

window.p_validatePassword = function () {
    const pass = document.getElementById('p-pass-new').value;
    const submit = document.getElementById('p-pass-submit');
    const hasLength = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*]/.test(pass);

    const update = (id, valid) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.color = valid ? '#10b981' : '#ef4444'; // Green if valid, RED if invalid
        el.querySelector('span').textContent = valid ? '✓' : '○';
    };

    update('p-req-length', hasLength);
    update('p-req-upper', hasUpper);
    update('p-req-number', hasNumber);
    update('p-req-special', hasSpecial);

    if (hasLength && hasUpper && hasNumber && hasSpecial) {
        submit.disabled = false;
        submit.style.background = '#6366f1';
        submit.style.cursor = 'pointer';
    } else {
        submit.disabled = true;
        submit.style.background = '#94a3b8';
        submit.style.cursor = 'not-allowed';
    }
};

export function setupProfilePageHandlers() {
    setupInfoForm();
    const path = window.location.pathname;

    // Chỉ chuyển nếu KHÔNG ở tab information (tab được render mặc định)
    if (path.includes('/password-change')) {
        window.switchProfileSubTab('password-change');
    } else if (path.includes('/registration')) {
        window.switchProfileSubTab('registration');
    }
}

window.p_stopEnroll = function () {
    p_enrollment_active = false;
    if (p_enroll_timer) clearInterval(p_enroll_timer);
    if (p_stream) {
        p_stream.getTracks().forEach(t => t.stop());
        p_stream = null;
    }
};

// ==================== TRẠNG THÁI FACE ID & YÊU CẦU RESET ====================

async function updateFaceIDStatus() {
    const appData = getState();
    const user = appData.currentUser;
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');

    const statusInfo = document.getElementById('p-face-status-info');
    const startBtn = document.getElementById('p-start-enroll-btn');
    const requestBtn = document.getElementById('p-request-reset-btn');

    if (!statusInfo || !startBtn || !requestBtn) return;

    // Admin/HR Manager (Level 1-2) có thể đăng ký nhiều lần
    if (roleLevel <= 2) {
        if (user.face_registered_at) {
            const regDate = new Date(user.face_registered_at).toLocaleDateString();
            statusInfo.innerHTML = `
                <div style="text-align: center; color: white; margin-bottom: 16px;">
                    <div style="font-size: 14px; font-weight: 600; color: #10b981; margin-bottom: 8px;">✓ Face ID Registered</div>
                    <div style="font-size: 12px; color: #cbd5e1;">Registered on ${regDate}</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">You can re-register anytime</div>
                </div>
            `;
        } else {
            statusInfo.innerHTML = '';
        }
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
        startBtn.textContent = user.face_registered_at ? 'Re-register' : 'Start';
        requestBtn.style.display = 'none';
        return;
    }

    // Staff (Level 3-4): Bị khóa sau lần đăng ký đầu
    if (user.face_registered_at && !user.face_reset_allowed) {
        // Kiểm tra xem có đơn đang chờ duyệt không
        try {
            const { fetchAPI } = await import('../core/api.js');
            const res = await fetchAPI('/api/v1/face-attendance/face-reset-request/me');

            if (res.has_request && res.status === 'pending') {
                statusInfo.innerHTML = `
                    <div style="text-align: center; color: white; margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 600; color: #f59e0b; margin-bottom: 8px;">Request Pending</div>
                        <div style="font-size: 12px; color: #cbd5e1;">Waiting for Admin/HR approval</div>
                    </div>
                `;
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.textContent = 'Locked';
                requestBtn.style.display = 'none';
                return;
            }
        } catch (e) {
            console.error("Error checking reset status:", e);
        }

        // Face ID bị khóa (mặc định)
        const regDate = new Date(user.face_registered_at).toLocaleDateString();
        statusInfo.innerHTML = `
            <div style="text-align: center; color: white; margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 600; color: #10b981; margin-bottom: 8px;">✓ Face ID Registered</div>
                <div style="font-size: 12px; color: #cbd5e1;">Registered on ${regDate}</div>
                <div style="font-size: 11px; color: #ef4444; margin-top: 4px;">🔒 Re-registration requires approval</div>
            </div>
        `;
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        startBtn.style.cursor = 'not-allowed';
        startBtn.textContent = 'Locked';
        requestBtn.style.display = 'block';
    } else if (user.face_registered_at && user.face_reset_allowed) {
        // Được duyệt cho re-registration
        statusInfo.innerHTML = `
            <div style="text-align: center; color: white; margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 600; color: #f59e0b; margin-bottom: 8px;">Re-registration Approved</div>
                <div style="font-size: 12px; color: #cbd5e1;">You can now register your face again</div>
            </div>
        `;
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
        startBtn.textContent = 'Start';
        requestBtn.style.display = 'none';
    } else {
        // Chưa đăng ký
        statusInfo.innerHTML = '';
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
        startBtn.textContent = 'Start';
        requestBtn.style.display = 'none';
    }
}

window.p_requestFaceReset = async function () {
    showPromptDialog("Please provide a reason for Face ID reset request:\\n(e.g., 'Face changed after surgery', 'AI not recognizing me')", "", async (reason) => {
        if (!reason || reason.trim() === '') {
            showToast('Reason is required', 'error');
            return;
        }

        try {
            const { fetchAPI } = await import('../core/api.js');
            const { showToast } = await import('../utils/toast.js');

            const res = await fetchAPI('/api/v1/face-attendance/face-reset-request', {
                method: 'POST',
                body: JSON.stringify({ reason: reason.trim() })
            });

            if (res.ok) {
                showToast('Request submitted for review', 'success');

                // Cập nhật UI để hiện trạng thái pending
                const statusInfo = document.getElementById('p-face-status-info');
                const requestBtn = document.getElementById('p-request-reset-btn');
                if (statusInfo) {
                    statusInfo.innerHTML = `
                    <div style="text-align: center; color: white; margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 600; color: #f59e0b; margin-bottom: 8px;">Request Pending</div>
                        <div style="font-size: 12px; color: #cbd5e1;">Waiting for Admin/HR approval</div>
                    </div>
                `;
                }
                if (requestBtn) {
                    requestBtn.disabled = true;
                    requestBtn.style.opacity = '0.5';
                    requestBtn.textContent = 'Request Pending...';
                }
            } else {
                showToast(res.message || 'Failed to submit request', 'error');
            }
        } catch (err) {
            console.error(err);
            const { showToast } = await import('../utils/toast.js');
            showToast('Error submitting request', 'error');
        }
    });
};

// Lock Registration ID tab for Level 3-4 after face registration
function lockRegistrationTabIfNeeded() {
    const appData = getState();
    const user = appData.currentUser;
    const roleLevel = parseInt(localStorage.getItem('role_level') || '4');
    const regTab = document.getElementById('profile-tab-registration');

    if (!regTab || !user) return;

    // Level 3-4: Lock tab if face registered
    if (roleLevel >= 3 && user.face_registered_at) {
        regTab.disabled = true;
        regTab.style.opacity = '0.5';
        regTab.style.cursor = 'not-allowed';
        regTab.style.pointerEvents = 'none';
        regTab.onclick = null;
        regTab.title = 'Face ID already registered. Contact Admin/HR to reset.';
    }
    // Level 1-2: Always enabled
    else {
        regTab.disabled = false;
        regTab.style.opacity = '1';
        regTab.style.cursor = 'pointer';
        regTab.style.pointerEvents = 'auto';
        regTab.title = '';
    }
}

// Call after render
setTimeout(lockRegistrationTabIfNeeded, 100);
