// Serveur TIJARA — Multi-utilisateurs + Abonnements + Super Admin
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// ── Helpers ──────────────────────────────────────────────────
function ensureDataDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }

function loadUsers() {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch(e) {}
  return [];
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'tijara_salt_2026').digest('hex');
}

function calcSubscriptionEnd(type) {
  const now = new Date();
  if (type === 'trial_30') { now.setDate(now.getDate() + 30); return now.toISOString(); }
  if (type === 'annual')   { now.setFullYear(now.getFullYear() + 1); return now.toISOString(); }
  if (type === 'lifetime') return null;
  return null;
}

function getSubscriptionInfo(user) {
  if (user.role === 'super') return { active: true, unlimited: true };
  if (user.subscriptionType === 'lifetime') return { active: true, unlimited: true, lifetime: true, subscriptionType: 'lifetime' };
  if (!user.subscriptionEnd) return { active: false, noSubscription: true };
  const now = Date.now();
  const end = new Date(user.subscriptionEnd).getTime();
  const daysLeft = Math.ceil((end - now) / 86400000);
  return {
    active: daysLeft > 0,
    expired: daysLeft <= 0,
    daysLeft: Math.max(0, daysLeft),
    subscriptionEnd: user.subscriptionEnd,
    subscriptionType: user.subscriptionType || null
  };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) reject(new Error('Too large')); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch(e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function getBasicAuth(req) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Basic ')) return null;
  try {
    const [user, ...rest] = Buffer.from(header.slice(6), 'base64').toString().split(':');
    return { username: user, password: rest.join(':') };
  } catch(e) { return null; }
}

function checkBasicAuth(req) {
  const creds = getBasicAuth(req);
  if (!creds) return null;
  const users = loadUsers();
  const user = users.find(u => u.username === creds.username);
  if (!user) return null;
  if (user.password !== hashPassword(creds.password)) return null;
  return user;
}

function getSessionUser(req) {
  // Session via cookie
  const cookies = req.headers['cookie'] || '';
  const match = cookies.match(/tijara_session=([^;]+)/);
  if (!match) return null;
  try {
    const session = JSON.parse(Buffer.from(match[1], 'base64').toString());
    const users = loadUsers();
    const user = users.find(u => u.id === session.id && u.username === session.username);
    return user || null;
  } catch(e) { return null; }
}

function makeSessionCookie(user) {
  const session = Buffer.from(JSON.stringify({ id: user.id, username: user.username })).toString('base64');
  return `tijara_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function sendHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
}

function sendRedirect(res, location) {
  res.writeHead(302, { 'Location': location });
  res.end();
}

// ── Init utilisateurs ─────────────────────────────────────────
function initUsers() {
  ensureDataDir();
  const users = loadUsers();
  if (users.length === 0) {
    const superPass = process.env.SUPER_PASSWORD || 'TijaraSuper2026!';
    const adminPass = process.env.TIJARA_PASSWORD || process.env.ADMIN_PASSWORD || 'TijaraAdmin2026!';
    const adminUser = process.env.TIJARA_USER || process.env.ADMIN_USER || 'admin';
    saveUsers([
      {
        id: 1,
        username: 'super',
        email: 'super@tijara.ma',
        password: hashPassword(superPass),
        role: 'super',
        nom: 'Super Admin',
        createdAt: new Date().toISOString(),
        subscriptionType: 'lifetime',
        subscriptionEnd: null
      },
      {
        id: 2,
        username: adminUser,
        email: 'admin@tijara.ma',
        password: hashPassword(adminPass),
        role: 'admin',
        nom: 'Administrateur',
        createdAt: new Date().toISOString(),
        subscriptionType: 'trial_30',
        subscriptionEnd: calcSubscriptionEnd('trial_30')
      }
    ]);
    console.log('✅ Super Admin : username=super / password=' + superPass);
    console.log('✅ Admin       : username=' + adminUser + ' / password=' + adminPass);
  } else {
    // S'assurer que le super admin existe
    let changed = false;
    if (!users.find(u => u.role === 'super')) {
      const superPass = process.env.SUPER_PASSWORD || 'TijaraSuper2026!';
      users.unshift({
        id: Date.now(),
        username: 'super',
        email: 'super@tijara.ma',
        password: hashPassword(superPass),
        role: 'super',
        nom: 'Super Admin',
        createdAt: new Date().toISOString(),
        subscriptionType: 'lifetime',
        subscriptionEnd: null
      });
      changed = true;
    } else if (process.env.SUPER_PASSWORD) {
      const su = users.find(u => u.role === 'super');
      su.password = hashPassword(process.env.SUPER_PASSWORD);
      changed = true;
    }
    if (changed) saveUsers(users);
  }
}

// ── Login page ────────────────────────────────────────────────
function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TIJARA — Connexion</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<style>body{background:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;}.card{background:#1e293b;border:1px solid #334155;color:#e2e8f0;max-width:380px;width:90%;}</style>
</head>
<body>
<div class="card p-4 shadow-lg">
  <h4 class="fw-bold mb-1 text-white text-center">TIJARA</h4>
  <p class="text-muted text-center small mb-4">Connexion à votre espace</p>
  ${error ? `<div class="alert alert-danger py-2 small">${error}</div>` : ''}
  <form method="POST" action="/login">
    <div class="mb-3"><label class="form-label small">Identifiant</label><input name="username" class="form-control bg-dark border-secondary text-white" required autofocus></div>
    <div class="mb-4"><label class="form-label small">Mot de passe</label><input type="password" name="password" class="form-control bg-dark border-secondary text-white" required></div>
    <button type="submit" class="btn btn-primary w-100">Se connecter</button>
  </form>
</div>
</body>
</html>`;
}

// ── Subscription expired page ─────────────────────────────────
function subscriptionExpiredPage(user) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Abonnement expiré — TIJARA</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<style>body{background:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;}.card{background:#1e293b;border:1px solid #334155;color:#e2e8f0;max-width:460px;width:90%;text-align:center;}</style>
</head>
<body>
<div class="card p-5 shadow-lg">
  <div style="font-size:3rem;">⏰</div>
  <h4 class="fw-bold mt-3 text-white">Abonnement expiré</h4>
  <p class="text-muted mt-2 mb-4">Votre abonnement TIJARA a expiré. Contactez l'administrateur pour renouveler votre accès.</p>
  <a href="/logout" class="btn btn-outline-light btn-sm">Se déconnecter</a>
  <p class="mt-4 small text-muted">TIJARA · support@tijara.ma</p>
</div>
</body>
</html>`;
}

// ── Super Admin page ──────────────────────────────────────────
function superAdminPage() {
  const users = loadUsers();
  const adminUsers = users.filter(u => u.role !== 'super');
  const now = Date.now();

  const rows = adminUsers.map(u => {
    const sub = getSubscriptionInfo(u);
    let subBadge = '';
    if (sub.unlimited && sub.lifetime) subBadge = '<span class="badge" style="background:#7c3aed">À vie</span>';
    else if (sub.expired || sub.noSubscription) subBadge = '<span class="badge bg-danger">Expiré/Inactif</span>';
    else subBadge = `<span class="badge bg-success">${sub.daysLeft}j restants</span>`;

    const typeBadge = u.subscriptionType
      ? `<span class="badge ${u.subscriptionType==='trial_30'?'bg-info':u.subscriptionType==='annual'?'bg-success':u.subscriptionType==='lifetime'?'bg-purple':''}" style="${u.subscriptionType==='lifetime'?'background:#7c3aed':''}">${u.subscriptionType==='trial_30'?'Essai 30j':u.subscriptionType==='annual'?'Annuel':'À vie'}</span>`
      : '<span class="badge bg-secondary">Non défini</span>';

    const expDate = u.subscriptionType === 'lifetime' ? '∞' : (u.subscriptionEnd ? new Date(u.subscriptionEnd).toLocaleDateString('fr-MA') : '—');

    return `<tr>
      <td><strong>${u.nom||u.username}</strong><br><small class="text-muted">${u.username}</small></td>
      <td class="small text-muted">${u.email||'—'}</td>
      <td>${typeBadge}</td>
      <td>${subBadge}</td>
      <td class="small">${expDate}</td>
      <td>
        <div class="d-flex gap-1 flex-wrap">
          <button class="btn btn-sm btn-primary" onclick="openSubModal('${u.id}','${(u.nom||u.username).replace(/'/g,"\\'")}')">Abonnement</button>
          <button class="btn btn-sm btn-warning" onclick="resetPassword('${u.id}','${(u.nom||u.username).replace(/'/g,"\\'")}')">MDP</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}','${(u.nom||u.username).replace(/'/g,"\\'")}')">Supprimer</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TIJARA — Super Admin</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
body{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;}
.navbar{background:#1e293b!important;border-bottom:1px solid #334155;}
.card{background:#1e293b;border:1px solid #334155;color:#e2e8f0;}
.card-header{background:#263248!important;border-bottom:1px solid #334155;color:#e2e8f0;}
.table{color:#e2e8f0;}.table th{color:#94a3b8;font-size:.72rem;text-transform:uppercase;border-color:#334155;}
.table td{border-color:#263248;vertical-align:middle;}
.table-hover tbody tr:hover td{background:#263248;}
.form-control,.form-select{background:#0f172a;border:1px solid #334155;color:#e2e8f0;}
.form-control:focus,.form-select:focus{background:#0f172a;border-color:#3b82f6;color:#e2e8f0;box-shadow:none;}
.form-select option{background:#0f172a;}
.modal-content{background:#1e293b;border:1px solid #334155;color:#e2e8f0;}
.modal-header,.modal-footer{border-color:#334155;}
.btn-close{filter:invert(1);}
</style>
</head>
<body>
<nav class="navbar navbar-dark navbar-expand-lg">
  <div class="container-fluid px-4">
    <span class="navbar-brand fw-bold">TIJARA <span class="text-warning small">SUPER ADMIN</span></span>
    <div class="d-flex gap-2">
      <a href="/" class="btn btn-outline-secondary btn-sm">← App</a>
      <a href="/logout" class="btn btn-outline-warning btn-sm">Déconnexion</a>
    </div>
  </div>
</nav>

<div class="container py-4">
  <h4 class="fw-bold mb-1">Panneau Super Administrateur</h4>
  <p class="text-muted small mb-4">Gérez tous les comptes et abonnements TIJARA</p>

  <!-- Stats -->
  <div class="row mb-4">
    <div class="col-6 col-md-3 mb-2"><div class="card text-center p-3"><div class="fs-2 fw-bold text-primary">${adminUsers.length}</div><div class="small text-muted">Total comptes</div></div></div>
    <div class="col-6 col-md-3 mb-2"><div class="card text-center p-3"><div class="fs-2 fw-bold text-success">${adminUsers.filter(u=>{const s=getSubscriptionInfo(u);return s.active&&!s.expired;}).length}</div><div class="small text-muted">Actifs</div></div></div>
    <div class="col-6 col-md-3 mb-2"><div class="card text-center p-3"><div class="fs-2 fw-bold text-danger">${adminUsers.filter(u=>{const s=getSubscriptionInfo(u);return s.expired||s.noSubscription;}).length}</div><div class="small text-muted">Expirés</div></div></div>
    <div class="col-6 col-md-3 mb-2"><div class="card text-center p-3"><div class="fs-2 fw-bold" style="color:#7c3aed;">${adminUsers.filter(u=>u.subscriptionType==='lifetime').length}</div><div class="small text-muted">À vie</div></div></div>
  </div>

  <!-- Créer un compte -->
  <div class="card mb-4">
    <div class="card-header fw-bold">➕ Créer un compte</div>
    <div class="card-body">
      <div id="add-alert"></div>
      <div class="row g-2 align-items-end">
        <div class="col-md-2"><label class="form-label small fw-bold">Identifiant</label><input id="new-username" class="form-control" placeholder="ahmed_benali"></div>
        <div class="col-md-2"><label class="form-label small fw-bold">Nom complet</label><input id="new-nom" class="form-control" placeholder="Ahmed Benali"></div>
        <div class="col-md-3"><label class="form-label small fw-bold">Email</label><input id="new-email" type="email" class="form-control" placeholder="ahmed@societe.ma"></div>
        <div class="col-md-2"><label class="form-label small fw-bold">Mot de passe</label><input id="new-password" type="password" class="form-control" placeholder="Min. 6 car."></div>
        <div class="col-md-2">
          <label class="form-label small fw-bold">Abonnement</label>
          <select id="new-sub" class="form-select">
            <option value="trial_30">Essai 30j</option>
            <option value="annual">Annuel</option>
            <option value="lifetime">À vie</option>
          </select>
        </div>
        <div class="col-md-1"><button class="btn btn-primary w-100" onclick="createUser()">➕</button></div>
      </div>
    </div>
  </div>

  <!-- Liste des comptes -->
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center fw-bold">
      <span>👥 Comptes utilisateurs (${adminUsers.length})</span>
      <a href="/superadmin" class="btn btn-outline-secondary btn-sm">🔄 Actualiser</a>
    </div>
    <div class="card-body p-0">
      <div id="users-alert" class="mx-3 mt-3"></div>
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead><tr><th>Nom / Identifiant</th><th>Email</th><th>Type abonnement</th><th>Statut</th><th>Expiration</th><th>Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="text-center py-4 text-muted">Aucun compte utilisateur</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- Modal abonnement -->
<div class="modal fade" id="subModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Assigner un abonnement</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div id="sub-alert"></div>
        <p class="small text-muted mb-3">Utilisateur : <strong id="sub-user-name" class="text-light"></strong></p>
        <div class="d-flex flex-column gap-2">
          <label class="border border-secondary p-3 d-flex align-items-center gap-3" style="cursor:pointer;border-radius:4px;">
            <input type="radio" name="sub-type" value="trial_30" class="form-check-input mt-0">
            <div><div class="fw-bold">Essai 30 jours</div><div class="small text-muted">Accès pendant 30 jours depuis maintenant</div></div>
          </label>
          <label class="border border-secondary p-3 d-flex align-items-center gap-3" style="cursor:pointer;border-radius:4px;">
            <input type="radio" name="sub-type" value="annual" class="form-check-input mt-0">
            <div><div class="fw-bold">Annuel</div><div class="small text-muted">Accès pendant 365 jours depuis maintenant</div></div>
          </label>
          <label class="border border-secondary p-3 d-flex align-items-center gap-3" style="cursor:pointer;border-radius:4px;">
            <input type="radio" name="sub-type" value="lifetime" class="form-check-input mt-0">
            <div><div class="fw-bold">À vie</div><div class="small text-muted">Accès permanent sans expiration</div></div>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
        <button class="btn btn-primary" onclick="confirmSub()">Assigner</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script>
let subUserId = null;
let subModalInst = new bootstrap.Modal(document.getElementById('subModal'));

function openSubModal(id, nom) {
  subUserId = id;
  document.getElementById('sub-user-name').textContent = nom;
  document.getElementById('sub-alert').innerHTML = '';
  document.querySelectorAll('input[name="sub-type"]').forEach(r => r.checked = false);
  subModalInst.show();
}

async function confirmSub() {
  const type = document.querySelector('input[name="sub-type"]:checked')?.value;
  if (!type) { showAlert('sub-alert', 'Sélectionnez un type d\\'abonnement', 'danger'); return; }
  const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: subUserId, type }) });
  const d = await r.json();
  if (!r.ok) { showAlert('sub-alert', d.error, 'danger'); return; }
  subModalInst.hide();
  setTimeout(() => location.reload(), 500);
}

async function createUser() {
  const username = document.getElementById('new-username').value.trim();
  const nom = document.getElementById('new-nom').value.trim();
  const email = document.getElementById('new-email').value.trim();
  const password = document.getElementById('new-password').value;
  const sub = document.getElementById('new-sub').value;
  if (!username || !nom || !email || !password) { showAlert('add-alert', 'Remplissez tous les champs', 'danger'); return; }
  if (password.length < 6) { showAlert('add-alert', 'Mot de passe trop court (min 6 caractères)', 'danger'); return; }
  const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, nom, email, password, subscriptionType: sub }) });
  const d = await r.json();
  if (!r.ok) { showAlert('add-alert', d.error, 'danger'); return; }
  showAlert('add-alert', 'Compte créé pour ' + nom, 'success');
  setTimeout(() => location.reload(), 1200);
}

async function resetPassword(id, nom) {
  const pwd = prompt('Nouveau mot de passe pour ' + nom + ' (min. 6 caractères) :');
  if (!pwd) return;
  if (pwd.length < 6) { alert('Mot de passe trop court'); return; }
  const r = await fetch('/api/users/' + id + '/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
  const d = await r.json();
  if (!r.ok) { alert('Erreur : ' + d.error); return; }
  alert('Mot de passe réinitialisé avec succès');
}

async function deleteUser(id, nom) {
  if (!confirm('Supprimer le compte de ' + nom + ' ?')) return;
  const r = await fetch('/api/users/' + id, { method: 'DELETE' });
  const d = await r.json();
  if (!r.ok) { alert('Erreur : ' + d.error); return; }
  location.reload();
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show py-2 small" role="alert">' + msg + '<button type="button" class="btn-close py-2" data-bs-dismiss="alert"></button></div>';
  if (type === 'success') setTimeout(() => { if (el) el.innerHTML = ''; }, 3000);
}
</script>
</body>
</html>`;
}

// ── HTTP Server ───────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── API Routes ─────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) return sendJSON(res, 401, { error: 'Non authentifié' });
    if (sessionUser.role !== 'super') return sendJSON(res, 403, { error: 'Accès refusé' });

    // POST /api/users — créer un utilisateur
    if (pathname === '/api/users' && req.method === 'POST') {
      const body = await parseBody(req);
      const { username, nom, email, password, subscriptionType } = body;
      if (!username || !nom || !email || !password) return sendJSON(res, 400, { error: 'Champs manquants' });
      if (password.length < 6) return sendJSON(res, 400, { error: 'Mot de passe trop court (min 6 caractères)' });
      const users = loadUsers();
      if (users.find(u => u.username === username)) return sendJSON(res, 400, { error: 'Identifiant déjà utilisé' });
      if (users.find(u => u.email === email)) return sendJSON(res, 400, { error: 'Email déjà utilisé' });
      const type = subscriptionType || 'trial_30';
      const newUser = {
        id: Date.now(),
        username, nom, email,
        password: hashPassword(password),
        role: 'admin',
        createdAt: new Date().toISOString(),
        subscriptionType: type,
        subscriptionEnd: calcSubscriptionEnd(type)
      };
      users.push(newUser);
      saveUsers(users);
      return sendJSON(res, 200, { ok: true });
    }

    // DELETE /api/users/:id — supprimer un utilisateur
    if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
      const id = parseInt(pathname.split('/')[3]);
      const users = loadUsers();
      const user = users.find(u => u.id === id);
      if (!user) return sendJSON(res, 404, { error: 'Utilisateur non trouvé' });
      if (user.role === 'super') return sendJSON(res, 400, { error: 'Impossible de supprimer le super admin' });
      saveUsers(users.filter(u => u.id !== id));
      return sendJSON(res, 200, { ok: true });
    }

    // PUT /api/users/:id/password — reset mot de passe
    if (pathname.match(/^\/api\/users\/\d+\/password$/) && req.method === 'PUT') {
      const id = parseInt(pathname.split('/')[3]);
      const body = await parseBody(req);
      if (!body.password || body.password.length < 6) return sendJSON(res, 400, { error: 'Mot de passe trop court' });
      const users = loadUsers();
      const user = users.find(u => u.id === id);
      if (!user) return sendJSON(res, 404, { error: 'Utilisateur non trouvé' });
      user.password = hashPassword(body.password);
      saveUsers(users);
      return sendJSON(res, 200, { ok: true });
    }

    // POST /api/subscribe — assigner un abonnement
    if (pathname === '/api/subscribe' && req.method === 'POST') {
      const body = await parseBody(req);
      const { userId, type } = body;
      if (!['trial_30','annual','lifetime'].includes(type)) return sendJSON(res, 400, { error: 'Type invalide' });
      const users = loadUsers();
      const user = users.find(u => u.id === parseInt(userId));
      if (!user) return sendJSON(res, 404, { error: 'Utilisateur non trouvé' });
      user.subscriptionType = type;
      user.subscriptionEnd = calcSubscriptionEnd(type);
      saveUsers(users);
      return sendJSON(res, 200, { ok: true, subscriptionEnd: user.subscriptionEnd });
    }

    return sendJSON(res, 404, { error: 'Route non trouvée' });
  }

  // ── Auth Routes ────────────────────────────────────────────
  // GET /login
  if (pathname === '/login' && req.method === 'GET') {
    return sendHTML(res, loginPage(null));
  }

  // POST /login
  if (pathname === '/login' && req.method === 'POST') {
    let body = '';
    await new Promise(resolve => {
      req.on('data', c => body += c);
      req.on('end', resolve);
    });
    const params = new URLSearchParams(body);
    const username = params.get('username');
    const password = params.get('password');
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (!user || user.password !== hashPassword(password)) {
      return sendHTML(res, loginPage('Identifiant ou mot de passe incorrect'));
    }
    // Check subscription for non-super users
    if (user.role !== 'super') {
      const sub = getSubscriptionInfo(user);
      if (!sub.active || sub.expired || sub.noSubscription) {
        return sendHTML(res, loginPage('Votre abonnement est expiré. Contactez l\'administrateur.'));
      }
    }
    res.writeHead(302, {
      'Location': user.role === 'super' ? '/superadmin' : '/',
      'Set-Cookie': makeSessionCookie(user)
    });
    return res.end();
  }

  // GET /logout
  if (pathname === '/logout') {
    res.writeHead(302, {
      'Location': '/login',
      'Set-Cookie': 'tijara_session=; Path=/; Max-Age=0'
    });
    return res.end();
  }

  // ── Protected Routes ───────────────────────────────────────
  const sessionUser = getSessionUser(req);

  // /superadmin — super admin panel
  if (pathname === '/superadmin') {
    if (!sessionUser) return sendRedirect(res, '/login');
    if (sessionUser.role !== 'super') return sendRedirect(res, '/');
    return sendHTML(res, superAdminPage());
  }

  // /subscription-expired
  if (pathname === '/subscription-expired') {
    return sendHTML(res, subscriptionExpiredPage(sessionUser));
  }

  // / — main app (requires auth + valid subscription)
  if (pathname === '/' || pathname === '/index.html') {
    if (!sessionUser) return sendRedirect(res, '/login');
    if (sessionUser.role !== 'super') {
      const sub = getSubscriptionInfo(sessionUser);
      if (!sub.active || sub.expired || sub.noSubscription) return sendRedirect(res, '/subscription-expired');
    }
    // Serve index.html
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); return res.end();
    }
    fs.readFile(INDEX, (err, data) => {
      if (err) { res.writeHead(500); return res.end('Erreur serveur'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
    return;
  }

  // Static files (CSS, JS, images)
  if (pathname !== '/' && !pathname.startsWith('/api/')) {
    const filePath = path.join(__dirname, pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mime = { '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
        res.end(data);
      });
      return;
    }
  }

  // 404
  res.writeHead(302, { 'Location': '/' });
  res.end();
});

initUsers();
server.listen(PORT, () => {
  console.log('✅ TIJARA démarré sur le port ' + PORT);
  console.log('👑 Super Admin : username=super');
  console.log('🔑 Connectez-vous sur /login');
});
