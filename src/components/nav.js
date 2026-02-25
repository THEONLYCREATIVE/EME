/**
 * Navigation Component — Sidebar (desktop) + Bottom Nav (mobile)
 * Responds to store navigation state changes.
 */

import * as store from '../store/index.js';
import * as sync  from '../services/sync.js';

const NAV_ITEMS = [
  { id: 'entry',    icon: editIcon(),    label: 'Entry'    },
  { id: 'analysis', icon: chartIcon(),   label: 'Analysis' },
  { id: 'staff',    icon: usersIcon(),   label: 'Staff'    },
  { id: 'admin',    icon: settingsIcon(), label: 'Admin', masterOnly: true },
];

export function mountSidebar(el) {
  el.innerHTML = renderSidebar();
  bindSidebar(el);
  store.subscribe('navigate',    () => refreshActive(el));
  store.subscribe('settingsChange', () => refreshMeta(el));
  store.subscribe('online', (online) => updateSyncBar(el, online));
}

export function mountBottomNav(el) {
  el.innerHTML = renderBottomNav();
  bindBottomNav(el);
  store.subscribe('navigate', () => refreshActiveBottom(el));
}

export function mountHeader(el) {
  el.innerHTML = renderHeader();
  bindHeader(el);
  store.subscribe('navigate', (view) => {
    el.querySelector('#hdr-title').textContent = titleFor(view);
  });
}

// ── SIDEBAR ───────────────────────────────────────────────────
function renderSidebar() {
  const { settings, role } = store.state;
  const items = NAV_ITEMS.filter(i => !i.masterOnly || role === 'master');
  return `
  <div class="sidebar-logo">
    <div class="sidebar-logo-mark">N7</div>
    <div class="sidebar-logo-text">
      <h3>No7 Analytics</h3>
      <p>${settings.store || 'Dubai Airport T3'}</p>
    </div>
  </div>
  <nav class="sidebar-nav">
    ${items.map(i => `
      <button class="sidebar-item ${store.state.activeView===i.id?'active':''}"
        data-view="${i.id}">
        ${i.icon}${i.label}
      </button>`).join('')}
  </nav>
  <div class="sidebar-bottom">
    <div style="font-size:0.68rem;color:var(--text3);margin-bottom:8px" id="sb-user">
      ${store.state.user} · ${store.state.role}
    </div>
    <button class="btn btn-outline btn-sm btn-full" id="sb-logout">Sign Out</button>
  </div>`;
}

function bindSidebar(el) {
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-view]');
    if (btn) store.navigate(btn.dataset.view);
    if (e.target.id === 'sb-logout') document.dispatchEvent(new Event('app:logout'));
  });
}

function refreshActive(el) {
  el.querySelectorAll('.sidebar-item').forEach(b =>
    b.classList.toggle('active', b.dataset.view === store.state.activeView));
}

function refreshMeta(el) {
  const p = el.querySelector('.sidebar-logo-text p');
  if (p) p.textContent = store.state.settings.store;
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function renderBottomNav() {
  const items = NAV_ITEMS.filter(i => !i.masterOnly || store.state.role === 'master');
  return items.map(i => `
    <button class="nav-item ${store.state.activeView===i.id?'active':''}" data-view="${i.id}">
      ${i.icon}${i.label}
      <span class="nav-pip" id="pip-${i.id}"></span>
    </button>`).join('');
}

function bindBottomNav(el) {
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-view]');
    if (btn) store.navigate(btn.dataset.view);
  });
}

function refreshActiveBottom(el) {
  el.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.view === store.state.activeView));
}

// ── HEADER (mobile) ───────────────────────────────────────────
function renderHeader() {
  return `
  <div class="hdr-left">
    <div class="hdr-logo">N7</div>
    <div class="hdr-info">
      <h2 id="hdr-title">Entry</h2>
      <p id="hdr-sub">Dubai Airport T3</p>
    </div>
  </div>
  <div class="hdr-right">
    <span class="role-badge ${store.state.role}" id="hdr-role-badge">
      ${store.state.role === 'master' ? 'Master' : 'Staff'}
    </span>
    <button class="hdr-btn" id="hdr-chk-btn" title="Checklist (or double-press Tab)">☑️</button>
    <button class="hdr-btn" id="hdr-logout-btn" title="Sign Out">🚪</button>
  </div>`;
}

function bindHeader(el) {
  el.querySelector('#hdr-chk-btn')?.addEventListener('click', () => {
    document.dispatchEvent(new Event('app:toggle-checklist'));
  });
  el.querySelector('#hdr-logout-btn')?.addEventListener('click', () => {
    document.dispatchEvent(new Event('app:logout'));
  });
}

// ── SYNC BAR ─────────────────────────────────────────────────
function updateSyncBar(containerEl, online) {
  // The sync bar is mounted in the content column, not sidebar.
  // We emit an event instead.
  document.dispatchEvent(new CustomEvent('app:sync-status', { detail: { online } }));
}

// ── HELPERS ──────────────────────────────────────────────────
function titleFor(view) {
  return { entry:'Entry', analysis:'Analysis', staff:'Staff Tracker', admin:'Admin Panel' }[view] || view;
}

// ── ICONS (inline SVG) ────────────────────────────────────────
function editIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>`;
}
function chartIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>`;
}
function usersIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>`;
}
function settingsIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>`;
}
