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

    // Toggle Password Visibility
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

    // Auto-fill remembered username
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername && usernameField) {
        usernameField.value = savedUsername;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Updated selection to target correct inputs after UI changes
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
                    // Handle Remember Me
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
                    console.log('✅ SAVED department_id:', localStorage.getItem('department_id'));
                    console.log('✅ SAVED position_id:', localStorage.getItem('position_id'));

                    showToast('Logged in successfully!', 'success');

                    // Small delay to let the toast be seen
                    setTimeout(() => {
                        window.location.replace('/finova/dashboard');
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
