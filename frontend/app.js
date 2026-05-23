const API = 'https://projecthub-backend-scfj.onrender.com/api';
fetch('https://projecthub-backend-scfj.onrender.com').catch(() => {});

// ─── DECLARE ALL VARIABLES FIRST ────────────────────
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentProject = null;
let currentProjectMembers = [];
let currentTask = null;
let currentUserRole = null;
let socket = null;
let draggedTaskId = null;
let allTasks = [];
let activityPage = 1;
let activityTotalPages = 1;

// ─── GOOGLE OAUTH CALLBACK HANDLER ──────────────────
(function handleGoogleOAuthCallback() {
  const params     = new URLSearchParams(window.location.search);
  const oauthToken = params.get('token');
  const oauthUser  = params.get('user');
  if (oauthToken && oauthUser) {
    try {
      token       = oauthToken;
      currentUser = JSON.parse(decodeURIComponent(oauthUser));
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(currentUser));
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error('Failed to parse Google OAuth response', e);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      token       = null;
      currentUser = null;
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
})();

// ─── EMAIL VERIFICATION CALLBACK ────────────────────
(function handleVerificationCallback() {
  const params   = new URLSearchParams(window.location.search);
  const verified = params.get('verified');
  if (verified === 'true') {
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      const msg = document.getElementById('login-msg');
      if (msg) { msg.style.color = '#34d399'; msg.textContent = '✅ Email verified! You can now login.'; }
    }, 100);
  } else if (verified === 'false') {
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      const msg = document.getElementById('login-msg');
      if (msg) { msg.style.color = '#f87171'; msg.textContent = '❌ Verification link is invalid or expired.'; }
    }, 100);
  }
})();

// ─── INIT ───────────────────────────────────────────
window.onload = async () => {
  if (token && currentUser) {
    try {
      const res = await fetch(`${API}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok || res.status === 404) {
        showApp();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        token = null;
        currentUser = null;
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('app-section').style.display = 'none';
      }
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      token = null;
      currentUser = null;
      document.getElementById('auth-section').style.display = 'flex';
      document.getElementById('app-section').style.display = 'none';
    }
  } else {
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
  }
};

// ─── AUTH TABS ──────────────────────────────────────
function showTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
}

// ─── REGISTER ───────────────────────────────────────
async function register() {
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const msg      = document.getElementById('reg-msg');
  if (!name || !email || !password) { msg.textContent = 'Please fill all fields!'; return; }
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) { msg.style.color = '#f87171'; msg.textContent = data.message; return; }
    msg.style.color = '#34d399';
    msg.textContent = '✅ Registered! Please check your email to verify your account.';
    document.getElementById('reg-name').value     = '';
    document.getElementById('reg-email').value    = '';
    document.getElementById('reg-password').value = '';
  } catch (err) {
    msg.textContent = 'Server error. Try again.';
  }
}

// ─── LOGIN ──────────────────────────────────────────
async function login() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const msg      = document.getElementById('login-msg');
  if (!email || !password) { msg.textContent = 'Please fill all fields!'; return; }
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.message; return; }
    token       = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    msg.textContent = 'Server error. Try again.';
  }
}

// ─── LOGOUT ─────────────────────────────────────────
function logout() {
  token = null;
  currentUser = null;
  currentUserRole = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('app-section').style.display  = 'none';
  document.getElementById('auth-section').style.display = 'flex';
  if (socket) socket.disconnect();
}

// ─── SHOW APP ───────────────────────────────────────
function showApp() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display  = 'block';
  document.getElementById('nav-user').textContent = `👋 ${currentUser.name}`;
  try {
    socket = io('https://projecthub-backend-scfj.onrender.com');
    socket.emit('joinUser', currentUser.id);
    socket.on('newNotification', () => loadNotifications());
  } catch (e) {
    console.error('Socket error:', e);
  }
  showDashboard();
  loadNotifications();
}

// ─── DASHBOARD ──────────────────────────────────────
function showDashboard() {
  document.getElementById('dashboard-section').style.display = 'block';
  document.getElementById('board-section').style.display     = 'none';
  document.getElementById('task-section').style.display      = 'none';
  loadProjects();
}

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '<p style="color:#475569;padding:20px">Loading...</p>';
  try {
    const res = await fetch(`${API}/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json();
      grid.innerHTML = `<p style="color:#f87171;padding:20px">${err.message || 'Failed to load projects.'}</p>`;
      return;
    }
    const projects = await res.json();
    if (!Array.isArray(projects)) {
      grid.innerHTML = '<p style="color:#f87171;padding:20px">Failed to load projects.</p>';
      return;
    }
    if (projects.length === 0) {
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>No projects yet. Create your first project!</p></div>`;
      return;
    }
    const projectsWithProgress = await Promise.all(projects.map(async p => {
      try {
        const pr = await fetch(`${API}/projects/${p._id}/progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!pr.ok) return { ...p, progress: { percent: 0, total: 0, done: 0 } };
        const progress = await pr.json();
        return { ...p, progress };
      } catch {
        return { ...p, progress: { percent: 0, total: 0, done: 0 } };
      }
    }));
    grid.innerHTML = projectsWithProgress.map(p => {
      const percent = p.progress?.percent || 0;
      const members = (p.members || []).map(m => m.user || m).filter(Boolean);
      const avatars = members.slice(0, 4).map(m => {
        const initials = m.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
        return `<div class="member-avatar" title="${m.name}">${initials}</div>`;
      }).join('');
      const extraMembers = members.length > 4
        ? `<div class="member-avatar" style="background:#475569">+${members.length - 4}</div>` : '';
      const myMembership = (p.members || []).find(m => {
        const uid = m.user?._id || m.user;
        return uid?.toString() === currentUser.id;
      });
      const iAmOwner = myMembership?.role === 'owner';
      return `
        <div class="project-card" onclick="openProject('${p._id}', '${p.name.replace(/'/g, "\\'")}')">
          <h3>
            ${p.name}
            ${iAmOwner
              ? '<span style="font-size:12px;background:#6366f1;color:white;padding:2px 8px;border-radius:12px;margin-left:6px">👑 Owner</span>'
              : '<span style="font-size:12px;background:#334155;color:#94a3b8;padding:2px 8px;border-radius:12px;margin-left:6px">Member</span>'
            }
          </h3>
          <p>${p.description || 'No description'}</p>
          <div class="member-avatars">${avatars}${extraMembers}</div>
          <div class="card-progress-label">${percent}% completed • ${p.progress?.done || 0}/${p.progress?.total || 0} tasks</div>
          <div class="card-progress-bar">
            <div class="card-progress-fill" style="width:${percent}%"></div>
          </div>
          <div class="project-card-footer">
            <span><i class="fas fa-user"></i> ${p.owner?.name || 'You'}</span>
            ${iAmOwner
              ? `<button class="btn-delete" onclick="event.stopPropagation(); deleteProject('${p._id}')">
                   <i class="fas fa-trash"></i>
                 </button>`
              : ''
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('loadProjects error:', err);
    grid.innerHTML = '<p style="color:#f87171;padding:20px">Failed to load projects.</p>';
  }
}

// ─── PROJECT MODAL ──────────────────────────────────
function openProjectModal() {
  document.getElementById('project-modal').style.display = 'flex';
}
function closeProjectModal() {
  document.getElementById('project-modal').style.display = 'none';
  document.getElementById('project-name').value = '';
  document.getElementById('project-desc').value = '';
}
async function createProject() {
  const name        = document.getElementById('project-name').value;
  const description = document.getElementById('project-desc').value;
  if (!name) return alert('Project name is required!');
  try {
    const res = await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, description })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    closeProjectModal();
    loadProjects();
  } catch (err) {
    alert('Failed to create project.');
  }
}
async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  try {
    const res = await fetch(`${API}/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    loadProjects();
  } catch (err) {
    alert('Failed to delete project.');
  }
}

// ─── FETCH AND APPLY ROLE ────────────────────────────
async function fetchAndApplyRole(projectId) {
  try {
    const res = await fetch(`${API}/projects/${projectId}/my-role`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    currentUserRole = data.role;
    applyRolePermissions();
  } catch (err) {
    console.error('Failed to fetch role', err);
  }
}
function applyRolePermissions() {
  const isOwner = currentUserRole === 'owner';
  const addTaskBtn = document.getElementById('add-task-btn');
  if (addTaskBtn) addTaskBtn.style.display = isOwner ? 'inline-flex' : 'none';
  const inviteBtn = document.getElementById('invite-btn');
  if (inviteBtn) inviteBtn.style.display = isOwner ? 'inline-flex' : 'none';
  const roleBadge = document.getElementById('role-badge');
  if (roleBadge) {
    roleBadge.textContent    = isOwner ? '👑 Owner' : '👤 Member';
    roleBadge.style.background = isOwner ? '#6366f1' : '#334155';
    roleBadge.style.color    = isOwner ? 'white' : '#94a3b8';
  }
}

// ─── INVITE MODAL ───────────────────────────────────
function openInviteModal() {
  document.getElementById('invite-modal').style.display = 'flex';
  document.getElementById('invite-email').value         = '';
  document.getElementById('invite-msg').textContent     = '';
}
function closeInviteModal() {
  document.getElementById('invite-modal').style.display = 'none';
}
async function inviteMember() {
  const email = document.getElementById('invite-email').value;
  const msg   = document.getElementById('invite-msg');
  if (!email) { msg.textContent = 'Please enter an email!'; return; }
  msg.style.color = '#6366f1';
  msg.textContent = '⏳ Checking...';
  try {
    const res = await fetch(`${API}/projects/${currentProject}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) { msg.style.color = '#f87171'; msg.textContent = data.message; return; }
    msg.style.color = '#34d399';
    msg.textContent = data.message;
    setTimeout(() => { closeInviteModal(); loadMembers(); loadProjects(); }, 1500);
  } catch (err) {
    msg.style.color = '#f87171';
    msg.textContent = 'Failed to invite member.';
  }
}

// ─── PROJECT BOARD ──────────────────────────────────
function openProject(id, name) {
  currentProject  = id;
  currentUserRole = null;
  document.getElementById('dashboard-section').style.display = 'none';
  document.getElementById('board-section').style.display     = 'block';
  document.getElementById('board-title').textContent         = name;
  clearFilters();
  if (socket) {
    socket.emit('joinProject', id);
    socket.off('taskUpdated');
    socket.on('taskUpdated', (data) => {
      if (data.projectId === currentProject) {
        loadTasks();
        loadProgress();
        loadActivity();
      }
    });
  }
  loadMembers();
  loadTasks();
  loadProgress();
  loadActivity();
  fetchAndApplyRole(id);
}

function showBoard() {
  document.getElementById('task-section').style.display  = 'none';
  document.getElementById('board-section').style.display = 'block';
  applyRolePermissions();
  loadTasks();
  loadProgress();
  loadActivity();
}

// ─── LOAD MEMBERS ───────────────────────────────────
async function loadMembers() {
  try {
    const res = await fetch(`${API}/projects/${currentProject}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const project = await res.json();
    currentProjectMembers = (project.members || []).map(m => ({
      ...(m.user || m),
      role: m.role
    }));
    const bar = document.getElementById('members-bar');
    if (!bar) return;
    bar.innerHTML = `<span class="members-bar-title"><i class="fas fa-users"></i> Members:</span>` +
      currentProjectMembers.map(m => {
        const initials  = m.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
        const roleColor = m.role === 'owner' ? '#6366f1' : '#475569';
        return `
          <div class="members-bar member-chip">
            <div class="member-avatar" style="width:24px;height:24px;font-size:10px;background:${roleColor}">${initials}</div>
            ${m.name} ${m.role === 'owner' ? '👑' : ''}
          </div>`;
      }).join('');
  } catch (err) {
    console.error('Failed to load members', err);
  }
}

// ─── LOAD PROGRESS ──────────────────────────────────
async function loadProgress() {
  try {
    const res = await fetch(`${API}/projects/${currentProject}/progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if (fill) fill.style.width = `${data.percent || 0}%`;
    if (text) text.textContent = `${data.percent || 0}% (${data.done || 0}/${data.total || 0} tasks done)`;
  } catch (err) {
    console.error('Failed to load progress', err);
  }
}

// ─── LOAD TASKS ─────────────────────────────────────
async function loadTasks() {
  ['todo', 'inprogress', 'done'].forEach(s => {
    document.getElementById(`tasks-${s}`).innerHTML = '';
    const el = document.getElementById(`count-${s}`);
    if (el) el.textContent = '0';
  });
  try {
    const res = await fetch(`${API}/tasks/${currentProject}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    allTasks = Array.isArray(data) ? data : [];
    renderTasks(allTasks);
  } catch (err) {
    console.error('Failed to load tasks', err);
  }
}

function renderTasks(tasks) {
  ['todo', 'inprogress', 'done'].forEach(s => {
    document.getElementById(`tasks-${s}`).innerHTML = '';
    const el = document.getElementById(`count-${s}`);
    if (el) el.textContent = '0';
  });
  if (!tasks.length) {
    document.getElementById('tasks-todo').innerHTML =
      '<div class="empty-state"><i class="fas fa-clipboard"></i><p>No tasks yet</p></div>';
    return;
  }
  const counts = { todo: 0, inprogress: 0, done: 0 };
  tasks.forEach(task => {
    const col = document.getElementById(`tasks-${task.status}`);
    if (!col) return;
    counts[task.status] = (counts[task.status] || 0) + 1;
    const card = document.createElement('div');
    card.className  = 'task-card';
    card.draggable  = true;
    card.dataset.id = task._id;
    const priorityColors = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
    const priorityEmoji  = { high: '🔴', medium: '🟡', low: '🟢' };
    const priority = task.priority || 'medium';
    let dueHTML = '';
    if (task.dueDate) {
      const due       = new Date(task.dueDate);
      const isOverdue = due < new Date() && task.status !== 'done';
      const formatted = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      dueHTML = `<span class="due-date ${isOverdue ? 'overdue' : ''}">
        <i class="fas fa-calendar"></i> ${formatted}
      </span>`;
    }
    const assignedHTML = task.assignedTo
      ? `<span style="font-size:11px;color:#94a3b8;margin-top:4px;display:block">
           <i class="fas fa-user"></i> ${task.assignedTo.name}
         </span>` : '';
    card.innerHTML = `
      <h4>${task.title}</h4>
      <p>${task.description || ''}</p>
      <div class="task-card-footer">
        <span class="badge ${priorityColors[priority]}">${priorityEmoji[priority]} ${priority}</span>
        ${dueHTML}
      </div>
      ${assignedHTML}
    `;
    card.addEventListener('dragstart', () => {
      draggedTaskId = task._id;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedTaskId = null;
    });
    card.addEventListener('click', () => openTask(task));
    col.appendChild(card);
  });
  Object.keys(counts).forEach(status => {
    const el = document.getElementById(`count-${status}`);
    if (el) el.textContent = counts[status];
  });
}

// ─── SEARCH & FILTER ────────────────────────────────
function filterTasks() {
  const search   = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
  const priority = document.getElementById('filter-priority')?.value || '';
  const status   = document.getElementById('filter-status')?.value || '';
  const filtered = allTasks.filter(task => {
    const matchSearch   = !search   || task.title.toLowerCase().includes(search) || (task.description || '').toLowerCase().includes(search);
    const matchPriority = !priority || task.priority === priority;
    const matchStatus   = !status   || task.status   === status;
    return matchSearch && matchPriority && matchStatus;
  });
  renderTasks(filtered);
  if (filtered.length === 0 && allTasks.length > 0) {
    document.getElementById('tasks-todo').innerHTML =
      '<div class="no-results"><i class="fas fa-search" style="font-size:24px;margin-bottom:8px;display:block"></i>No tasks match your filter.</div>';
  }
}
function clearFilters() {
  const s  = document.getElementById('search-input');
  const p  = document.getElementById('filter-priority');
  const st = document.getElementById('filter-status');
  if (s)  s.value  = '';
  if (p)  p.value  = '';
  if (st) st.value = '';
  if (allTasks.length > 0) renderTasks(allTasks);
}

// ─── DRAG & DROP ────────────────────────────────────
function allowDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}
async function dropTask(e, newStatus) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!draggedTaskId) return;
  const taskId  = draggedTaskId;
  draggedTaskId = null;
  try {
    await fetch(`${API}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    loadTasks();
    loadProgress();
    loadActivity();
    if (socket) socket.emit('taskUpdated', { projectId: currentProject });
  } catch (err) {
    alert('Failed to update task.');
    loadTasks();
  }
}
document.addEventListener('dragleave', (e) => {
  if (e.target.classList.contains('col-body')) {
    e.target.classList.remove('drag-over');
  }
});

// ─── TASK MODAL ─────────────────────────────────────
function openTaskModal() {
  document.getElementById('task-modal').style.display = 'flex';
}
function closeTaskModal() {
  document.getElementById('task-modal').style.display    = 'none';
  document.getElementById('task-title').value            = '';
  document.getElementById('task-desc').value             = '';
  document.getElementById('task-priority').value         = 'medium';
  document.getElementById('task-due').value              = '';
}
async function createTask() {
  const title       = document.getElementById('task-title').value;
  const description = document.getElementById('task-desc').value;
  const priority    = document.getElementById('task-priority').value;
  const dueDate     = document.getElementById('task-due').value;
  if (!title) return alert('Task title is required!');
  try {
    const res = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description, priority, dueDate, project: currentProject })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    closeTaskModal();
    loadTasks();
    loadProgress();
    loadActivity();
    if (socket) socket.emit('taskUpdated', { projectId: currentProject });
  } catch (err) {
    alert('Failed to create task.');
  }
}

// ─── EDIT TASK MODAL ────────────────────────────────
function openEditModal() {
  if (currentUserRole !== 'owner') {
    alert('🚫 Only the project owner can edit task details.');
    return;
  }
  document.getElementById('edit-title').value    = currentTask.title;
  document.getElementById('edit-desc').value     = currentTask.description || '';
  document.getElementById('edit-priority').value = currentTask.priority || 'medium';
  document.getElementById('edit-due').value      = currentTask.dueDate
    ? new Date(currentTask.dueDate).toISOString().split('T')[0] : '';
  document.getElementById('edit-modal').style.display = 'flex';
}
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}
async function saveEdit() {
  const title       = document.getElementById('edit-title').value;
  const description = document.getElementById('edit-desc').value;
  const priority    = document.getElementById('edit-priority').value;
  const dueDate     = document.getElementById('edit-due').value;
  if (!title) return alert('Title is required!');
  try {
    const res = await fetch(`${API}/tasks/${currentTask._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description, priority, dueDate })
    });
    const updated = await res.json();
    if (!res.ok) return alert(updated.message);
    currentTask = { ...currentTask, ...updated };
    document.getElementById('task-detail-title').textContent    = updated.title;
    document.getElementById('task-detail-desc').textContent     = updated.description || 'No description';
    document.getElementById('task-detail-priority').textContent =
      updated.priority === 'high' ? '🔴 High' : updated.priority === 'low' ? '🟢 Low' : '🟡 Medium';
    document.getElementById('task-detail-due').textContent =
      updated.dueDate ? `📅 ${new Date(updated.dueDate).toLocaleDateString('en-IN')}` : '📅 No due date';
    closeEditModal();
    if (socket) socket.emit('taskUpdated', { projectId: currentProject });
  } catch (err) {
    alert('Failed to save changes.');
  }
}

// ─── TASK DETAIL ────────────────────────────────────
function openTask(task) {
  currentTask = task;
  document.getElementById('board-section').style.display = 'none';
  document.getElementById('task-section').style.display  = 'block';
  document.getElementById('task-detail-title').textContent    = task.title;
  document.getElementById('task-detail-desc').textContent     = task.description || 'No description';
  document.getElementById('task-detail-status').textContent   = `📌 ${task.status}`;
  document.getElementById('task-detail-priority').textContent =
    task.priority === 'high' ? '🔴 High' : task.priority === 'low' ? '🟢 Low' : '🟡 Medium';
  document.getElementById('task-detail-due').textContent =
    task.dueDate ? `📅 ${new Date(task.dueDate).toLocaleDateString('en-IN')}` : '📅 No due date';
  document.getElementById('task-detail-assigned').textContent =
    task.assignedTo ? `👤 ${task.assignedTo.name}` : '👤 Unassigned';
  const assignSection = document.getElementById('assign-section');
  if (assignSection) assignSection.style.display = currentUserRole === 'owner' ? 'block' : 'none';
  const select = document.getElementById('assign-select');
  if (select) {
    select.innerHTML = '<option value="">Unassigned</option>' +
      currentProjectMembers.map(m =>
        `<option value="${m._id}" ${task.assignedTo?._id === m._id ? 'selected' : ''}>${m.name}</option>`
      ).join('');
  }
  const deleteBtn = document.getElementById('delete-task-btn');
  if (deleteBtn) deleteBtn.style.display = currentUserRole === 'owner' ? 'inline-flex' : 'none';
  const editBtn = document.getElementById('edit-task-btn');
  if (editBtn) editBtn.style.display = currentUserRole === 'owner' ? 'inline-flex' : 'none';
  renderAttachments(task.attachments || []);
  const commentsList = document.getElementById('comments-list');
  commentsList.innerHTML = task.comments?.length
    ? task.comments.map(c => `<div class="comment-item">💬 ${c.text}</div>`).join('')
    : '<p style="color:#475569;font-size:13px">No comments yet.</p>';
}

// ─── ASSIGN TASK ────────────────────────────────────
async function assignTask() {
  const assignedTo = document.getElementById('assign-select').value;
  try {
    await fetch(`${API}/tasks/${currentTask._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ assignedTo: assignedTo || null })
    });
    const member = currentProjectMembers.find(m => m._id === assignedTo);
    document.getElementById('task-detail-assigned').textContent =
      member ? `👤 ${member.name}` : '👤 Unassigned';
    if (socket) socket.emit('taskUpdated', { projectId: currentProject });
  } catch (err) {
    alert('Failed to assign task.');
  }
}

async function updateStatus(status) {
  try {
    await fetch(`${API}/tasks/${currentTask._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    currentTask.status = status;
    document.getElementById('task-detail-status').textContent = `📌 ${status}`;
    if (socket) socket.emit('taskUpdated', { projectId: currentProject });
    alert(`✅ Status updated to: ${status}`);
  } catch (err) {
    alert('Failed to update status.');
  }
}

async function deleteCurrentTask() {
  if (!confirm('Delete this task?')) return;
  try {
    const res = await fetch(`${API}/tasks/${currentTask._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    showBoard();
    if (socket) socket.emit('taskUpdated', { projectId: currentProject });
  } catch (err) {
    alert('Failed to delete task.');
  }
}

async function addComment() {
  const text = document.getElementById('comment-text').value;
  if (!text) return;
  try {
    const res = await fetch(`${API}/tasks/${currentTask._id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text })
    });
    const updated = await res.json();
    if (!res.ok) return alert(updated.message);
    currentTask = updated;
    document.getElementById('comment-text').value = '';
    document.getElementById('comments-list').innerHTML =
      updated.comments.map(c => `<div class="comment-item">💬 ${c.text}</div>`).join('');
    if (socket) socket.emit('taskUpdated', { projectId: currentProject });
  } catch (err) {
    alert('Failed to add comment.');
  }
}

// ─── ACTIVITY LOG (PAGINATED) ────────────────────────
async function loadActivity(page = 1) {
  activityPage = page;
  try {
    const res = await fetch(`${API}/activity/${currentProject}?page=${page}&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data       = await res.json();
    const activities = Array.isArray(data.activities) ? data.activities : [];
    const pagination = data.pagination || { page: 1, totalPages: 1, hasNext: false, hasPrev: false };
    activityTotalPages = pagination.totalPages;
    const list = document.getElementById('activity-list');
    const pag  = document.getElementById('activity-pagination');
    if (!list) return;
    if (!activities.length && page === 1) {
      list.innerHTML = '<p class="activity-empty">No activity yet.</p>';
      if (pag) pag.innerHTML = '';
      return;
    }
    list.innerHTML = activities.map(a => {
      const initials = a.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
      const time     = new Date(a.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
      const actionEmoji = {
        'created task':      '✅',
        'moved task':        '🔀',
        'deleted task':      '🗑️',
        'commented on task': '💬'
      }[a.action] || '📌';
      return `
        <div class="activity-item">
          <div class="activity-avatar">${initials}</div>
          <div class="activity-text">
            <strong>${a.user?.name || 'Someone'}</strong>
            ${actionEmoji} ${a.action}
            <span class="activity-task">"${a.taskTitle || ''}"</span>
            ${a.detail ? `<br><span style="color:#475569;font-size:11px">${a.detail}</span>` : ''}
          </div>
          <div class="activity-time">${time}</div>
        </div>`;
    }).join('');
    if (pag) {
      pag.innerHTML = `
        <button class="pag-btn" onclick="loadActivity(${page - 1})" ${!pagination.hasPrev ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pag-info">Page ${pagination.page} of ${pagination.totalPages}</span>
        <button class="pag-btn" onclick="loadActivity(${page + 1})" ${!pagination.hasNext ? 'disabled' : ''}>
          <i class="fas fa-chevron-right"></i>
        </button>
      `;
    }
  } catch (err) {
    console.error('Activity log error:', err);
  }
}

// ─── NOTIFICATIONS ──────────────────────────────────
let notifPanelOpen = false;

async function loadNotifications() {
  try {
    const res  = await fetch(`${API}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data          = await res.json();
    const notifications = Array.isArray(data) ? data : [];
    renderNotifications(notifications);
    updateBadge(notifications.filter(n => !n.isRead).length);
  } catch (err) {
    console.error('Failed to load notifications', err);
  }
}

function renderNotifications(notifications) {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash" style="font-size:24px;display:block;margin-bottom:8px"></i>No notifications yet</div>';
    return;
  }
  const typeIcons = {
    task_assigned:  'fa-user-check',
    comment_added:  'fa-comment',
    task_moved:     'fa-arrows-alt',
    member_invited: 'fa-user-plus'
  };
  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.isRead ? '' : 'unread'}" id="notif-${n._id}">
      <div class="notif-icon ${n.type}">
        <i class="fas ${typeIcons[n.type] || 'fa-bell'}"></i>
      </div>
      <div class="notif-content" onclick="markAsRead('${n._id}')">
        <div class="notif-message">${n.message}</div>
        <div class="notif-time">${timeAgo(new Date(n.createdAt))}</div>
      </div>
      <button class="notif-delete" onclick="deleteNotif('${n._id}')" title="Dismiss">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

function updateBadge(count) {
  const badge = document.getElementById('notif-badge');
  const bell  = document.getElementById('bell-btn');
  if (!badge || !bell) return;
  if (count > 0) {
    badge.style.display = 'flex';
    badge.textContent   = count > 99 ? '99+' : count;
    bell.classList.add('has-unread');
  } else {
    badge.style.display = 'none';
    bell.classList.remove('has-unread');
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  notifPanelOpen = !notifPanelOpen;
  panel.style.display = notifPanelOpen ? 'block' : 'none';
  if (notifPanelOpen) loadNotifications();
}

async function markAsRead(id) {
  try {
    await fetch(`${API}/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    document.getElementById(`notif-${id}`)?.classList.remove('unread');
    updateBadge(document.querySelectorAll('.notif-item.unread').length);
  } catch (err) {
    console.error('Failed to mark as read', err);
  }
}

async function markAllRead() {
  try {
    await fetch(`${API}/notifications/mark-all-read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    document.querySelectorAll('.notif-item').forEach(el => el.classList.remove('unread'));
    updateBadge(0);
  } catch (err) {
    console.error('Failed to mark all read', err);
  }
}

async function deleteNotif(id) {
  try {
    await fetch(`${API}/notifications/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    document.getElementById(`notif-${id}`)?.remove();
    updateBadge(document.querySelectorAll('.notif-item.unread').length);
  } catch (err) {
    console.error('Failed to delete notification', err);
  }
}

// ─── TIME AGO HELPER ─────────────────────────────────
function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60)    return 'just now';
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── CLOSE NOTIF PANEL ON OUTSIDE CLICK ─────────────
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('notif-wrapper');
  if (wrapper && !wrapper.contains(e.target) && notifPanelOpen) {
    document.getElementById('notif-panel').style.display = 'none';
    notifPanelOpen = false;
  }
});

// ─── GLOBAL SEARCH ──────────────────────────────────
let searchTimeout = null;

function showSearchPanel() {
  const input = document.getElementById('global-search-input');
  if (input.value.trim().length >= 2) {
    document.getElementById('search-results-panel').style.display = 'block';
  }
}

function clearGlobalSearch() {
  document.getElementById('global-search-input').value          = '';
  document.getElementById('search-results-panel').style.display = 'none';
  document.getElementById('btn-search-clear').style.display     = 'none';
}

function globalSearch() {
  const q        = document.getElementById('global-search-input').value.trim();
  const panel    = document.getElementById('search-results-panel');
  const clearBtn = document.getElementById('btn-search-clear');
  clearBtn.style.display = q.length > 0 ? 'flex' : 'none';
  if (q.length < 2) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  panel.innerHTML     = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => performSearch(q), 400);
}

async function performSearch(q) {
  const panel = document.getElementById('search-results-panel');
  try {
    const res  = await fetch(`${API}/search?q=${encodeURIComponent(q)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.total === 0) {
      panel.innerHTML = `
        <div class="search-empty">
          <i class="fas fa-search" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4"></i>
          No results found for "<strong>${q}</strong>"
        </div>`;
      return;
    }
    let html = '';
    if (data.projects.length > 0) {
      html += '<div class="search-section-title"><i class="fas fa-folder"></i> Projects</div>';
      html += data.projects.map(p => `
        <div class="search-result-item" onclick="openProjectFromSearch('${p._id}', '${p.name.replace(/'/g, "\\'")}')">
          <div class="search-result-icon project"><i class="fas fa-folder"></i></div>
          <div class="search-result-info">
            <div class="search-result-name">${highlightMatch(p.name, q)}</div>
            <div class="search-result-sub">${p.description || 'No description'} • by ${p.owner?.name || 'You'}</div>
          </div>
        </div>
      `).join('');
    }
    if (data.tasks.length > 0) {
      html += '<div class="search-section-title"><i class="fas fa-tasks"></i> Tasks</div>';
      html += data.tasks.map(t => `
        <div class="search-result-item" onclick="openProjectFromSearch('${t.project?._id}', '${(t.project?.name || '').replace(/'/g, "\\'")}')">
          <div class="search-result-icon task"><i class="fas fa-check-square"></i></div>
          <div class="search-result-info">
            <div class="search-result-name">${highlightMatch(t.title, q)}</div>
            <div class="search-result-sub">in <strong>${t.project?.name || 'Unknown'}</strong></div>
          </div>
          <span class="search-result-badge ${t.status}">${t.status}</span>
        </div>
      `).join('');
    }
    if (data.users.length > 0) {
      html += '<div class="search-section-title"><i class="fas fa-users"></i> People</div>';
      html += data.users.map(u => {
        const initials = u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
        return `
          <div class="search-result-item">
            <div class="search-result-icon user">${initials}</div>
            <div class="search-result-info">
              <div class="search-result-name">${highlightMatch(u.name, q)}</div>
              <div class="search-result-sub">${u.email}</div>
            </div>
          </div>
        `;
      }).join('');
    }
    panel.innerHTML = html;
  } catch (err) {
    panel.innerHTML = '<div class="search-empty">Search failed. Try again.</div>';
  }
}

function highlightMatch(text, query) {
  if (!text) return '';
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark style="background:rgba(99,102,241,0.3);color:inherit;border-radius:2px;padding:0 2px">$1</mark>');
}

function openProjectFromSearch(id, name) {
  clearGlobalSearch();
  openProject(id, name);
}

document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('global-search-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    document.getElementById('search-results-panel').style.display = 'none';
  }
});

// ─── FILE ATTACHMENTS ────────────────────────────────
function getFileIcon(mimetype) {
  if (!mimetype) return { icon: 'fa-file', cls: 'other' };
  if (mimetype.startsWith('image/'))                             return { icon: 'fa-image',       cls: 'image' };
  if (mimetype === 'application/pdf')                            return { icon: 'fa-file-pdf',     cls: 'pdf'   };
  if (mimetype.includes('word'))                                 return { icon: 'fa-file-word',    cls: 'doc'   };
  if (mimetype.includes('excel') || mimetype.includes('sheet')) return { icon: 'fa-file-excel',   cls: 'sheet' };
  if (mimetype === 'application/zip')                            return { icon: 'fa-file-archive', cls: 'zip'   };
  return { icon: 'fa-file', cls: 'other' };
}

function formatFileSize(bytes) {
  if (!bytes)          return '0 B';
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function renderAttachments(attachments) {
  const list = document.getElementById('attachments-list');
  if (!list) return;
  if (!attachments || !attachments.length) {
    list.innerHTML = '<p style="color:var(--text-faint);font-size:13px;margin-bottom:8px">No attachments yet.</p>';
    return;
  }
  list.innerHTML = attachments.map(a => {
    const { icon, cls } = getFileIcon(a.mimetype);
    const size = formatFileSize(a.size);
    const date = new Date(a.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `
      <div class="attachment-item" id="attachment-${a._id}">
        <div class="attachment-icon ${cls}"><i class="fas ${icon}"></i></div>
        <div class="attachment-info">
          <div class="attachment-name" title="${a.originalName}">${a.originalName}</div>
          <div class="attachment-meta">${size} • ${date}</div>
        </div>
        <div class="attachment-actions">
          <button class="btn-download" onclick="downloadFile('${a.filename}', '${a.originalName.replace(/'/g, "\\'")}')">
            <i class="fas fa-download"></i>
          </button>
          <button class="btn-attachment-delete" onclick="deleteAttachment('${currentTask._id}', '${a._id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function uploadFile() {
  const input  = document.getElementById('file-input');
  const status = document.getElementById('upload-status');
  if (!input.files[0]) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    status.className  = 'upload-status error';
    status.textContent = '❌ File too large! Max 5MB.';
    return;
  }
  status.className  = 'upload-status loading';
  status.textContent = '⏳ Uploading...';
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res  = await fetch(`${API}/upload/task/${currentTask._id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      status.className  = 'upload-status error';
      status.textContent = `❌ ${data.message}`;
      return;
    }
    status.className  = 'upload-status success';
    status.textContent = '✅ Uploaded!';
    currentTask = data.task;
    renderAttachments(data.task.attachments);
    input.value = '';
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch (err) {
    status.className  = 'upload-status error';
    status.textContent = '❌ Upload failed. Try again.';
  }
}

function downloadFile(filename, originalName) {
  const a    = document.createElement('a');
  a.href     = `https://projecthub-backend-scfj.onrender.com/uploads/${filename}`;
  a.download = originalName;
  a.target   = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function deleteAttachment(taskId, attachmentId) {
  if (!confirm('Delete this attachment?')) return;
  try {
    const res  = await fetch(`${API}/upload/task/${taskId}/attachment/${attachmentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    currentTask = data.task;
    renderAttachments(data.task.attachments);
    document.getElementById(`attachment-${attachmentId}`)?.remove();
  } catch (err) {
    alert('Failed to delete attachment.');
  }
}

// ─── ANALYTICS ──────────────────────────────────────
let chartStatus   = null;
let chartPriority = null;
let chartTimeline = null;

async function openAnalytics() {
  document.getElementById('analytics-modal').style.display = 'flex';
  try {
    const res = await fetch(`${API}/analytics/${currentProject}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('stat-total').textContent   = data.total;
    document.getElementById('stat-done').textContent    = data.done;
    document.getElementById('stat-overdue').textContent = data.overdue;
    document.getElementById('stat-rate').textContent    = `${data.completionRate}%`;
    if (chartStatus)   { chartStatus.destroy();   chartStatus   = null; }
    if (chartPriority) { chartPriority.destroy(); chartPriority = null; }
    if (chartTimeline) { chartTimeline.destroy(); chartTimeline = null; }
    const isDark     = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    chartStatus = new Chart(document.getElementById('chart-status'), {
      type: 'doughnut',
      data: {
        labels: ['To Do', 'In Progress', 'Done'],
        datasets: [{
          data: [data.byStatus.todo, data.byStatus.inprogress, data.byStatus.done],
          backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
          borderWidth: 0, hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { color: labelColor, padding: 16, font: { size: 12 } } } }
      }
    });
    chartPriority = new Chart(document.getElementById('chart-priority'), {
      type: 'bar',
      data: {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
          label: 'Tasks',
          data: [data.byPriority.low, data.byPriority.medium, data.byPriority.high],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderRadius: 8, borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } },
          x: { ticks: { color: labelColor }, grid: { display: false } }
        }
      }
    });
    chartTimeline = new Chart(document.getElementById('chart-timeline'), {
      type: 'line',
      data: {
        labels: data.last7Days.map(d => d.date),
        datasets: [{
          label: 'Tasks Completed',
          data: data.last7Days.map(d => d.count),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          tension: 0.4, fill: true,
          pointBackgroundColor: '#6366f1',
          pointRadius: 5, pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } },
          x: { ticks: { color: labelColor }, grid: { display: false } }
        }
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
  }
}

function closeAnalytics() {
  document.getElementById('analytics-modal').style.display = 'none';
}