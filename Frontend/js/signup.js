document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return; // Exit if the form does not exist

    signupForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const apiUrl = 'http://localhost:3000/api/v1/users/register';

        const userData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            phone: document.getElementById('phone').value,
            street: document.getElementById('street').value,
            apartment: document.getElementById('apartment').value,
            zip: document.getElementById('zip').value,
            city: document.getElementById('city').value,
            country: document.getElementById('country').value,
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Signup failed');
            }

            document.getElementById('success-message').innerText = 'Signup successful!';
            document.getElementById('error-message').innerText = '';
            signupForm.reset();
        } catch (error) {
            document.getElementById('error-message').innerText = error.message;
        }
    });
});
