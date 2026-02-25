/**
 * App Bootstrap — No7 Analytics
 * ─────────────────────────────────────────────────────────────
 * Single entry point. Imports all modules and wires them together.
 * Components are self-contained — this file just mounts them.
 *
 * Architecture:
 *   app.js  →  components/*  →  services/*  →  store/*  →  db.js
 *
 * To add a new view: create src/components/myview.js,
 * add mount() call here, add nav item in nav.js.
 */

import * as store    from './store/index.js';
import * as login    from './components/login.js';
import * as nav      from './components/nav.js';
import * as entry    from './components/entry.js';
import * as analysis from './components/analysis.js';
import * as staff    from './components/staff.js';
import * as admin    from './components/admin.js';
import * as checklist from './components/checklist.js';

// ── INIT PWA ──────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .catch(err => console.warn('[SW] Registration failed:', err));
}

// ── MOUNT LOGIN ───────────────────────────────────────────────
login.mount(document.getElementById('login-root'));

// ── LOGIN COMPLETE ────────────────────────────────────────────
document.addEventListener('app:login', (e) => {
  document.getElementById('login-root').style.display  = 'none';
  document.getElementById('app-root').style.display    = 'block';
  mountApp(e.detail.role);
});

// ── LOGOUT ────────────────────────────────────────────────────
document.addEventListener('app:logout', () => {
  document.getElementById('login-root').style.display  = '';
  document.getElementById('app-root').style.display    = 'none';
  document.getElementById('login-root').innerHTML      = '';
  document.getElementById('app-root').innerHTML        = '';
  store.setAuth(null, null);
  login.mount(document.getElementById('login-root'));
});

// ── MOUNT APP ─────────────────────────────────────────────────
function mountApp(role) {
  const root = document.getElementById('app-root');

  // Build shell HTML
  root.innerHTML = `
  <div class="app-shell">

    <!-- Desktop sidebar -->
    <div id="sidebar-root" class="sidebar"></div>

    <!-- Content column -->
    <div class="content-col">

      <!-- Mobile header -->
      <header class="app-header" id="header-root"></header>

      <!-- Checklist slide panel (relative wrapper) -->
      <div style="position:relative;flex-shrink:0;z-index:50" id="chk-root"></div>

      <!-- Sync bar -->
      <div class="sync-bar" id="sync-bar">
        <div class="sync-dot"></div>
        <span id="sync-text">All saved · ready</span>
      </div>

      <!-- Main scrollable area -->
      <div class="app-content">
        <div class="view active" id="view-entry"></div>
        <div class="view"        id="view-analysis"></div>
        <div class="view"        id="view-staff"></div>
        ${role === 'master' ? '<div class="view" id="view-admin"></div>' : ''}
      </div>

      <!-- Mobile bottom nav -->
      <nav class="bottom-nav" id="bottom-nav-root"></nav>

    </div>
  </div>

  <!-- Global overlays -->
  <div class="success-overlay" id="success-overlay"><div class="success-burst">🎯</div></div>
  <div class="toast" id="toast"></div>`;

  // Mount all components
  nav.mountSidebar(root.querySelector('#sidebar-root'));
  nav.mountHeader(root.querySelector('#header-root'));
  nav.mountBottomNav(root.querySelector('#bottom-nav-root'));
  checklist.mount(root.querySelector('#chk-root'));
  entry.mount(root.querySelector('#view-entry'));
  analysis.mount(root.querySelector('#view-analysis'));
  staff.mount(root.querySelector('#view-staff'));
  if (role === 'master') {
    admin.mount(root.querySelector('#view-admin'));
  }

  // ── VIEW SWITCHING ────────────────────────────────────────
  store.subscribe('navigate', (view) => {
    root.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    root.querySelector(`#view-${view}`)?.classList.add('active');
  });

  // ── SYNC BAR ──────────────────────────────────────────────
  document.addEventListener('app:sync-status', (e) => {
    const bar  = document.getElementById('sync-bar');
    const text = document.getElementById('sync-text');
    if (!bar) return;
    bar.className  = `sync-bar ${e.detail.online ? '' : 'offline'}`;
    if (text) text.textContent = e.detail.online ? 'Back online · syncing…' : 'Offline mode · data saved locally';
    if (e.detail.online) {
      setTimeout(() => { bar.className='sync-bar'; if(text) text.textContent='All saved · '+new Date().toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'}); }, 2500);
    }
  });
  window.addEventListener('offline', () => document.dispatchEvent(new CustomEvent('app:sync-status', { detail:{online:false} })));
  window.addEventListener('online',  () => document.dispatchEvent(new CustomEvent('app:sync-status', { detail:{online:true}  })));

  // ── TOAST ─────────────────────────────────────────────────
  document.addEventListener('app:toast', (e) => {
    showToast(e.detail.msg, e.detail.type || '');
  });

  // ── CONFETTI ──────────────────────────────────────────────
  let confettiShown = false;
  document.addEventListener('app:celebrate', () => {
    if (confettiShown) return;
    confettiShown = true;
    setTimeout(() => confettiShown = false, 5000);
    const overlay = document.getElementById('success-overlay');
    overlay?.classList.add('show');
    setTimeout(() => overlay?.classList.remove('show'), 2000);
    if (typeof confetti !== 'undefined') {
      confetti({ particleCount:120, spread:80, origin:{y:0.5},
        colors:['#00c896','#00e6ac','#4a90d9','#f5a623','#8b5cf6'] });
    }
  });
}

// ── TOAST HELPER ──────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = `toast on${type?' '+type:''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
}
