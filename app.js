/* ============================================================
   CobranzaPro – app.js
   Recurring credit-card payment manager
   Stack: Vanilla HTML / CSS / JavaScript + localStorage
   ============================================================ */

'use strict';

// ── Constants ──────────────────────────────────────────────
const STORAGE_CLIENTS  = 'cp_clients';
const STORAGE_HISTORY  = 'cp_history';
const STORAGE_SETTINGS = 'cp_settings';

const FREQUENCY_DAYS = {
  diario:      1,
  semanal:     7,
  quincenal:  15,
  mensual:    30,
  bimestral:  60,
  trimestral: 90,
  anual:     365,
};

const FREQUENCY_LABELS = {
  diario:     'Diario',
  semanal:    'Semanal',
  quincenal:  'Quincenal',
  mensual:    'Mensual',
  bimestral:  'Bimestral',
  trimestral: 'Trimestral',
  anual:      'Anual',
};

// ── State ──────────────────────────────────────────────────
let clients  = [];
let history  = [];
let settings = {};
let historyFilter = 'all';

// ── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  updateTopbarDate();
  renderAll();
  setInterval(updateTopbarDate, 60_000);
});

// ── Persistence ────────────────────────────────────────────
function loadData() {
  clients  = JSON.parse(localStorage.getItem(STORAGE_CLIENTS)  || '[]');
  history  = JSON.parse(localStorage.getItem(STORAGE_HISTORY)  || '[]');
  settings = JSON.parse(localStorage.getItem(STORAGE_SETTINGS) || '{}');

  // Default settings
  settings = Object.assign({
    business:    'Mi Empresa',
    currency:    'MXN',
    timezone:    'America/Mexico_City',
    retries:     3,
    retryDays:   2,
    successRate: 80,
  }, settings);
}

function saveData() {
  localStorage.setItem(STORAGE_CLIENTS,  JSON.stringify(clients));
  localStorage.setItem(STORAGE_HISTORY,  JSON.stringify(history));
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}

// ── Navigation ─────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  clientes:  'Clientes',
  historial: 'Historial de Pagos',
  ajustes:   'Ajustes',
};

function navigate(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById('page-' + page);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;

  if (page === 'clientes')  renderClients();
  if (page === 'historial') renderHistory();
  if (page === 'ajustes')   loadSettingsForm();
  if (page === 'dashboard') renderDashboard();

  closeSidebar();
}

// ── Sidebar (mobile) ───────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── Date helpers ───────────────────────────────────────────
function updateTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (el) el.textContent = formatDatetime(new Date());
}

function formatDatetime(d) {
  return d.toLocaleString('es-MX', {
    weekday: 'short', year: 'numeric',
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(isoOrStr) {
  if (!isoOrStr) return '—';
  const d = new Date(isoOrStr + (isoOrStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isToday(isoDate) {
  return isoDate === todayISO();
}

function isPast(isoDate) {
  return isoDate < todayISO();
}

// ── Currency ───────────────────────────────────────────────
function formatMoney(amount) {
  const curr = settings.currency || 'MXN';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: curr }).format(amount);
}

// ── Render All ─────────────────────────────────────────────
function renderAll() {
  renderDashboard();
  renderClients();
  renderHistory();
}

// ── Dashboard ──────────────────────────────────────────────
function renderDashboard() {
  const activeClients = clients.filter(c => c.status === 'activo');
  const totalCollected = history
    .filter(h => h.result === 'exitoso')
    .reduce((s, h) => s + h.amount, 0);
  const failedCount = history.filter(h => h.result === 'fallido').length;
  const todayCount = clients.filter(c =>
    c.status === 'activo' && (isToday(c.nextCharge) || isPast(c.nextCharge))
  ).length;

  setText('stat-clients',   activeClients.length);
  setText('stat-collected', formatMoney(totalCollected));
  setText('stat-failed',    failedCount);
  setText('stat-today',     todayCount);

  const tbody = document.getElementById('dashboard-tbody');
  const empty = document.getElementById('dashboard-empty');
  const recent = [...clients].sort((a, b) => a.nextCharge.localeCompare(b.nextCharge)).slice(0, 8);

  if (recent.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    document.getElementById('dashboard-table').style.display = 'none';
  } else {
    empty.style.display = 'none';
    document.getElementById('dashboard-table').style.display = '';
    tbody.innerHTML = recent.map(c => clientRow(c, false)).join('');
  }
}

// ── Clients Table ──────────────────────────────────────────
function renderClients() {
  const search   = (document.getElementById('searchClients')?.value || '').toLowerCase();
  const statusF  = document.getElementById('filterStatus')?.value || '';

  let filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search) ||
                        c.email.toLowerCase().includes(search);
    const matchStatus = !statusF || c.status === statusF;
    return matchSearch && matchStatus;
  });

  filtered.sort((a, b) => a.nextCharge.localeCompare(b.nextCharge));

  const tbody = document.getElementById('clients-tbody');
  const empty = document.getElementById('clients-empty');
  const table = document.getElementById('clients-table');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    table.style.display = 'none';
  } else {
    empty.style.display = 'none';
    table.style.display = '';
    tbody.innerHTML = filtered.map(c => clientRow(c, true)).join('');
  }
}

function clientRow(c, showActions) {
  const masked  = maskCard(c.cardNumber);
  const badge   = statusBadge(c.status);
  const next    = nextChargeCell(c.nextCharge);
  const avatar  = avatarHTML(c.name);
  const actions = showActions ? `
    <div class="action-btns">
      <button class="btn-icon edit" onclick="openClientModal('${c.id}')" title="Editar">✏️</button>
      <button class="btn-icon ${c.status === 'activo' ? 'pause' : 'resume'}"
              onclick="toggleStatus('${c.id}')"
              title="${c.status === 'activo' ? 'Pausar' : 'Activar'}">
        ${c.status === 'activo' ? '⏸' : '▶️'}
      </button>
      <button class="btn-icon delete" onclick="deleteClient('${c.id}')" title="Eliminar">🗑</button>
    </div>` : `
    <div class="action-btns">
      <button class="btn-icon edit" onclick="openClientModal('${c.id}')" title="Editar">✏️</button>
    </div>`;

  return `<tr>
    <td>
      <div class="client-cell">
        ${avatar}
        <div class="client-info">
          <div class="client-name">${escHtml(c.name)}</div>
          <div class="client-email">${escHtml(c.email)}</div>
        </div>
      </div>
    </td>
    <td><span class="card-mask">${masked}</span></td>
    <td>${formatMoney(c.amount)}</td>
    <td>${FREQUENCY_LABELS[c.frequency] || c.frequency}</td>
    <td>${next}</td>
    <td>${badge}</td>
    <td>${actions}</td>
  </tr>`;
}

function avatarHTML(name) {
  const initials = name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return `<div class="avatar" style="background:${color}">${initials}</div>`;
}

function maskCard(num) {
  const digits = num.replace(/\D/g, '');
  return '•••• •••• •••• ' + digits.slice(-4);
}

function statusBadge(status) {
  const map = {
    activo:  ['badge-success', '● Activo'],
    pausado: ['badge-warning', '⏸ Pausado'],
    fallido: ['badge-danger',  '✕ Fallido'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function nextChargeCell(isoDate) {
  if (isPast(isoDate)) {
    return `<span class="badge badge-danger">Vencido – ${formatDate(isoDate)}</span>`;
  }
  if (isToday(isoDate)) {
    return `<span class="badge badge-warning">Hoy</span>`;
  }
  return `<span class="next-charge">${formatDate(isoDate)}</span>`;
}

// ── History Table ──────────────────────────────────────────
function setHistoryFilter(f, btn) {
  historyFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderHistory();
}

function renderHistory() {
  let filtered = historyFilter === 'all'
    ? history
    : history.filter(h => h.result === historyFilter);

  filtered = [...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const tbody = document.getElementById('history-tbody');
  const empty = document.getElementById('history-empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map(h => `<tr>
      <td>${formatDatetime(new Date(h.timestamp))}</td>
      <td>
        <div class="client-cell">
          ${avatarHTML(h.clientName)}
          <div class="client-info">
            <div class="client-name">${escHtml(h.clientName)}</div>
            <div class="client-email">${escHtml(h.clientEmail || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="card-mask">${maskCard(h.cardNumber)}</span></td>
      <td>${formatMoney(h.amount)}</td>
      <td>${h.result === 'exitoso'
        ? '<span class="badge badge-success">✅ Exitoso</span>'
        : '<span class="badge badge-danger">❌ Fallido</span>'}</td>
      <td style="color:var(--gray-500);font-size:12px">${escHtml(h.message || '')}</td>
    </tr>`).join('');
  }
}

// ── Modal ──────────────────────────────────────────────────
function openClientModal(id) {
  const modal = document.getElementById('clientModal');
  clearForm();

  if (id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modalTitle').textContent = 'Editar Cliente';
    document.getElementById('editId').value = c.id;
    document.getElementById('f-name').value      = c.name;
    document.getElementById('f-email').value     = c.email;
    document.getElementById('f-card').value      = c.cardNumber;
    document.getElementById('f-expiry').value    = c.expiry;
    document.getElementById('f-cvv').value       = '•••';
    document.getElementById('f-amount').value    = c.amount;
    document.getElementById('f-frequency').value = c.frequency;
    document.getElementById('f-next').value      = c.nextCharge;
    document.getElementById('f-notes').value     = c.notes || '';
    updatePreview();
  } else {
    document.getElementById('modalTitle').textContent = 'Nuevo Cliente';
    document.getElementById('f-next').value = todayISO();
  }

  modal.classList.add('open');
}

function closeClientModal() {
  document.getElementById('clientModal').classList.remove('open');
}

// Close on backdrop click
document.getElementById('clientModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeClientModal();
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeClientModal();
});

function clearForm() {
  ['f-name','f-email','f-card','f-expiry','f-cvv','f-amount','f-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('editId').value = '';
  document.getElementById('f-frequency').value = 'mensual';
  document.getElementById('f-next').value = todayISO();
  clearErrors();
  resetPreview();
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('input.error, select.error').forEach(e => e.classList.remove('error'));
}

// ── Card Preview ───────────────────────────────────────────
function updatePreview() {
  const num  = document.getElementById('f-card').value || '';
  const name = document.getElementById('f-name').value || '';
  const exp  = document.getElementById('f-expiry').value || '';

  const displayNum = num.replace(/\D/g, '').padEnd(16, '•')
    .replace(/(.{4})/g, '$1 ').trim();

  document.getElementById('previewNumber').textContent = displayNum || '•••• •••• •••• ••••';
  document.getElementById('previewName').textContent   = name.toUpperCase() || 'NOMBRE APELLIDO';
  document.getElementById('previewExpiry').textContent = exp || 'MM/AA';
}

function resetPreview() {
  document.getElementById('previewNumber').textContent = '•••• •••• •••• ••••';
  document.getElementById('previewName').textContent   = 'NOMBRE APELLIDO';
  document.getElementById('previewExpiry').textContent = 'MM/AA';
}

// ── Input formatters ───────────────────────────────────────
function formatCard(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  input.value = v;
}

// ── Validation ─────────────────────────────────────────────
function validateClient() {
  clearErrors();
  let valid = true;

  const name   = document.getElementById('f-name').value.trim();
  const email  = document.getElementById('f-email').value.trim();
  const card   = document.getElementById('f-card').value.replace(/\D/g, '');
  const expiry = document.getElementById('f-expiry').value.trim();
  const cvv    = document.getElementById('f-cvv').value.trim();
  const amount = parseFloat(document.getElementById('f-amount').value);
  const next   = document.getElementById('f-next').value;
  const editId = document.getElementById('editId').value;

  if (!name || name.length < 2) { showError('f-name', 'err-name'); valid = false; }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('f-email', 'err-email'); valid = false;
  }

  // Allow masked CVV when editing
  const isMaskedCVV = editId && cvv === '•••';
  if (!isMaskedCVV && (card.length !== 16)) { showError('f-card', 'err-card'); valid = false; }

  if (!editId || cvv !== '•••') {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { showError('f-expiry', 'err-expiry'); valid = false; }
  }

  if (!isMaskedCVV && (cvv.length < 3 || cvv.length > 4 || !/^\d+$/.test(cvv))) {
    showError('f-cvv', 'err-cvv'); valid = false;
  }

  if (isNaN(amount) || amount <= 0) { showError('f-amount', 'err-amount'); valid = false; }

  if (!next) { showError('f-next', 'err-next'); valid = false; }

  return valid;
}

function showError(fieldId, errId) {
  document.getElementById(fieldId)?.classList.add('error');
  document.getElementById(errId)?.classList.add('visible');
}

// ── Save Client ────────────────────────────────────────────
function saveClient() {
  if (!validateClient()) return;

  const editId = document.getElementById('editId').value;
  const name   = document.getElementById('f-name').value.trim();
  const email  = document.getElementById('f-email').value.trim();
  const card   = document.getElementById('f-card').value.replace(/\D/g, '');
  const expiry = document.getElementById('f-expiry').value.trim();
  const cvv    = document.getElementById('f-cvv').value.trim();
  const amount = parseFloat(document.getElementById('f-amount').value);
  const freq   = document.getElementById('f-frequency').value;
  const next   = document.getElementById('f-next').value;
  const notes  = document.getElementById('f-notes').value.trim();

  if (editId) {
    const idx = clients.findIndex(c => c.id === editId);
    if (idx !== -1) {
      clients[idx] = {
        ...clients[idx],
        name, email, expiry, amount,
        frequency: freq,
        nextCharge: next,
        notes,
        // Only update card/cvv if not masked
        cardNumber: cvv === '•••' ? clients[idx].cardNumber : card,
        cvvHash:    cvv === '•••' ? clients[idx].cvvHash : hashCVV(cvv),
      };
      toast('Cliente actualizado correctamente.', 'success');
    }
  } else {
    clients.push({
      id:         uid(),
      name,
      email,
      cardNumber: card,
      expiry,
      cvvHash:    hashCVV(cvv),
      amount,
      frequency:  freq,
      nextCharge: next,
      notes,
      status:     'activo',
      createdAt:  new Date().toISOString(),
      retryCount: 0,
    });
    toast(`Cliente "${name}" agregado exitosamente.`, 'success');
  }

  saveData();
  closeClientModal();
  renderAll();
}

// ── Toggle Status ──────────────────────────────────────────
function toggleStatus(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  c.status = c.status === 'activo' ? 'pausado' : 'activo';
  saveData();
  renderAll();
  toast(`Estado de "${c.name}" cambiado a ${c.status}.`, 'success');
}

// ── Delete Client ──────────────────────────────────────────
function deleteClient(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`¿Eliminar a "${c.name}"? Esta acción no se puede deshacer.`)) return;
  clients = clients.filter(x => x.id !== id);
  saveData();
  renderAll();
  toast(`Cliente "${c.name}" eliminado.`, 'warning');
}

// ── Simulate Charges ───────────────────────────────────────
function runSimulation() {
  const today = todayISO();
  const due = clients.filter(c =>
    c.status === 'activo' && c.nextCharge <= today
  );

  if (due.length === 0) {
    toast('No hay cobros pendientes para hoy.', 'warning');
    return;
  }

  let success = 0, failed = 0;
  const successRate = Math.max(0, Math.min(100, Number(settings.successRate || 80)));

  due.forEach(c => {
    const ok = Math.random() * 100 < successRate;
    const entry = {
      id:          uid(),
      clientId:    c.id,
      clientName:  c.name,
      clientEmail: c.email,
      cardNumber:  c.cardNumber,
      amount:      c.amount,
      result:      ok ? 'exitoso' : 'fallido',
      message:     ok ? 'Cargo aprobado por el banco.' : randomDeclineReason(),
      timestamp:   new Date().toISOString(),
    };
    history.unshift(entry);

    if (ok) {
      c.nextCharge = addDays(today, FREQUENCY_DAYS[c.frequency] || 30);
      c.retryCount = 0;
      c.status     = 'activo';
      success++;
    } else {
      c.retryCount = (c.retryCount || 0) + 1;
      const maxRetries = Number(settings.retries || 3);
      if (c.retryCount >= maxRetries) {
        c.status = 'fallido';
      } else {
        c.nextCharge = addDays(today, Number(settings.retryDays || 2));
      }
      failed++;
    }
  });

  saveData();
  renderAll();

  const msg = `Cobros procesados: ✅ ${success} exitosos, ❌ ${failed} fallidos.`;
  toast(msg, failed > 0 ? 'warning' : 'success');

  // Auto-switch to history
  navigate('historial');
}

function randomDeclineReason() {
  const reasons = [
    'Fondos insuficientes.',
    'Tarjeta bloqueada por el banco.',
    'Tarjeta vencida.',
    'Límite de crédito excedido.',
    'Transacción rechazada por el emisor.',
    'Error de comunicación con el banco.',
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

// ── Settings ───────────────────────────────────────────────
function loadSettingsForm() {
  setVal('cfg-business',     settings.business);
  setVal('cfg-currency',     settings.currency);
  setVal('cfg-timezone',     settings.timezone);
  setVal('cfg-retries',      settings.retries);
  setVal('cfg-retry-days',   settings.retryDays);
  setVal('cfg-success-rate', settings.successRate);
}

function saveSettings() {
  settings.business     = document.getElementById('cfg-business').value.trim()    || 'Mi Empresa';
  settings.currency     = document.getElementById('cfg-currency').value;
  settings.timezone     = document.getElementById('cfg-timezone').value;
  settings.retries      = Number(document.getElementById('cfg-retries').value);
  settings.retryDays    = Number(document.getElementById('cfg-retry-days').value);
  settings.successRate  = Number(document.getElementById('cfg-success-rate').value);
  saveData();
  toast('Configuración guardada.', 'success');
}

// ── Data management ────────────────────────────────────────
function exportData() {
  const data = { clients, history, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `cobranza_export_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Datos exportados correctamente.', 'success');
}

function clearHistory() {
  if (!confirm('¿Borrar todo el historial de pagos? Esta acción no se puede deshacer.')) return;
  history = [];
  saveData();
  renderHistory();
  toast('Historial borrado.', 'warning');
}

function clearAll() {
  if (!confirm('¿Borrar TODOS los datos (clientes + historial)? Esta acción no se puede deshacer.')) return;
  clients = [];
  history = [];
  saveData();
  renderAll();
  toast('Todos los datos fueron eliminados.', 'warning');
}

// ── Toast notifications ────────────────────────────────────
function toast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast${type ? ' ' + type : ''}`;
  el.innerHTML = `<span>${msg}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, 3500);
}

// ── Utilities ──────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

/** Simple one-way hash for CVV – never stored in plain text */
function hashCVV(cvv) {
  let h = 0x811c9dc5;
  for (let i = 0; i < cvv.length; i++) {
    h ^= cvv.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// ── Seed demo data (first run) ─────────────────────────────
(function seedIfEmpty() {
  if (clients.length > 0) return;

  const today = todayISO();
  const demos = [
    {
      name: 'Ana Martínez López',
      email: 'ana.martinez@email.com',
      cardNumber: '4111111111111111',
      expiry: '08/27',
      amount: 499,
      frequency: 'mensual',
      nextCharge: today,
      notes: 'Plan Premium',
    },
    {
      name: 'Carlos Rodríguez Peña',
      email: 'c.rodriguez@empresa.mx',
      cardNumber: '5500005555555559',
      expiry: '12/26',
      amount: 1200,
      frequency: 'mensual',
      nextCharge: addDays(today, 5),
      notes: 'Plan Corporativo',
    },
    {
      name: 'Lucía González Torres',
      email: 'lucia.g@mail.com',
      cardNumber: '3782822463100005',
      expiry: '03/28',
      amount: 250,
      frequency: 'semanal',
      nextCharge: addDays(today, 2),
      notes: 'Plan Básico',
    },
    {
      name: 'Miguel Ángel Fuentes',
      email: 'mfuentes@outlook.com',
      cardNumber: '6011111111111117',
      expiry: '06/26',
      amount: 3500,
      frequency: 'trimestral',
      nextCharge: addDays(today, 45),
      notes: 'Plan Enterprise',
    },
    {
      name: 'Sofía Herrera Vega',
      email: 'sofia.h@gmail.com',
      cardNumber: '4012888888881881',
      expiry: '11/25',
      amount: 149,
      frequency: 'mensual',
      nextCharge: addDays(today, -3),
      notes: 'Plan Starter',
      status: 'fallido',
    },
  ];

  demos.forEach(d => {
    clients.push({
      id:         uid(),
      name:       d.name,
      email:      d.email,
      cardNumber: d.cardNumber,
      expiry:     d.expiry,
      cvvHash:    hashCVV('123'),
      amount:     d.amount,
      frequency:  d.frequency,
      nextCharge: d.nextCharge,
      notes:      d.notes || '',
      status:     d.status || 'activo',
      createdAt:  new Date().toISOString(),
      retryCount: 0,
    });
  });

  // Seed a few history entries
  const statuses = ['exitoso', 'exitoso', 'exitoso', 'fallido'];
  clients.slice(0, 4).forEach((c, i) => {
    history.push({
      id:          uid(),
      clientId:    c.id,
      clientName:  c.name,
      clientEmail: c.email,
      cardNumber:  c.cardNumber,
      amount:      c.amount,
      result:      statuses[i],
      message:     statuses[i] === 'exitoso' ? 'Cargo aprobado por el banco.' : 'Fondos insuficientes.',
      timestamp:   new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    });
  });

  saveData();
})();
