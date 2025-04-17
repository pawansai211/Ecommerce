document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const apiUrl = 'http://localhost:3000/api/v1/users/login'; // Update if needed

    const userData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        console.log('Login Response:', data); // Debugging
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (!data.token) {
            throw new Error('Token not received from server');
        }

        // Store token
        localStorage.setItem('token', data.token);

        // Decode JWT token to extract user data
        try {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            localStorage.setItem('userId', payload.userId);
            localStorage.setItem('isAdmin', payload.isAdmin);
        } catch (err) {
            console.error('JWT Decoding Error:', err);
            throw new Error('Invalid token received');
        }

        document.getElementById('success-message').innerText = 'Login successful!';
        document.getElementById('error-message').innerText = '';

        // Redirect based on role
        setTimeout(() => {
            if (data.isAdmin) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);

    } catch (error) {
        console.error('Login Error:', error.message);
        document.getElementById('error-message').innerText = error.message;
    }
});
