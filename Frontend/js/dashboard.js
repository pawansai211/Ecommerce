document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard script loaded! Checking authentication...");

    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    const signinLink = document.getElementById('signin-link');
    const signupLink = document.getElementById('signup-link');
    const logoutLink = document.getElementById('logout-link');
    const adminPanel = document.getElementById('admin-panel');

    // Check if all navbar elements exist
    if (!signinLink || !signupLink || !logoutLink || !adminPanel) {
        console.error("Error: Some navbar elements are missing in dashboard.html!");
        return;
    }

    // Authentication Check
    if (token) {
        console.log("User is logged in. Hiding Sign In and Sign Up...");
        signinLink.style.display = 'none';
        signupLink.style.display = 'none';
        logoutLink.style.display = 'inline';
    } else {
        console.log("User is NOT logged in. Showing Sign In and Sign Up...");
        signinLink.style.display = 'inline';
        signupLink.style.display = 'inline';
        logoutLink.style.display = 'none';
        adminPanel.style.display = 'none'; // Hide admin panel if not logged in
        return; // Stop further execution if no user is logged in
    }

    // Admin Panel Visibility
    if (isAdmin) {
        console.log("User is an admin. Showing Admin Panel...");
        adminPanel.style.display = 'inline';
    } else {
        console.log("User is NOT an admin. Hiding Admin Panel...");
        adminPanel.style.display = 'none';
    }

    // Logout Functionality
    logoutLink.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.clear();
        console.log("User logged out. Redirecting to login page...");
        window.location.href = 'login.html'; // Redirect to login page
    });
});
