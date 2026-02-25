/**
 * js/views/login.js
 * ─────────────────────────────────────────────────────
 * Login screen controller.
 * Handles: tab switching, PIN login, master password,
 *          drag slider, hold-ring timer.
 */

import { verifyStaffPin, verifyMasterPassword, confirmMasterAccess } from '../services/auth.js';
import { setAuth } from '../store/index.js';
import { toast } from '../utils/ui.js';

// ── State ─────────────────────────────────────────────
let dragInitialized  = false;
let holdInterval     = null;

// ── Init ──────────────────────────────────────────────
export function initLogin(onSuccess) {
  bindTabs();
  bindStaffLogin(onSuccess);
  bindMasterLogin(onSuccess);
  bindKeyboard(onSuccess);
}

// ── Tab switching ─────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('#login-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#login-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.tab;
      document.getElementById('panel-staff').hidden  = mode !== 'staff';
      document.getElementById('panel-master').hidden = mode !== 'master';
      clearError();
    });
  });
}

// ── Staff login ───────────────────────────────────────
function bindStaffLogin(onSuccess) {
  const btn   = document.getElementById('btn-staff-login');
  const input = document.getElementById('input-staff-pin');
  if (!btn || !input) return;

  btn.addEventListener('click', () => attemptStaff(onSuccess));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') attemptStaff(onSuccess);
  });
}

function attemptStaff(onSuccess) {
  const pin = document.getElementById('input-staff-pin')?.value?.trim() || '';
  const result = verifyStaffPin(pin);
  if (result.ok) {
    setAuth({ loggedIn: true, role: result.role, user: result.user });
    onSuccess(result);
  } else {
    showError(result.error);
    shakeCard();
  }
}

// ── Master login ──────────────────────────────────────
function bindMasterLogin(onSuccess) {
  const btn = document.getElementById('btn-master-verify');
  const inp = document.getElementById('input-master-pwd');
  if (!btn || !inp) return;

  btn.addEventListener('click', () => attemptMasterPwd(onSuccess));
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') attemptMasterPwd(onSuccess);
  });
}

function attemptMasterPwd(onSuccess) {
  const pwd = document.getElementById('input-master-pwd')?.value?.trim() || '';
  const result = verifyMasterPassword(pwd);
  if (result.ok) {
    clearError();
    document.getElementById('drag-unlock').hidden = false;
    initDragSlider(onSuccess);
  } else {
    showError(result.error);
    shakeCard();
  }
}

// ── Drag slider ───────────────────────────────────────
function initDragSlider(onSuccess) {
  if (dragInitialized) return;
  dragInitialized = true;

  const track = document.getElementById('drag-track');
  const thumb = document.getElementById('drag-thumb');
  const fill  = document.getElementById('drag-fill');
  const text  = document.getElementById('drag-text');
  if (!track || !thumb) return;

  let dragging = false;
  let startClientX = 0;
  let currentX = 0;

  const getMax = () => track.offsetWidth - thumb.offsetWidth - 6;

  const onStart = e => {
    dragging = true;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    startClientX = cx - currentX;
    thumb.style.transition = 'none';
  };

  const onMove = e => {
    if (!dragging) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const max = getMax();
    currentX = Math.max(0, Math.min(cx - startClientX, max));
    thumb.style.transform = `translateX(${currentX}px)`;
    const pct = currentX / max;
    fill.style.width = (pct * 100) + '%';
    text.style.opacity = String(1 - pct * 2);

    if (pct >= 0.98) {
      dragging = false;
      startHoldRing(onSuccess);
    }
  };

  const onEnd = () => { dragging = false; };

  thumb.addEventListener('mousedown', onStart);
  thumb.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

// ── Hold-to-confirm ring ──────────────────────────────
function startHoldRing(onSuccess) {
  const ring    = document.getElementById('hold-ring');
  const circle  = document.getElementById('hold-ring-progress');
  const numEl   = document.getElementById('hold-ring-text');
  const hint    = document.getElementById('drag-unlock-hint');
  if (!ring) return;

  ring.hidden = false;
  hint.textContent = 'Hold for 5 seconds to confirm master access';

  const circumference = 2 * Math.PI * 35; // r=35
  circle.style.strokeDasharray  = circumference;
  circle.style.strokeDashoffset = circumference;

  let held = false;
  let startTime = null;

  const onHoldStart = () => {
    held = true;
    startTime = Date.now();
    holdInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / 5, 1);
      circle.style.strokeDashoffset = circumference * (1 - progress);
      numEl.textContent = String(Math.ceil(5 - elapsed));
      if (elapsed >= 5) {
        clearInterval(holdInterval);
        const result = confirmMasterAccess();
        setAuth({ loggedIn: true, ...result });
        onSuccess(result);
      }
    }, 50);
  };

  const onHoldEnd = () => {
    held = false;
    clearInterval(holdInterval);
    circle.style.strokeDashoffset = circumference;
    numEl.textContent = '5';
  };

  ring.addEventListener('mousedown', onHoldStart);
  ring.addEventListener('touchstart', onHoldStart, { passive: true });
  ring.addEventListener('mouseup', onHoldEnd);
  ring.addEventListener('touchend', onHoldEnd);
  ring.addEventListener('mouseleave', onHoldEnd);
}

// ── Error display ─────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}
function clearError() {
  const el = document.getElementById('login-error');
  if (el) el.hidden = true;
}

// ── Keyboard shortcut (Enter on PIN) ──────────────────
function bindKeyboard(onSuccess) {
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.target.closest('input')) {
      const activeTab = document.querySelector('#login-tabs .tab.active');
      if (activeTab?.dataset.tab === 'staff') attemptStaff(onSuccess);
    }
  });
}

// ── Card shake animation ──────────────────────────────
function shakeCard() {
  const card = document.querySelector('.login-card');
  if (!card) return;
  card.style.animation = 'none';
  requestAnimationFrame(() => {
    card.style.animation = 'shake 0.35s ease';
    setTimeout(() => { card.style.animation = ''; }, 400);
  });
}

// Inject shake keyframes once
const style = document.createElement('style');
style.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)}
}`;
document.head.appendChild(style);
