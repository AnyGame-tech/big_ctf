// script.js
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const registerError = document.getElementById('registerError');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      registerError.textContent = 'All fields are required.';
      return;
    }

    if (password !== confirmPassword) {
      registerError.textContent = 'Passwords do not match.';
      return;
    }

    // POST to /api/register
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        // Show server-side error (e.g. email already in use)
        registerError.textContent = data.error || 'Registration failed.';
      } else {
        alert(data.message); // e.g. 'User registered successfully!'
        registerForm.reset();
      }
    } catch (error) {
      registerError.textContent = 'Could not connect to server.';
      console.error(error);
    }
  });
});
