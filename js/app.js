/**
 * js/app.js
 * ─────────────────────────────────────────────────────
 * Application bootstrap, router, nav, checklist.
 */

import { initLogin }                from './views/login.js';
import { renderEntry }              from './views/entry.js';
import { renderAnalysis }           from './views/analysis.js';
import { renderStaff }              from './views/staff.js';
import { renderAdmin }              from './views/admin.js';
import { store, loadAll, setAuth, toggleChecklistItem, addAuditEntry } from './store/index.js';
import { networkStatus, pendingCount } from './services/sync.js';
import { clearSession }             from './services/auth.js';
import { toast, updateSyncBar, el, setText } from './utils/ui.js';

// ── Service Worker ────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ── NAV CONFIG ────────────────────────────────────────
const NAV = [
  { id:'entry',    label:'Entry',    icon:icoEntry(),    masterOnly:false },
  { id:'analysis', label:'Analysis', icon:icoAnalysis(), masterOnly:false },
  { id:'staff',    label:'Staff',    icon:icoStaff(),    masterOnly:false },
  { id:'admin',    label:'Admin',    icon:icoAdmin(),    masterOnly:true  },
];

// ── Bootstrap ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLogin(onLoginSuccess);
});

function onLoginSuccess(authResult) {
  loadAll();
  el('screen-login').hidden = true;
  el('screen-app').hidden   = false;

  buildNav(authResult.role);
  renderEntry();
  showView('entry');
  updateRoleBadge(authResult.role);

  if (el('sidebar-user-chip'))
    el('sidebar-user-chip').textContent = `${authResult.user} · ${authResult.role === 'master' ? 'Master' : 'Staff'}`;

  const now = new Date();
  if (el('header-sub'))
    el('header-sub').textContent = now.toLocaleDateString('en-AE',{day:'2-digit',month:'long',year:'numeric'}) + ' · UAE';

  updateSyncBar({ online: networkStatus.isOnline });
  networkStatus.subscribe(online => updateSyncBar({ online, pendingSync: pendingCount() }));

  el('btn-logout-desktop')?.addEventListener('click', doLogout);
  el('btn-logout-mobile')?.addEventListener('click',  doLogout);
  el('btn-checklist-toggle')?.addEventListener('click', toggleChecklist);
  bindKeyboard();

  const h = now.getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  toast(`${greet}, ${authResult.user}!`, 'success');
}

// ── NAV BUILD ─────────────────────────────────────────
function buildNav(role) {
  const isMaster = role === 'master';
  const visible  = NAV.filter(n => !n.masterOnly || isMaster);

  const sidebar = el('sidebar-nav');
  if (sidebar) {
    sidebar.innerHTML = visible.map(n =>
      `<button class="sidebar-nav-item" data-view="${n.id}">${n.icon} ${n.label}</button>`
    ).join('');
    sidebar.querySelectorAll('.sidebar-nav-item').forEach(btn =>
      btn.addEventListener('click', () => showView(btn.dataset.view)));
  }

  const bottom = el('bottom-nav');
  if (bottom) {
    bottom.innerHTML = visible.map(n =>
      `<button class="bottom-nav-item" data-view="${n.id}">${n.icon}<span>${n.label}</span><span class="nav-pip"></span></button>`
    ).join('');
    bottom.querySelectorAll('.bottom-nav-item').forEach(btn =>
      btn.addEventListener('click', () => showView(btn.dataset.view)));
  }
}

// ── ROUTER ────────────────────────────────────────────
let currentView = null;

function showView(id) {
  currentView = id;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  el(`view-${id}`)?.classList.add('active');

  switch (id) {
    case 'entry':    renderEntry();    break;
    case 'analysis': renderAnalysis(); break;
    case 'staff':    renderStaff();    break;
    case 'admin':    renderAdmin();    break;
  }

  document.querySelectorAll('.sidebar-nav-item, .bottom-nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.view === id));

  const titles = { entry:'Entry', analysis:'Analysis', staff:'Staff Tracker', admin:'Admin' };
  setText('header-title', titles[id] || id);
}

// ── LOGOUT ────────────────────────────────────────────
function doLogout() {
  clearSession();
  setAuth({ loggedIn:false, role:null, user:null });
  el('screen-app').hidden   = true;
  el('screen-login').hidden = false;
  if (el('input-staff-pin'))  el('input-staff-pin').value  = '';
  if (el('input-master-pwd')) el('input-master-pwd').value = '';
  currentView = null;
}

// ── ROLE BADGE ────────────────────────────────────────
function updateRoleBadge(role) {
  const b = el('role-badge');
  if (!b) return;
  b.textContent = role === 'master' ? 'Master' : 'Staff';
  b.className   = 'role-badge ' + (role === 'master' ? 'role-badge-master' : 'role-badge-staff');
}

// ── CHECKLIST ─────────────────────────────────────────
let checklistOpen = false;

function toggleChecklist() {
  checklistOpen = !checklistOpen;
  const panel = el('checklist-panel');
  if (!panel) return;
  panel.classList.toggle('open', checklistOpen);
  if (checklistOpen) renderChecklistPanel();
}

function renderChecklistPanel() {
  const inner = el('checklist-panel-inner');
  if (!inner) return;

  const items     = store.checklist;
  const done      = store.checklistDone;
  const doneCount = Object.values(done).filter(Boolean).length;
  const total     = items.length;
  const pct       = total ? (doneCount / total) * 100 : 0;

  inner.innerHTML = `
    <div class="checklist-title">
      <span>📋 Daily Checklist</span>
      <span style="font-size:.7rem;color:var(--mint-dark);font-weight:700">${doneCount}/${total}</span>
    </div>
    <div class="checklist-progress">
      <div class="checklist-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="checklist-items">
      ${items.map((item, i) => `
        <div class="chk-item ${done[i]?'done':''}" data-idx="${i}">
          <div class="chk-icon">${done[i]?'✓':''}</div>
          <span class="chk-text">${item}</span>
        </div>`).join('')}
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:12px;opacity:${pct>=100?1:.5}"
      id="btn-chk-confirm">✓ Mark Complete &amp; Save</button>`;

  inner.querySelectorAll('.chk-item').forEach(item => {
    item.addEventListener('click', () => {
      toggleChecklistItem(parseInt(item.dataset.idx));
      renderChecklistPanel();
    });
  });

  el('btn-chk-confirm')?.addEventListener('click', () => {
    if (doneCount < total) { toast('Complete all items first', 'error'); return; }
    addAuditEntry('checklist_confirmed', `${total} items`, store.auth.user, store.auth.role);
    toast('✓ Checklist complete!', 'success');
    checklistOpen = false;
    el('checklist-panel').classList.remove('open');
  });
}

// ── KEYBOARD ──────────────────────────────────────────
let lastTabTime = 0;
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const now = Date.now();
      if (now - lastTabTime < 400) toggleChecklist();
      lastTabTime = now;
    }
  });
}

// ── SVG ICONS ─────────────────────────────────────────
function icoEntry()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`; }
function icoAnalysis() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`; }
function icoStaff()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`; }
function icoAdmin()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`; }
('.chk-item').forEach(item => {
    item.addEventListener('click', () => {
      toggleChecklistItem(parseInt(item.dataset.idx));
      renderChecklistPanel();
    });
  });

  el('btn-chk-confirm')?.addEventListener('click', () => {
    if (pct < 100) { toast('Complete all items first', 'error'); return; }
    confirmChecklist(store.auth.user);
    addAuditEntry('checklist_confirmed', `${total} items confirmed`, store.auth.user, store.auth.role);
    toast('✓ Checklist complete!', 'success');
    toggleChecklist();
  });
}

// Subscribe to checklist changes to keep panel in sync
subscribe('checklist', () => { if (checklistOpen) renderChecklistPanel(); });

// ── KEYBOARD SHORTCUTS ────────────────────────────────
let lastTabTime = 0;
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    // Double-Tab → toggle checklist
    if (e.key === 'Tab' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const now = Date.now();
      if (now - lastTabTime < 400) toggleChecklist();
      lastTabTime = now;
    }
    // Escape → close checklist
    if (e.key === 'Escape' && checklistOpen) toggleChecklist();
  });
}

// ── NAV ICONS (inline SVG) ────────────────────────────
function iconEntry() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
}
function iconAnalysis() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
}
function iconStaff() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`;
}
function iconAdmin() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 00-14.14 0M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m0 18a9 9 0 01-9-9m9 9v-2m0-16v2m-7 5l1.41 1.41M19 5l-1.41 1.41M5 19l1.41-1.41M19 19l-1.41-1.41"/></svg>`;
}
