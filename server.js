// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session'); // <-- import express-session

const app = express();
app.use(express.json());

// Set up session middleware
app.use(session({
  secret: 'someRandomSecretKey', // Change this to a long random string
  resave: false,
  saveUninitialized: false,
  cookie: {
    // In production, set secure: true if using HTTPS
    maxAge: 1000 * 60 * 60 // 1 hour session, for example
  }
}));

const dataFilePath = path.join(__dirname, 'users.json');
let users = fs.existsSync(dataFilePath)
  ? JSON.parse(fs.readFileSync(dataFilePath, 'utf8'))
  : [];

/**
 * POST /api/register
 * Creates a new user with hashed password.
 */
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required.' });
  }

  // Check if user already exists by email
  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'Email already in use.' });
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);

  // Create user object
  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    password: hashedPassword
  };

  users.push(newUser);
  fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2));

  res.json({ message: 'User registered successfully!' });
});

/**
 * POST /api/login
 * Validates user credentials and starts a session.
 */
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(400).json({ error: 'User not found.' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(400).json({ error: 'Invalid password.' });
  }

  // Store user ID in the session
  req.session.userId = user.id;
  res.json({ message: 'Login successful!' });
});

/**
 * GET /dashboard
 * Protected route: only accessible if user is logged in.
 */
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  // If logged in, send the file from private folder
  res.sendFile(path.join(__dirname, 'private', 'dashboard.html'));
});

app.get('/dashboard-styles.css', (req, res) => {
  if (!req.session.userId) {
    return res.status(403).send('Not authorized');
  }
  res.sendFile(path.join(__dirname, 'private', 'styles.css'));
});


/**
 * GET /logout
 * Logs the user out by destroying the session.
 */
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    // Session is destroyed, redirect to home page
    res.redirect('/');
  });
});

// (Optional) GET /api/users for debugging
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Serve everything in the 'public' folder as static
app.use(express.static('public'));

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
