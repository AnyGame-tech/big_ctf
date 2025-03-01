// script.js

// ===============================
// Registration Form Handling
// (Used on your registration page, if applicable)
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const registerError = document.getElementById('registerError');

  if (registerForm) {
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
          registerError.textContent = data.error || 'Registration failed.';
        } else {
          alert(data.message);
          registerForm.reset();
        }
      } catch (error) {
        registerError.textContent = 'Could not connect to server.';
        console.error(error);
      }
    });
  }
});

// ===============================
// Dashboard-specific Code (for team, users, scoreboard)
// ===============================

// Ensure the following code runs only on pages that have the dashboard elements.
if (document.getElementById('team-section')) {

  // ----- TEAM MANAGEMENT (Tabbed Interface) -----
  // Setup team tab switching if applicable
  const teamTabButtons = document.querySelectorAll('.team-tab-btn');
  const teamTabContents = document.querySelectorAll('.team-tab-content');
  teamTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      teamTabButtons.forEach(btn => btn.classList.remove('active'));
      teamTabContents.forEach(content => content.classList.remove('active'));
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Dummy current user id for demo purposes.
  const currentUserId = "user1";
  const joinTeamBtn = document.getElementById('joinTeamBtn');
  const createTeamBtn = document.getElementById('createTeamBtn');
  const joinTeamForm = document.getElementById('joinTeamForm');
  const createTeamForm = document.getElementById('createTeamForm');
  const cancelJoinTeam = document.getElementById('cancelJoinTeam');
  const cancelCreateTeam = document.getElementById('cancelCreateTeam');
  const teamMessage = document.getElementById('teamMessage');
  const currentTeamMessage = document.getElementById('currentTeamMessage');

  if (joinTeamBtn) {
    joinTeamBtn.addEventListener('click', () => {
      joinTeamForm.style.display = 'block';
      createTeamForm.style.display = 'none';
    });
  }
  if (createTeamBtn) {
    createTeamBtn.addEventListener('click', () => {
      createTeamForm.style.display = 'block';
      joinTeamForm.style.display = 'none';
    });
  }
  if (cancelJoinTeam) {
    cancelJoinTeam.addEventListener('click', () => {
      joinTeamForm.style.display = 'none';
    });
  }
  if (cancelCreateTeam) {
    cancelCreateTeam.addEventListener('click', () => {
      createTeamForm.style.display = 'none';
    });
  }

  document.getElementById('submitJoinTeam')?.addEventListener('click', () => {
    const teamName = document.getElementById('joinTeamName').value;
    const teamPassword = document.getElementById('joinTeamPassword').value;
    fetch('/api/team/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, password: teamPassword, userId: currentUserId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          teamMessage.innerText = data.error;
        } else {
          teamMessage.innerText = data.message;
          currentTeamMessage.innerText = "You are in team: " + data.team.teamName;
          joinTeamForm.style.display = 'none';
        }
      })
      .catch(err => {
        console.error('Error joining team:', err);
        teamMessage.innerText = 'Error joining team.';
      });
  });

  document.getElementById('submitCreateTeam')?.addEventListener('click', () => {
    const teamName = document.getElementById('createTeamName').value;
    const teamPassword = document.getElementById('createTeamPassword').value;
    fetch('/api/team/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, password: teamPassword, userId: currentUserId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          teamMessage.innerText = data.error;
        } else {
          teamMessage.innerText = data.message;
          currentTeamMessage.innerText = "You are in team: " + data.team.teamName;
          createTeamForm.style.display = 'none';
        }
      })
      .catch(err => {
        console.error('Error creating team:', err);
        teamMessage.innerText = 'Error creating team.';
      });
  });
}

// ----- USERS LIST WITH SEARCH & PAGINATION -----
if (document.getElementById('users-section')) {
  let allUsers = [];
  let currentUsersPage = 1;
  const usersPageSize = 5;

  function fetchUsers() {
    fetch('/api/users')
      .then(response => response.json())
      .then(data => {
        allUsers = data;
        currentUsersPage = 1;
        renderUsersList();
      })
      .catch(err => console.error('Error fetching users:', err));
  }

  function renderUsersList() {
    const searchInput = document.getElementById('userSearchInput');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let filtered = allUsers.filter(user => user.username.toLowerCase().includes(query));
    const totalPages = Math.ceil(filtered.length / usersPageSize);
    if (currentUsersPage > totalPages) currentUsersPage = totalPages || 1;
    const start = (currentUsersPage - 1) * usersPageSize;
    const pageUsers = filtered.slice(start, start + usersPageSize);

    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    pageUsers.forEach(user => {
      const div = document.createElement('div');
      div.className = 'user-item';
      div.textContent = user.username;
      usersList.appendChild(div);
    });

    renderUsersPagination(totalPages);
  }

  function renderUsersPagination(totalPages) {
    const paginationDiv = document.getElementById('usersPagination');
    paginationDiv.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      if (i === currentUsersPage) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        currentUsersPage = i;
        renderUsersList();
      });
      paginationDiv.appendChild(btn);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('userSearchBtn');
    const searchInput = document.getElementById('userSearchInput');
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        currentUsersPage = 1;
        renderUsersList();
      });
      searchInput.addEventListener('keyup', () => {
        currentUsersPage = 1;
        renderUsersList();
      });
    }
  });
}

// ----- SCOREBOARD SCRIPT (Unchanged) -----
const mockScoreData = [
  { time: '01:00', 'Team Alpha': 0, 'Team Beta': 50, 'Team Gamma': 100, 'Team Delta': 0 },
  { time: '02:00', 'Team Alpha': 500, 'Team Beta': 1100, 'Team Gamma': 800, 'Team Delta': 600 },
  { time: '03:00', 'Team Alpha': 1200, 'Team Beta': 1500, 'Team Gamma': 1400, 'Team Delta': 1300 },
  { time: '04:00', 'Team Alpha': 2000, 'Team Beta': 2200, 'Team Gamma': 2400, 'Team Delta': 2100 }
];
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];
const scoreboardTeams = Object.keys(mockScoreData[0]).filter(k => k !== 'time');

function initializeChart() {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  const datasets = scoreboardTeams.map((team, index) => ({
    label: team,
    data: mockScoreData.map(entry => entry[team]),
    borderColor: COLORS[index % COLORS.length],
    backgroundColor: 'transparent',
    tension: 0.1,
    pointRadius: 4,
    pointHoverRadius: 6
  }));
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: mockScoreData.map(entry => entry.time),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
        x: { display: true }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { mode: 'index', intersect: false }
      }
    }
  });
}

function populateStandings() {
  const standingsList = document.getElementById('standingsList');
  standingsList.innerHTML = '';
  const latest = mockScoreData[mockScoreData.length - 1];
  const sorted = scoreboardTeams.map(t => ({
    name: t,
    score: latest[t]
  })).sort((a, b) => b.score - a.score);
  sorted.forEach((team, i) => {
    const color = COLORS[i % COLORS.length];
    const item = document.createElement('div');
    item.className = 'standing-item';
    item.innerHTML = `
      <div class="team-info">
        <div class="team-color" style="background-color: ${color}"></div>
        <span class="team-name">${i+1}. ${team.name}</span>
      </div>
      <span class="team-score">${team.score} pts</span>
    `;
    standingsList.appendChild(item);
  });
}

function setupScoreboardTabs() {
  const tabButtons = document.querySelectorAll('#scoreboard-section .tab-btn');
  const tabContents = document.querySelectorAll('#scoreboard-section .tab-content');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupScoreboardTabs();
  initializeChart();
  populateStandings();
});
