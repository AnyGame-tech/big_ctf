// app.js

// Grab references to container and toggle buttons
const container = document.querySelector('.container');
const signUpBtn = document.getElementById('signUpBtn');
const signInBtn = document.getElementById('signInBtn');

// Toggle "sign-up-mode" class to switch forms
signUpBtn.addEventListener('click', () => {
  container.classList.add('sign-up-mode');
});
signInBtn.addEventListener('click', () => {
  container.classList.remove('sign-up-mode');
});

// ===== Sign In Form =====
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    loginError.textContent = 'Both email and password are required.';
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error || 'Login failed.';
    } else {
      // On success, redirect to the dashboard
      window.location.href = '/dashboard';
    }
  } catch (err) {
    loginError.textContent = 'Could not connect to server.';
    console.error(err);
  }
});

// ===== Sign Up Form =====
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

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      registerError.textContent = data.error || 'Registration failed.';
    } else {
      alert(data.message); // e.g. "User registered successfully!"
      registerForm.reset();
      // Optionally switch back to sign-in form
      container.classList.remove('sign-up-mode');
    }
  } catch (err) {
    registerError.textContent = 'Could not connect to server.';
    console.error(err);
  }
});
