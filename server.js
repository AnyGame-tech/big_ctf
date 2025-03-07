const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session middleware
app.use(session({
  secret: 'someRandomSecretKey', // Change this in production!
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// -----------------------
// Load Users
// -----------------------
const usersFilePath = path.join(__dirname, 'users.json');
let users = [];
try {
  if (fs.existsSync(usersFilePath)) {
    const usersData = fs.readFileSync(usersFilePath, 'utf8');
    users = JSON.parse(usersData);
  }
} catch (err) {
  console.error("Error reading users.json:", err);
}

// -----------------------
// Load Teams
// -----------------------
const teamsFilePath = path.join(__dirname, 'teams.json');
let teams = [];
try {
  if (fs.existsSync(teamsFilePath)) {
    const teamsData = fs.readFileSync(teamsFilePath, 'utf8');
    teams = JSON.parse(teamsData);
  }
} catch (err) {
  console.error("Error reading teams.json:", err);
}

// -----------------------
// User Endpoints
// -----------------------

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
  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    password: hashedPassword,
    teamId: null,
    solvedChallenges: []
  };
  users.push(newUser);
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing users.json:", err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
  res.json({ message: 'User registered successfully!' });
});

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

app.get('/api/users', (req, res) => {
  res.json(users);
});

// -----------------------
// Team Endpoints
// -----------------------

app.get('/api/teams', (req, res) => {
  const teamsWithNames = teams.map(team => {
    const membersNames = team.members
      .map(memberId => {
        const memberUser = users.find(u => u.id === memberId);
        return memberUser ? memberUser.username : null;
      })
      .filter(Boolean);
    if (typeof team.score !== 'number') team.score = 0;
    if (!team.solvedChallenges || typeof team.solvedChallenges !== 'object') {
      team.solvedChallenges = {};
    }
    return { ...team, membersNames };
  });
  res.json(teamsWithNames);
});

app.get('/api/myteam', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(403).json({ error: 'Not logged in' });
  const currentUser = users.find(u => u.id === userId);
  if (!currentUser || !currentUser.teamId) return res.json({ message: 'No team found for this user.' });
  const myTeam = teams.find(t => t.id === currentUser.teamId);
  if (!myTeam) return res.json({ message: 'No team found for this user.' });
  const membersNames = myTeam.members
    .map(memberId => {
      const mUser = users.find(u => u.id === memberId);
      return mUser ? mUser.username : null;
    })
    .filter(Boolean);
  if (typeof myTeam.score !== 'number') myTeam.score = 0;
  if (!myTeam.solvedChallenges || typeof myTeam.solvedChallenges !== 'object') {
    myTeam.solvedChallenges = {};
  }
  res.json({ team: { ...myTeam, membersNames } });
});

app.get('/api/profile', (req, res) => {
  if (!req.session.userId) return res.status(403).json({ error: 'Not logged in' });
  const currentUser = users.find(u => u.id === req.session.userId);
  if (!currentUser) return res.status(404).json({ error: 'User not found.' });
  let teamName = null;
  if (currentUser.teamId) {
    const myTeam = teams.find(t => t.id === currentUser.teamId);
    if (myTeam) teamName = myTeam.teamName;
  }
  res.json({ username: currentUser.username, teamName });
});

app.post('/api/team/create', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(403).json({ error: 'Not logged in' });
  const { teamName, password } = req.body;
  if (!teamName || !password) return res.status(400).json({ error: 'Team name and password required.' });
  const existingTeam = teams.find(t => t.teamName.toLowerCase() === teamName.toLowerCase());
  if (existingTeam) return res.status(400).json({ error: 'Team already exists.' });
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newTeam = {
    id: Date.now().toString(),
    teamName,
    password: hashedPassword,
    members: [userId],
    score: 0,
    solvedChallenges: {}
  };
  teams.push(newTeam);
  try {
    fs.writeFileSync(teamsFilePath, JSON.stringify(teams, null, 2));
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing team or users file:", err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
  user.teamId = newTeam.id;
  res.json({ message: 'Team created successfully!', team: newTeam });
});

app.post('/api/team/join', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(403).json({ error: 'Not logged in' });
  const { teamName, password } = req.body;
  if (!teamName || !password) return res.status(400).json({ error: 'Team name and password required.' });
  const team = teams.find(t => t.teamName.toLowerCase() === teamName.toLowerCase());
  if (!team) return res.status(404).json({ error: 'Team not found.' });
  if (!bcrypt.compareSync(password, team.password)) return res.status(400).json({ error: 'Incorrect team password.' });
  if (!team.members.includes(userId)) {
    team.members.push(userId);
    try {
      fs.writeFileSync(teamsFilePath, JSON.stringify(teams, null, 2));
    } catch (err) {
      console.error("Error writing teams.json:", err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.teamId = team.id;
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing users.json:", err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
  res.json({ message: `Joined team ${team.teamName} successfully.`, team });
});

app.post('/api/challenge/flag', (req, res) => {
  if (!req.session.userId) return res.status(403).json({ error: 'Not logged in' });
  const { category, flag } = req.body;
  if (!category || !flag) return res.status(400).json({ error: 'Category and flag required.' });
  const flagsFilePath = path.join(__dirname, 'private', 'flags.json');
  if (!fs.existsSync(flagsFilePath)) return res.status(500).json({ error: 'Flags file not found.' });
  const flagsData = JSON.parse(fs.readFileSync(flagsFilePath, 'utf8'));
  const storedHash = flagsData[category];
  if (!storedHash) return res.status(404).json({ error: 'Challenge not found for this category.' });
  if (!bcrypt.compareSync(flag, storedHash)) return res.json({ message: 'Incorrect flag.' });
  
  const userId = req.session.userId;
  const currentUser = users.find(u => u.id === userId);
  if (!currentUser || !currentUser.teamId) return res.status(400).json({ error: 'You are not in a team.' });
  const team = teams.find(t => t.id === currentUser.teamId);
  if (!team) return res.status(400).json({ error: 'Team not found.' });
  
  const alreadySolved = team.members.some(memberId => {
    const member = users.find(u => u.id === memberId);
    return member && Array.isArray(member.solvedChallenges) && member.solvedChallenges.includes(category);
  });
  
  if (alreadySolved) {
    return res.json({ message: 'This challenge has already been solved by a team member.' });
  }
  
  if (!Array.isArray(currentUser.solvedChallenges)) {
    currentUser.solvedChallenges = [];
  }
  currentUser.solvedChallenges.push(category);
  team.score += 500;
  
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    fs.writeFileSync(teamsFilePath, JSON.stringify(teams, null, 2));
  } catch (err) {
    console.error("Error writing files:", err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
  
  return res.json({ message: 'Correct flag! 500 points added to your team.' });
});

// -----------------------
// Protected Routes & Static Files
// -----------------------

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'private', 'dashboard.html'));
});

app.get('/dashboard-styles.css', (req, res) => {
  if (!req.session.userId) return res.status(403).send('Not authorized');
  res.sendFile(path.join(__dirname, 'private', 'styles.css'));
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => { res.redirect('/'); });
});

app.use(express.static('public'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
