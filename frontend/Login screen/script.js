
document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    const showLoginLinks = document.querySelectorAll('.show-login');
    const showSignupLinks = document.querySelectorAll('.show-signup');

    showSignupLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        });
    });

    showLoginLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    });

    const loginFormElement = loginForm.querySelector('form');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async (event) => {
            event.preventDefault();

            const inputs = loginFormElement.querySelectorAll('input');
            const username = inputs[0].value;
            const password = inputs[1].value;
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
                        'email': username,
                        'password': password
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    //  Lưu token JWT được cấp bởi backend để dùng cho các request sau
                    localStorage.setItem('token', data.access_token);
                    //  Lưu danh sách roles (vd: admin, employee) trả về từ backend
                    localStorage.setItem('roles', JSON.stringify(data.roles)); // Lưu quyền (Roles)
                    window.location.href = '../Main Menu/HR Dashboard/index.html';
                } else {
                    const errorData = await response.json();
                    alert('Login failed: ' + (errorData.detail || 'Unknown error'));
                }
            } catch (error) {
                console.error('Login error:', error);
                alert(`Login error: Could not connect to server.\nURL: ${targetUrl}\nError: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }
});