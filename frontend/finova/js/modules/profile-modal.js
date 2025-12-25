/**
 * Open My Profile Modal with tabs for Profile Info and Change Password
 * Located at end of navigation.js file
 */

window.openMyProfileModal = async function () {
    const { getState } = await import('../core/state.js');
    const { updateMyProfile, changeMyPassword, fetchDashboardData } = await import('../core/api.js');
    const { createModal } = await import('../utils/modal.js');
    const { showToast } = await import('../utils/toast.js');
    const { validatePassword, renderStrengthIndicator, renderRequirements } = await import('../utils/password-validator.js');

    const appData = getState();
    const user = appData.currentUser || {};
    const employee_id = localStorage.getItem('employee_id') || 'N/A';
    const role_name = localStorage.getItem('role_name') || 'N/A';

    const content = `
        <div id="profile-modal-container">
            <!-- Header -->
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin-bottom: 24px;">
                <div style="width: 80px; height: 80px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #667eea; font-weight: 800; font-size: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    ${(user.full_name || 'U').charAt(0)}
                </div>
                <h2 style="color: white; margin: 0 0 4px 0; font-weight: 700;">${user.full_name || 'Unknown User'}</h2>
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 0.9rem;">${role_name}</p>
            </div>
            
            <!-- Tabs -->
            <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">
                <button id="tab-profile" class="profile-tab active" onclick="window.switchProfileTab('profile')">Profile Info</button>
                <button id="tab-password" class="profile-tab" onclick="window.switchProfileTab('password')">Change Password</button>
            </div>
            
            <!-- Tab Content: Profile Info -->
            <div id="content-profile" class="tab-content" style="display: grid; gap: 16px;">
                <div class="filter-group">
                    <label class="filter-label">Employee ID</label>
                    <input type="text" class="pro-input" value="${employee_id}" readonly style="background: #f8fafc; cursor: not-allowed;">
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Username</label>
                    <input type="text" class="pro-input" value="${user.username || ''}" readonly style="background: #f8fafc; cursor: not-allowed;">
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Full Name</label>
                    <input type="text" id="profile-fullname" class="pro-input" value="${user.full_name || ''}" placeholder="Enter your full name">
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Email</label>
                    <input type="email" id="profile-email" class="pro-input" value="${user.email || ''}" placeholder="Enter your email">
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Department</label>
                    <input type="text" class="pro-input" value="${user.department_name || 'N/A'}" readonly style="background: #f8fafc; cursor: not-allowed;">
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Position</label>
                    <input type="text" class="pro-input" value="${user.position || 'N/A'}" readonly style="background: #f8fafc; cursor: not-allowed;">
                </div>
                
                <button onclick="window.saveProfileInfo()" class="btn btn-primary" style="margin-top: 8px;">Save Changes</button>
            </div>
            
            <!-- Tab Content: Change Password -->
            <div id="content-password" class="tab-content" style="display: none; gap: 18px;">
                <div class="filter-group">
                    <label class="filter-label">Current Password</label>
                    <div style="position: relative;">
                        <input type="password" id="password-current" class="pro-input" placeholder="Enter current password">
                        <button onclick="window.togglePasswordVisibility('password-current')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; cursor: pointer; color: #94a3b8;">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">New Password</label>
                    <div style="position: relative;">
                        <input type="password" id="password-new" class="pro-input" placeholder="Enter new password" oninput="window.validateNewPassword()">
                        <button onclick="window.togglePasswordVisibility('password-new')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; cursor: pointer; color: #94a3b8;">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                    <div id="password-strength-container"></div>
                    <div id="password-requirements-container"></div>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Confirm New Password</label>
                    <div style="position: relative;">
                        <input type="password" id="password-confirm" class="pro-input" placeholder="Confirm new password" oninput="window.validateConfirmPassword()">
                        <button onclick="window.togglePasswordVisibility('password-confirm')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; cursor: pointer; color: #94a3b8;">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                    <div id="password-match-message" style="font-size: 0.75rem; margin-top: 4px;"></div>
                </div>
                
                <button onclick="window.saveNewPassword()" class="btn btn-primary" style="margin-top: 8px;">Update Password</button>
            </div>
        </div>
    `;

    createModal({
        title: "My Profile",
        content: content,
        submitText: "Close",
        hideCancel: true,
        onSubmit: () => { }
    });
};

// Tab switching
window.switchProfileTab = function (tab) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`content-${tab}`).style.display = 'grid';
};

// Password visibility toggle
window.togglePasswordVisibility = function (inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
};

// Validate new password
window.validateNewPassword = async function () {
    const { validatePassword, renderStrengthIndicator, renderRequirements } = await import('../utils/password-validator.js');
    const newPassword = document.getElementById('password-new').value;
    const validation = validatePassword(newPassword);

    const strengthContainer = document.getElementById('password-strength-container');
    const reqContainer = document.getElementById('password-requirements-container');

    if (newPassword) {
        strengthContainer.innerHTML = renderStrengthIndicator(validation.strength);
        reqContainer.innerHTML = renderRequirements(validation);

        // Color input border
        const input = document.getElementById('password-new');
        if (validation.valid) {
            input.style.borderColor = '#10b981';
        } else {
            input.style.borderColor = '#ef4444';
        }
    } else {
        strengthContainer.innerHTML = '';
        reqContainer.innerHTML = '';
        document.getElementById('password-new').style.borderColor = '';
    }

    // Also validate confirm
    window.validateConfirmPassword();
};

// Validate confirm password
window.validateConfirmPassword = function () {
    const newPassword = document.getElementById('password-new').value;
    const confirmPassword = document.getElementById('password-confirm').value;
    const messageEl = document.getElementById('password-match-message');
    const confirmInput = document.getElementById('password-confirm');

    if (!confirmPassword) {
        messageEl.innerHTML = '';
        confirmInput.style.borderColor = '';
        return;
    }

    if (newPassword === confirmPassword) {
        messageEl.innerHTML = '<span style="color: #10b981;">✓ Passwords match</span>';
        confirmInput.style.borderColor = '#10b981';
    } else {
        messageEl.innerHTML = '<span style="color: #ef4444;">✗ Passwords do not match</span>';
        confirmInput.style.borderColor = '#ef4444';
    }
};

// Save profile info
window.saveProfileInfo = async function () {
    const { updateMyProfile, fetchDashboardData } = await import('../core/api.js');
    const { showToast } = await import('../utils/toast.js');

    const fullName = document.getElementById('profile-fullname').value.trim();
    const email = document.getElementById('profile-email').value.trim();

    if (!fullName || !email) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        await updateMyProfile({ full_name: fullName, email: email });
        showToast('Profile updated successfully! 🎉', 'success');

        // Refresh data
        await fetchDashboardData();

        // Close modal and refresh
        document.querySelector('.modal-overlay')?.click();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Save new password
window.saveNewPassword = async function () {
    const { changeMyPassword } = await import('../core/api.js');
    const { showToast } = await import('../utils/toast.js');
    const { validatePassword } = await import('../utils/password-validator.js');

    const currentPassword = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password-new').value;
    const confirmPassword = document.getElementById('password-confirm').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        showToast('New password does not meet requirements', 'error');
        return;
    }

    try {
        await changeMyPassword(currentPassword, newPassword);
        showToast('Password changed successfully! 🔐', 'success');

        // Clear fields
        document.getElementById('password-current').value = '';
        document.getElementById('password-new').value = '';
        document.getElementById('password-confirm').value = '';

        // Close modal
        setTimeout(() => {
            document.querySelector('.modal-overlay')?.click();
        }, 1500);
    } catch (err) {
        showToast(err.message, 'error');
    }
};
