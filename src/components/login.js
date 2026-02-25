/**
 * Login Component — No7 Analytics
 * Renders the full login screen + master drag/hold unlock.
 * Calls auth service — never handles credentials directly.
 */

import * as auth   from '../services/auth.js';
import * as store  from '../store/index.js';

let loginMode   = 'staff';
let masterPwdOk = false;
let dragInitd   = false;

export function mount(rootEl) {
  rootEl.innerHTML = renderHTML();
  bindEvents(rootEl);
}

// ── RENDER ─────────────────────────────────────────────────────
function renderHTML() {
  return `
  <div class="login-screen">
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-mark">N7</div>
        <div class="login-logo-text">
          <h1>No7 Analytics</h1>
          <p>Dubai Airport T3 · Sales Platform</p>
        </div>
      </div>

      <div class="login-tabs">
        <button class="login-tab active" id="tab-staff">Staff Login</button>
        <button class="login-tab" id="tab-master">Master</button>
      </div>

      <div class="login-error" id="login-error"></div>

      <!-- Staff panel -->
      <div id="panel-staff">
        <div class="field">
          <div class="field-header">
            <label class="field-label">Staff PIN</label>
          </div>
          <div class="field-input">
            <input type="password" id="staff-pin" placeholder="Enter 4-digit PIN"
              maxlength="4" inputmode="numeric" autocomplete="current-password">
          </div>
        </div>
        <button class="btn btn-mint btn-full" id="btn-staff-login">Sign In →</button>
      </div>

      <!-- Master panel -->
      <div id="panel-master" style="display:none">
        <div class="field">
          <div class="field-header">
            <label class="field-label">Master Password</label>
          </div>
          <div class="field-input">
            <input type="password" id="master-pwd" placeholder="Enter master password">
          </div>
        </div>
        <button class="btn btn-mint btn-full" id="btn-master-verify">Verify Password</button>

        <!-- Drag unlock (shown after password verified) -->
        <div id="master-unlock" class="master-unlock">
          <div style="font-size:0.68rem;color:var(--text3);text-align:center;margin-bottom:10px;font-weight:500">
            Slide to enter master mode
          </div>
          <div class="drag-track" id="drag-track">
            <div class="drag-fill"  id="drag-fill"></div>
            <div class="drag-thumb" id="drag-thumb">🔐</div>
            <div class="drag-text"  id="drag-text">Slide right →</div>
          </div>
          <div class="hold-ring" id="hold-ring">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle class="hold-circle" id="hold-circle" cx="40" cy="40" r="35"/>
            </svg>
            <span class="hold-num" id="hold-num">5</span>
          </div>
          <div style="font-size:0.65rem;text-align:center;color:var(--text3);margin-top:6px" id="hold-instr">
            Press and hold centre to confirm
          </div>
        </div>
      </div>

      <div class="login-demo">
        Staff PIN: <strong>1234</strong> · Master: <strong>master2026</strong>
        <br><em style="color:var(--amber)">Change before production deployment</em>
      </div>
    </div>
  </div>`;
}

// ── EVENTS ─────────────────────────────────────────────────────
function bindEvents(root) {
  root.querySelector('#tab-staff').addEventListener('click',  () => switchMode('staff', root));
  root.querySelector('#tab-master').addEventListener('click', () => switchMode('master', root));
  root.querySelector('#btn-staff-login').addEventListener('click', () => handleStaffLogin(root));
  root.querySelector('#btn-master-verify').addEventListener('click', () => handleMasterVerify(root));

  root.querySelector('#staff-pin').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleStaffLogin(root);
  });
  root.querySelector('#master-pwd').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleMasterVerify(root);
  });
}

function switchMode(mode, root) {
  loginMode = mode;
  root.querySelector('#tab-staff').classList.toggle('active',   mode==='staff');
  root.querySelector('#tab-master').classList.toggle('active',  mode==='master');
  root.querySelector('#panel-staff').style.display  = mode==='staff'  ? 'block' : 'none';
  root.querySelector('#panel-master').style.display = mode==='master' ? 'block' : 'none';
  showError(root, '');
}

async function handleStaffLogin(root) {
  const pin = root.querySelector('#staff-pin').value.trim();
  const btn = root.querySelector('#btn-staff-login');
  btn.textContent = 'Checking…'; btn.disabled = true;

  const result = await auth.verifyStaff(pin);
  btn.textContent = 'Sign In →'; btn.disabled = false;

  if (result.ok) {
    store.setAuth(result.role, result.user);
    dispatchLogin(result);
  } else {
    showError(root, result.message);
    root.querySelector('#staff-pin').value = '';
    root.querySelector('#staff-pin').focus();
  }
}

async function handleMasterVerify(root) {
  const pwd = root.querySelector('#master-pwd').value.trim();
  const result = await auth.verifyMasterPassword(pwd);

  if (result.ok) {
    masterPwdOk = true;
    root.querySelector('#master-unlock').classList.add('show');
    showError(root, '');
    if (!dragInitd) { initDragSlider(root); dragInitd = true; }
  } else {
    showError(root, result.message || 'Incorrect password.');
  }
}

function showError(root, msg) {
  const el = root.querySelector('#login-error');
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}

function dispatchLogin(result) {
  document.dispatchEvent(new CustomEvent('app:login', { detail: result }));
}

// ── DRAG SLIDER ────────────────────────────────────────────────
function initDragSlider(root) {
  const track = root.querySelector('#drag-track');
  const thumb = root.querySelector('#drag-thumb');
  const fill  = root.querySelector('#drag-fill');
  const text  = root.querySelector('#drag-text');
  let dragging = false, startX = 0, thumbX = 0;

  const getX   = e => e.touches ? e.touches[0].clientX : e.clientX;
  const maxX   = () => track.offsetWidth - 52;

  thumb.addEventListener('mousedown',  e => { dragging=true; startX=getX(e)-thumbX; thumb.style.transition='none'; });
  thumb.addEventListener('touchstart', e => { dragging=true; startX=getX(e)-thumbX; thumb.style.transition='none'; }, { passive:true });

  document.addEventListener('mousemove',  e => onMove(e));
  document.addEventListener('touchmove',  e => onMove(e), { passive: true });
  document.addEventListener('mouseup',    () => { dragging=false; });
  document.addEventListener('touchend',   () => { dragging=false; });

  function onMove(e) {
    if (!dragging) return;
    const max = maxX();
    thumbX = Math.max(0, Math.min(getX(e) - startX, max));
    thumb.style.transform = `translateX(${thumbX}px)`;
    const pct = thumbX / max;
    fill.style.width  = (pct * 100) + '%';
    text.style.opacity = Math.max(0, 1 - pct * 2);
    if (pct > 0.95) { dragging=false; initHoldTimer(root); }
  }
}

// ── HOLD TIMER ─────────────────────────────────────────────────
function initHoldTimer(root) {
  const ring   = root.querySelector('#hold-ring');
  const circle = root.querySelector('#hold-circle');
  const num    = root.querySelector('#hold-num');
  ring.classList.add('show');

  let held = false, interval = null;

  ring.addEventListener('mousedown',  start);
  ring.addEventListener('touchstart', start, { passive: true });
  ring.addEventListener('mouseup',    stop);
  ring.addEventListener('touchend',   stop);

  function start() {
    held = true;
    const t0 = Date.now();
    interval = setInterval(() => {
      const elapsed = (Date.now() - t0) / 1000;
      const progress = Math.min(elapsed / 5, 1);
      circle.style.strokeDashoffset = 220 * (1 - progress);
      num.textContent = Math.max(0, Math.ceil(5 - elapsed));
      if (elapsed >= 5) {
        clearInterval(interval);
        completeMaster();
      }
    }, 50);
  }

  function stop() {
    held = false;
    clearInterval(interval);
    circle.style.strokeDashoffset = 220;
    num.textContent = '5';
  }

  async function completeMaster() {
    const result = await auth.completeMasterAuth();
    if (result.ok) {
      store.setAuth(result.role, result.user);
      dispatchLogin(result);
    }
  }
}
