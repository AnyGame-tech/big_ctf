// teams.js

let teamsData = [];
let currentPage = 1;
const pageSize = 5;
const currentUserId = "user1"; // Dummy user id for demo purposes

// Fetch all teams from the server (returns teams with members' usernames)
function fetchTeams() {
  fetch('/api/teams')
    .then(response => response.json())
    .then(data => {
      teamsData = data;
      currentPage = 1;
      renderTeams();
    })
    .catch(error => console.error('Error fetching teams:', error));
}

function renderTeams() {
  const searchInput = document.getElementById('teamSearchInput');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  let filtered = teamsData.filter(team =>
    team.teamName.toLowerCase().includes(query)
  );
  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const start = (currentPage - 1) * pageSize;
  const pageTeams = filtered.slice(start, start + pageSize);

  const teamsList = document.getElementById('teamsList');
  teamsList.innerHTML = '';
  pageTeams.forEach(team => {
    const div = document.createElement('div');
    div.className = 'team-item';
    const members = team.membersNames ? team.membersNames.join(', ') : 'No members';
    div.innerHTML = `<strong>${team.teamName}</strong> — Members: ${members}`;
    teamsList.appendChild(div);
  });
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const paginationDiv = document.getElementById('teamsPagination');
  paginationDiv.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentPage = i;
      renderTeams();
    });
    paginationDiv.appendChild(btn);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Setup search event listeners
  const searchBtn = document.getElementById('teamSearchBtn');
  const searchInput = document.getElementById('teamSearchInput');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      currentPage = 1;
      renderTeams();
    });
    searchInput.addEventListener('keyup', () => {
      currentPage = 1;
      renderTeams();
    });
  }
  fetchTeams();

  // Fetch and display current user's team ("My Team" section)
  fetch('/api/myteam')
    .then(response => response.json())
    .then(data => {
      const myTeamInfo = document.getElementById('myTeamInfo');
      const noTeamActions = document.getElementById('noTeamActions');
      if (data.team) {
        const members = data.team.membersNames ? data.team.membersNames.join(', ') : 'No members';
        myTeamInfo.innerHTML = `<strong>${data.team.teamName}</strong><br/>Members: ${members}`;
        noTeamActions.style.display = 'none';
      } else {
        myTeamInfo.innerHTML = '<p>You are not in a team.</p>';
        noTeamActions.style.display = 'block';
      }
    })
    .catch(err => console.error('Error fetching my team:', err));

  // Setup event listeners for "Join Team" and "Create Team" toggles
  document.getElementById('showJoinForm').addEventListener('click', () => {
    document.getElementById('joinTeamSection').style.display = 'block';
    document.getElementById('createTeamSection').style.display = 'none';
  });
  document.getElementById('showCreateForm').addEventListener('click', () => {
    document.getElementById('createTeamSection').style.display = 'block';
    document.getElementById('joinTeamSection').style.display = 'none';
  });
  
  // Cancel buttons
  document.getElementById('cancelJoinTeam').addEventListener('click', () => {
    document.getElementById('joinTeamSection').style.display = 'none';
  });
  document.getElementById('cancelCreateTeam').addEventListener('click', () => {
    document.getElementById('createTeamSection').style.display = 'none';
  });

  // Submit Join Team
  document.getElementById('submitJoinTeam').addEventListener('click', () => {
    const teamName = document.getElementById('joinTeamName').value;
    const teamPassword = document.getElementById('joinTeamPassword').value;
    fetch('/api/team/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, password: teamPassword, userId: currentUserId })
    })
      .then(res => res.json())
      .then(data => {
        const joinTeamMessage = document.getElementById('joinTeamMessage');
        if (data.error) {
          joinTeamMessage.innerText = data.error;
        } else {
          joinTeamMessage.innerText = data.message;
          // Refresh My Team section
          fetch('/api/myteam')
            .then(res => res.json())
            .then(myData => {
              const myTeamInfo = document.getElementById('myTeamInfo');
              if (myData.team) {
                const members = myData.team.membersNames ? myData.team.membersNames.join(', ') : 'No members';
                myTeamInfo.innerHTML = `<strong>${myData.team.teamName}</strong><br/>Members: ${members}`;
                document.getElementById('noTeamActions').style.display = 'none';
              }
            });
          document.getElementById('joinTeamSection').style.display = 'none';
        }
      })
      .catch(err => {
        console.error('Error joining team:', err);
        document.getElementById('joinTeamMessage').innerText = 'Error joining team.';
      });
  });

  // Submit Create Team
  document.getElementById('submitCreateTeam').addEventListener('click', () => {
    const teamName = document.getElementById('createTeamName').value;
    const teamPassword = document.getElementById('createTeamPassword').value;
    fetch('/api/team/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, password: teamPassword, userId: currentUserId })
    })
      .then(res => res.json())
      .then(data => {
        const createTeamMessage = document.getElementById('createTeamMessage');
        if (data.error) {
          createTeamMessage.innerText = data.error;
        } else {
          createTeamMessage.innerText = data.message;
          // Refresh My Team section
          fetch('/api/myteam')
            .then(res => res.json())
            .then(myData => {
              const myTeamInfo = document.getElementById('myTeamInfo');
              if (myData.team) {
                const members = myData.team.membersNames ? myData.team.membersNames.join(', ') : 'No members';
                myTeamInfo.innerHTML = `<strong>${myData.team.teamName}</strong><br/>Members: ${members}`;
                document.getElementById('noTeamActions').style.display = 'none';
              }
            });
          document.getElementById('createTeamSection').style.display = 'none';
        }
      })
      .catch(err => {
        console.error('Error creating team:', err);
        document.getElementById('createTeamMessage').innerText = 'Error creating team.';
      });
  });
});
