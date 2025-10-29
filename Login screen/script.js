
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
});