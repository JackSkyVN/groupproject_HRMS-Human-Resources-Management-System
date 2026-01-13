/**
 * Modal My Profile Đã Được Cải Tiến - DESIGN MATCH v3
 * Khớp với hình tham khảo: Dark Slate Header, Pill Tabs, "Cancel/Close" Footer.
 */

let enrollStream = null;
let isEnrolling = false;

window.openMyProfileModal = async function (initialTab = 'information') {
    const { getState } = await import('../core/state.js');
    const { fetchProfile } = await import('../core/api.js');
    const { createModal } = await import('../utils/modal.js');

    // QUAN TRỌNG: Đóng BẤT KỲ modal overlays hiện tại để tránh vấn đề double-modal
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

    // Đảm bảo profile cập nhật
    await fetchProfile();
    const appData = getState();
    const user = appData.currentUser || {};

    // Ánh xạ URL cho Deep Links (Dùng Information số ít)
    const urlMap = {
        'information': '/finova/profiles/informations',
        'change-password': '/finova/profiles/change-password',
        'face-id': '/finova/profiles/face-id'
    };

    // Chuẩn hóa initial tab
    let currentTab = initialTab === 'informations' ? 'information' : (initialTab || 'information');

    // Đồng bộ URL ban đầu
    const prefix = window.getRolePrefix ? window.getRolePrefix() : '';
    const basePath = window.location.pathname.startsWith('/finova') ? '/finova' : '';
    const initialTargetPath = (currentTab === 'face-id' ? 'myprofile/registration' : (currentTab === 'change-password' ? 'myprofile/password-change' : 'myprofile/information'));
    const initialUrl = `${basePath}/${prefix}${initialTargetPath}`.replace(/\/+/g, '/');
    window.history.pushState({}, '', initialUrl);

    const content = `
        <div id="profile-modal-container" style="font-family: inherit;">
            <style>
                .profile-pill-tab.active { background: white !important; color: #1e293b !important; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
                .profile-tab-content-area { animation: profileFadeIn 0.3s ease-out; }
                @keyframes profileFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
                .info-field { display: flex; flex-direction: column; gap: 4px; }
                .info-field label { font-size: 13px; font-weight: 600; color: #64748b; }
                .info-field input { padding: 8px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #fff; color: #1e293b; transition: border-color 0.2s; }
                .info-field input[readonly] { background: #f8fafc; color: #94a3b8; border-color: #f1f5f9; cursor: not-allowed; }
            </style>

            <!-- Header Tối Bo Tròn -->
            <div style="background: #1e293b; padding: 32px 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
                <div style="width: 80px; height: 80px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: white; font-weight: 700; font-size: 2rem;">
                    ${(user.full_name || 'U').charAt(0)}
                </div>
                <h2 style="color: white; margin: 0 0 4px 0; font-weight: 700; font-size: 1.4rem;">${user.full_name || 'System Admin'}</h2>
                <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">${user.position_name || 'N/A'} • ${user.department_name || 'N/A'}</p>
            </div>
            
            <!-- Thanh Tab -->
            <div style="background: #f1f5f9; padding: 5px; border-radius: 10px; display: flex; gap: 4px; margin-bottom: 24px;">
                <button id="tab-information" class="profile-pill-tab active" onclick="window.switchProfileTab('information')" style="flex: 1; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; color: #64748b; background: transparent;">Information</button>
                <button id="tab-change-password" class="profile-pill-tab" onclick="window.switchProfileTab('change-password')" style="flex: 1; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; color: #64748b; background: transparent;">Password</button>
                <button id="tab-face-id" class="profile-pill-tab" onclick="window.switchProfileTab('face-id')" style="flex: 1; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; color: #64748b; background: transparent;">Regris ID face</button>
            </div>
            
            <!-- Tab Thông Tin -->
            <div id="content-information" class="profile-tab-content-area info-grid">
                <div class="info-field">
                    <label>Employee ID</label>
                    <input type="text" value="${user.employee_id || 'N/A'}" readonly>
                </div>
                <div class="info-field">
                    <label>Username</label>
                    <input type="text" value="${user.username || ''}" readonly>
                </div>
                <div class="info-field">
                    <label>Full Name</label>
                    <input type="text" id="profile-fullname" value="${user.full_name || ''}">
                </div>
                <div class="info-field">
                    <label>Date of Birth</label>
                    <input type="date" id="profile-dob" value="${user.date_of_birth || ''}">
                </div>
                <div class="info-field" style="grid-column: span 2;">
                    <label>Email</label>
                    <input type="email" id="profile-email" value="${user.email || ''}">
                </div>
                <div class="info-field">
                    <label>Department</label>
                    <input type="text" value="${user.department_name || 'N/A'}" readonly>
                </div>
                <div class="info-field">
                    <label>Position</label>
                    <input type="text" value="${user.position_name || 'N/A'}" readonly>
                </div>
                <div class="info-field">
                    <label>Joined Date</label>
                    <input type="text" value="${user.hire_date || 'N/A'}" readonly>
                </div>
                <div class="info-field">
                    <label>Salary</label>
                    <input type="text" value="${user.salary || 'N/A'}" readonly>
                </div>
                <div style="grid-column: span 2; margin-top: 12px;">
                    <button onclick="window.saveProfileInfo()" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px; font-weight: 700;">Save Changes</button>
                </div>
            </div>
            
            <!-- Tab Mật Khẩu -->
            <div id="content-change-password" class="profile-tab-content-area" style="display: none; flex-direction: column; gap: 16px;">
                <div class="form-group">
                    <label class="form-label">Current Password</label>
                    <input type="password" id="password-current" class="form-input" placeholder="••••••••">
                </div>
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" id="password-new" class="form-input" placeholder="Enter new password" oninput="window.validateNewPassword()">
                    <div id="password-strength-container" style="margin-top: 8px;"></div>
                    <div id="password-requirements-container" style="margin-top: 8px;"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm New Password</label>
                    <input type="password" id="password-confirm" class="form-input" placeholder="Confirm new password" oninput="window.validateConfirmPassword()">
                    <div id="password-match-message" style="font-size: 0.75rem; margin-top: 4px;"></div>
                </div>
                <button onclick="window.saveNewPassword()" class="btn btn-primary" style="justify-content: center; padding: 12px; font-weight: 700;">Update Password</button>
            </div>
            
            <!-- Tab Face ID -->
            <div id="content-face-id" class="profile-tab-content-area" style="display: none; flex-direction: column; align-items: center; gap: 20px;">
                <div style="width: 100%; aspect-ratio: 4/3; background: #0f172a; border-radius: 12px; position: relative; overflow: hidden; border: 1px solid #334155;">
                    <video id="enroll-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
                    <canvas id="enroll-canvas" style="display: none;"></canvas>
                    <div id="enroll-overlay" style="position: absolute; inset: 0; border: 2px dashed rgba(59, 130, 246, 0.4); border-radius: 50%; width: 60%; height: 80%; margin: auto; pointer-events: none;"></div>
                    <div id="enroll-status" style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center;">
                        <span id="enroll-status-text" style="background: rgba(0,0,0,0.7); color: white; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem;">Click "Start Registration"</span>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; width: 100%;">
                    <button id="btn-start-enroll" onclick="window.startFaceEnroll()" class="btn btn-primary" style="flex: 1; justify-content: center;">Start Registration</button>
                    <button id="btn-stop-enroll" onclick="window.stopFaceEnroll()" class="btn btn-secondary" style="display: none; flex: 1; justify-content: center;">Cancel</button>
                </div>
                <div id="enroll-progress" style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; display: none;">
                    <div id="enroll-progress-bar" style="width: 0%; height: 100%; background: #3b82f6; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
            </div>
        </div>
    `;

    createModal({
        title: "My Profile",
        content: content,
        submitText: "Close",
        cancelText: "Cancel",
        onSubmit: () => { window.stopFaceEnroll(); }
    });

    // Khởi tạo tab ban đầu
    window.switchProfileTab(currentTab);
};

window.switchProfileTab = function (tab) {
    // Đồng bộ Tab - Dùng helpers tập trung
    const prefix = window.getRolePrefix ? window.getRolePrefix() : '';
    const basePath = window.location.pathname.startsWith('/finova') ? '/finova' : '';

    const tabUrls = {
        'information': 'myprofile/information',
        'change-password': 'myprofile/password-change',
        'face-id': 'myprofile/registration'
    };

    const targetPath = tabUrls[tab] || 'myprofile/information';
    const newUrl = `${basePath}/${prefix}${targetPath}`.replace(/\/+/g, '/');
    window.history.pushState({}, '', newUrl);

    document.querySelectorAll('.profile-pill-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.profile-tab-content-area').forEach(c => c.style.display = 'none');

    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) activeTab.classList.add('active');

    const activeContent = document.getElementById(`content-${tab}`);
    if (activeContent) {
        if (tab === 'information') activeContent.style.display = 'grid';
        else activeContent.style.display = 'flex';
    }

    if (tab !== 'face-id') window.stopFaceEnroll();
};

window.saveProfileInfo = async function () {
    const { updateMyProfile, fetchProfile } = await import('../core/api.js');
    const { showToast } = await import('../utils/toast.js');

    const fullName = document.getElementById('profile-fullname').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const dob = document.getElementById('profile-dob').value;

    if (!fullName || !email) {
        showToast('Name and Email required', 'error');
        return;
    }

    try {
        await updateMyProfile({ full_name: fullName, email: email, date_of_birth: dob });
        showToast('Profile updated', 'success');
        await fetchProfile();
        // Cập nhật thông tin cơ bản trong header modal
        const appData = (await import('../core/state.js')).getState();
        const headerName = document.querySelector('#profile-modal-container h2');
        if (headerName) headerName.textContent = appData.currentUser.full_name;
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.startFaceEnroll = async function () {
    const video = document.getElementById('enroll-video');
    const statusText = document.getElementById('enroll-status-text');
    const btnStart = document.getElementById('btn-start-enroll');
    const btnStop = document.getElementById('btn-stop-enroll');
    const progressBar = document.getElementById('enroll-progress');

    try {
        enrollStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (video) video.srcObject = enrollStream;
        isEnrolling = true;
        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.style.display = 'flex';
        if (progressBar) progressBar.style.display = 'block';
        if (statusText) statusText.textContent = "Processing...";
        setTimeout(() => processEnrollFrame('complete'), 1500);
    } catch (err) {
        import('../utils/toast.js').then(m => m.showToast("Camera Error: " + err.message, "error"));
    }
};

window.stopFaceEnroll = function () {
    isEnrolling = false;
    if (enrollStream) {
        enrollStream.getTracks().forEach(t => t.stop());
        enrollStream = null;
    }
    const btnStart = document.getElementById('btn-start-enroll');
    const btnStop = document.getElementById('btn-stop-enroll');
    const statusText = document.getElementById('enroll-status-text');
    if (btnStart) btnStart.style.display = 'flex';
    if (btnStop) btnStop.style.display = 'none';
    if (statusText) statusText.textContent = 'Click "Start Registration"';
};

async function processEnrollFrame(stepId) {
    if (!isEnrolling) return;
    const v = document.getElementById('enroll-video');
    const c = document.getElementById('enroll-canvas');
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const img = c.toDataURL('image/jpeg', 0.8);
    try {
        const { fetchAPI } = await import('../core/api.js');
        const res = await fetchAPI('/api/v1/face-attendance/enroll-step', { method: 'POST', body: JSON.stringify({ image_data: img, step_id: stepId }) });
        if (res.ok) {
            const statusText = document.getElementById('enroll-status-text');
            statusText.textContent = "SUCCESSFUL";
            statusText.style.background = "#10b981";
            import('../utils/toast.js').then(m => m.showToast("Face ID registered", "success"));
            setTimeout(() => window.stopFaceEnroll(), 2000);
        } else {
            document.getElementById('enroll-status-text').textContent = res.message || "Keep face centered";
            setTimeout(() => processEnrollFrame(stepId), 500);
        }
    } catch (err) { setTimeout(() => processEnrollFrame(stepId), 1000); }
}

window.validateNewPassword = async function () {
    const { validatePassword, renderStrengthIndicator, renderRequirements } = await import('../utils/password-validator.js');
    const pass = document.getElementById('password-new').value;
    const v = validatePassword(pass);
    document.getElementById('password-strength-container').innerHTML = renderStrengthIndicator(v.strength);
    document.getElementById('password-requirements-container').innerHTML = renderRequirements(v);
};

window.validateConfirmPassword = function () {
    const p1 = document.getElementById('password-new').value;
    const p2 = document.getElementById('password-confirm').value;
    const msg = document.getElementById('password-match-message');
    if (!p2) { msg.innerHTML = ''; return; }
    msg.innerHTML = p1 === p2 ? '<span style="color: #10b981;">✓ Passwords match</span>' : '<span style="color: #ef4444;">✗ Passwords do not match</span>';
};

window.saveNewPassword = async function () {
    const { changeMyPassword } = await import('../core/api.js');
    const { showToast } = await import('../utils/toast.js');
    const oldP = document.getElementById('password-current').value;
    const newP = document.getElementById('password-new').value;
    const confP = document.getElementById('password-confirm').value;
    if (!oldP || !newP || !confP) { showToast('Please fill all fields', 'error'); return; }
    if (newP !== confP) { showToast('Passwords do not match', 'error'); return; }
    try {
        await changeMyPassword(oldP, newP);
        showToast('Password updated', 'success');
        document.getElementById('password-current').value = ''; document.getElementById('password-new').value = ''; document.getElementById('password-confirm').value = '';
    } catch (err) { showToast(err.message, 'error'); }
};
