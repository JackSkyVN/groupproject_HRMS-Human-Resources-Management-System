// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // Get references to the forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    // Get references to all links that should show the login form
    const showLoginLinks = document.querySelectorAll('.show-login');
    
    // Get references to all links that should show the sign-up form
    const showSignupLinks = document.querySelectorAll('.show-signup');

    // Add click event listeners to all "show sign-up" links
    showSignupLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the link from navigating
            loginForm.classList.add('hidden'); // Hide the login form
            signupForm.classList.remove('hidden'); // Show the sign-up form
        });
    });

    // Add click event listeners to all "show login" links
    showLoginLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the link from navigating
            signupForm.classList.add('hidden'); // Hide the sign-up form
            loginForm.classList.remove('hidden'); // Show the login form
        });
    });
});