// import { API_BASE_URL } from '../config.js';
const API_BASE_URL = 'http://127.0.0.1:8000';

document.addEventListener('DOMContentLoaded', () => {
    // Forgot Password Listener
    const forgotPwLink = document.getElementById('forgot-password-link');
    if (forgotPwLink) {
        forgotPwLink.addEventListener('click', showForgotPasswordInfo);
    }


    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const togglePassword = document.getElementById('togglePassword');

    // Chức năng toggle hiển/ẩn mật khẩu
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function (e) {
            e.preventDefault();
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;

            // Toggle icon
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    const loginFormElement = loginForm.querySelector('form');
    const rememberCheckbox = document.getElementById('remember-login');
    const usernameField = loginFormElement.querySelector('input[type="text"]');

    // Tự động điền username đã lưu
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername && usernameField) {
        usernameField.value = savedUsername;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Cập nhật selector để target đúng inputs sau khi thay đổi UI
            const usernameInput = usernameField;
            const passwordInput = loginFormElement.querySelector('input[type="password"]') || document.getElementById('password-input');

            const username = usernameInput.value;
            const password = passwordInput.value;
            const submitBtn = loginFormElement.querySelector('button');

            console.log("Debug: API_BASE_URL is", API_BASE_URL);
            const targetUrl = `${API_BASE_URL}/api/v1/auth/login`;
            console.log("Debug: Fetching", targetUrl);

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Signing in...';

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        'username': username,
                        'password': password
                    })
                });

                if (response.ok) {
                    // Xử lý Remember Me
                    if (rememberCheckbox && rememberCheckbox.checked) {
                        localStorage.setItem('rememberedUsername', username);
                    } else {
                        localStorage.removeItem('rememberedUsername');
                    }

                    const data = await response.json();
                    console.log('🔐 LOGIN RESPONSE:', data);
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('employee_id', data.employee_id);
                    localStorage.setItem('role_level', data.role_level);
                    localStorage.setItem('role_name', data.role_name);
                    localStorage.setItem('full_name', data.full_name);
                    localStorage.setItem('employee_code', data.employee_code);
                    localStorage.setItem('department_id', data.department_id);
                    localStorage.setItem('position_id', data.position_id);
                    localStorage.setItem('position_name', data.position_name || '');
                    console.log('✅ SAVED department_id:', localStorage.getItem('department_id'));
                    console.log('✅ SAVED position_id:', localStorage.getItem('position_id'));

                    // Xác định URL redirect dựa trên role
                    let redirectPath = '/finova/';
                    const roleLevel = parseInt(data.role_level);
                    const positionName = data.position_name || '';

                    if (roleLevel === 1) {
                        // Admin
                        redirectPath = '/finova/admin/dashboard';
                    } else if (roleLevel === 2) {
                        // HR Manager
                        redirectPath = '/finova/hr-manager/dashboard';
                    } else if (roleLevel === 3) {
                        // HR Staff - xác định thư mục con dựa trên position
                        const posLower = positionName.toLowerCase();
                        if (posLower.includes('it')) {
                            redirectPath = '/finova/hr-it/dashboard';
                        } else if (posLower.includes('finance')) {
                            redirectPath = '/finova/hr-finance/dashboard';
                        } else if (posLower.includes('construction')) {
                            redirectPath = '/finova/hr-construction/dashboard';
                        } else if (posLower.includes('administration')) {
                            redirectPath = '/finova/hr-administration/dashboard';
                        } else if (posLower.includes('other') || posLower.includes('support')) {
                            redirectPath = '/finova/hr-support/dashboard';
                        } else {
                            redirectPath = '/finova/hr-staff/dashboard'; // dự phòng
                        }
                    } else if (roleLevel === 4) {
                        // Staff
                        redirectPath = '/finova/staff/dashboard';
                    } else {
                        // Dự phòng
                        redirectPath = '/finova/dashboard';
                    }

                    console.log(`🔀 Redirecting to: ${redirectPath}`);

                    showToast('Logged in successfully!', 'success');

                    // Độ trễ nhỏ để hiển toast
                    setTimeout(() => {
                        window.location.href = redirectPath;
                    }, 1200);
                } else {
                    const errorData = await response.json();
                    let errMsg = 'Login failed';
                    if (typeof errorData.detail === 'string') {
                        errMsg = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        errMsg = errorData.detail[0].msg || 'Validation error';
                    }
                    showToast(errMsg, 'danger');
                }
            } catch (error) {
                console.error('Login error:', error);
                showToast(`Could not connect to server.`, 'danger');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }
});

function showForgotPasswordInfo() {
    showToast("Please contact the HR Manager or System Administrator to reset your password.", "warning");
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-shield-exclamation',
        danger: 'fas fa-exclamation-triangle',
        warning: 'fas fa-info-circle'
    };

    const iconClass = icons[type] || icons.success;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
