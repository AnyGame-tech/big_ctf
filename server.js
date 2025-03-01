const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
app.use(express.json());

// Set up session middleware
app.use(session({
  secret: 'someRandomSecretKey', // Change this in production!
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// -----------------------
// User Endpoints
// -----------------------

// Load users from users.json
const usersFilePath = path.join(__dirname, 'users.json');
let users = fs.existsSync(usersFilePath)
  ? JSON.parse(fs.readFileSync(usersFilePath, 'utf8'))
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
  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'Email already in use.' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = { id: Date.now().toString(), username, email, password: hashedPassword };
  users.push(newUser);
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
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
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: 'Invalid password.' });
  }
  req.session.userId = user.id;
  res.json({ message: 'Login successful!' });
});

// GET /api/users – returns all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// -----------------------
// Team Endpoints
// -----------------------

// Load teams from teams.json
const teamsFilePath = path.join(__dirname, 'teams.json');
let teams = fs.existsSync(teamsFilePath)
  ? JSON.parse(fs.readFileSync(teamsFilePath, 'utf8'))
  : [];

/**
 * GET /api/teams
 * Returns a list of all teams with member usernames.
 */
app.get('/api/teams', (req, res) => {
  const teamsWithNames = teams.map(team => {
    const membersNames = team.members.map(memberId => {
      const user = users.find(u => u.id === memberId);
      return user ? user.username : 'Unknown';
    });
    return { ...team, membersNames };
  });
  res.json(teamsWithNames);
});

/**
 * GET /api/myteam
 * Returns the team of the current user (if any).
 */
app.get('/api/myteam', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(403).json({ error: 'Not logged in' });
  const myTeam = teams.find(team => team.members.includes(userId));
  if (!myTeam) return res.json({ message: 'No team found for this user.' });
  const membersNames = myTeam.members.map(memberId => {
    const user = users.find(u => u.id === memberId);
    return user ? user.username : 'Unknown';
  });
  res.json({ team: { ...myTeam, membersNames } });
});

/**
 * POST /api/team/create
 * Creates a new team with a hashed password and adds the user as its first member.
 */
app.post('/api/team/create', (req, res) => {
  const { teamName, password, userId } = req.body;
  if (!teamName || !password || !userId) {
    return res.status(400).json({ error: 'Team name, password, and userId are required.' });
  }
  const existingTeam = teams.find(t => t.teamName.toLowerCase() === teamName.toLowerCase());
  if (existingTeam) {
    return res.status(400).json({ error: 'Team already exists.' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newTeam = { id: Date.now().toString(), teamName, password: hashedPassword, members: [userId] };
  teams.push(newTeam);
  fs.writeFileSync(teamsFilePath, JSON.stringify(teams, null, 2));
  res.json({ message: 'Team created successfully!', team: newTeam });
});

/**
 * POST /api/team/join
 * Allows a user to join an existing team if the password matches.
 */
app.post('/api/team/join', (req, res) => {
  const { teamName, password, userId } = req.body;
  if (!teamName || !password || !userId) {
    return res.status(400).json({ error: 'Team name, password, and userId are required.' });
  }
  const team = teams.find(t => t.teamName.toLowerCase() === teamName.toLowerCase());
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  if (!bcrypt.compareSync(password, team.password)) {
    return res.status(400).json({ error: 'Incorrect team password.' });
  }
  if (!team.members.includes(userId)) {
    team.members.push(userId);
    fs.writeFileSync(teamsFilePath, JSON.stringify(teams, null, 2));
  }
  res.json({ message: `Joined team ${team.teamName} successfully.`, team });
});

// -----------------------
// Protected Routes & Static Files
// -----------------------

// GET /dashboard – protected route
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'private', 'dashboard.html'));
});
app.get('/dashboard-styles.css', (req, res) => {
  if (!req.session.userId) return res.status(403).send('Not authorized');
  res.sendFile(path.join(__dirname, 'private', 'styles.css'));
});

// GET /teams – protected route for Teams page
app.get('/teams', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'private', 'teams.html'));
});
app.get('/teams-styles.css', (req, res) => {
  if (!req.session.userId) return res.status(403).send('Not authorized');
  res.sendFile(path.join(__dirname, 'private', 'teams-styles.css'));
});
app.get('/teams.js', (req, res) => {
  if (!req.session.userId) return res.status(403).send('Not authorized');
  res.sendFile(path.join(__dirname, 'private', 'teams.js'));
});

// GET /logout – log out user
app.get('/logout', (req, res) => {
  req.session.destroy(() => { res.redirect('/'); });
});

// Serve static files from the 'public' folder
app.use(express.static('public'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
