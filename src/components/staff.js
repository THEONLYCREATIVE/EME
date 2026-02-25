/**
 * Staff Tracker Component
 */

import * as store     from '../store/index.js';
import * as analytics from '../services/analytics.js';
import { AVATAR_COLORS, DAYS } from '../data/store-bp.js';

let activeStaffId = null;

export function mount(el) {
  el.innerHTML = renderHTML();
  store.subscribe('navigate',       v => { if (v === 'staff') render(el); });
  store.subscribe('staffEntryChange', () => render(el));
  render(el);
  bindEvents(el);
}

function renderHTML() {
  return `<div class="vpad">
  <div class="card card-accent mint" id="stf-team-summary" style="margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:0.78rem;font-weight:700">Team No7 · Week <span id="stf-wk"></span></div>
      <span class="badge badge-mint" id="stf-team-badge">Loading…</span>
    </div>
    <div class="g3">
      <div style="text-align:center"><div style="font-family:var(--font-mono);font-size:1.3rem;font-weight:700;color:var(--mint-dark)" id="stf-team-total">—</div><div class="kpi-sub">Team Total</div></div>
      <div style="text-align:center"><div style="font-family:var(--font-mono);font-size:1.3rem;font-weight:700" id="stf-team-target">—</div><div class="kpi-sub">Team Target</div></div>
      <div style="text-align:center"><div style="font-family:var(--font-mono);font-size:1.3rem;font-weight:700" id="stf-team-pct">—%</div><div class="kpi-sub">Achievement</div></div>
    </div>
  </div>
  <div id="stf-cards"></div>
  <div id="stf-entry-panel" style="display:none" class="card">
    <div style="font-size:0.8rem;font-weight:700;margin-bottom:12px">Log No7 Entry · <span id="stf-entry-name"></span></div>
    <div class="g2">
      <div class="field"><div class="field-header"><label class="field-label">No7 Sales</label></div><div class="field-input"><input type="number" id="stf-no7" placeholder="0" inputmode="numeric"></div></div>
      <div class="field"><div class="field-header"><label class="field-label">No7 TRN</label></div><div class="field-input"><input type="number" id="stf-no7trn" placeholder="0" inputmode="numeric"></div></div>
    </div>
    <div class="field">
      <div class="field-header"><label class="field-label">Day</label></div>
      <div class="field-input"><select id="stf-day">${DAYS.map(d=>`<option>${d}</option>`).join('')}</select></div>
    </div>
    <div class="btn-row">
      <button class="btn btn-mint" id="btn-stf-save">Save</button>
      <button class="btn btn-outline" id="btn-stf-cancel">Cancel</button>
    </div>
  </div>
  </div>`;
}

function render(el) {
  const { settings, staff } = store.state;
  const wk = settings.wk;
  t(el, '#stf-wk', wk);

  // Compute + rank
  const ranked = staff.map(s => {
    const { total, trn } = analytics.staffWeekRollup(s.id, wk);
    const pct = s.wkTarget ? (total / s.wkTarget) * 100 : 0;
    return { ...s, total, trn, pct };
  }).sort((a,b) => b.pct - a.pct);

  const teamTotal  = ranked.reduce((s,m) => s + m.total, 0);
  const teamTarget = ranked.reduce((s,m) => s + m.wkTarget, 0);
  const teamPct    = teamTarget ? (teamTotal / teamTarget) * 100 : 0;

  t(el, '#stf-team-total',  `AED ${analytics.fmt(teamTotal)}`);
  t(el, '#stf-team-target', `AED ${analytics.fmt(teamTarget)}`);
  const pctEl = el.querySelector('#stf-team-pct');
  if (pctEl) { pctEl.textContent = analytics.fmtP(teamPct); pctEl.style.color = analytics.achColor(teamPct); }
  const badgeEl = el.querySelector('#stf-team-badge');
  if (badgeEl) { badgeEl.textContent = analytics.fmtP(teamPct)+' achieved'; badgeEl.className = 'badge '+analytics.achBadge(teamPct); }

  const cardsEl = el.querySelector('#stf-cards');
  if (!cardsEl) return;
  cardsEl.innerHTML = ranked.map((s, idx) => {
    const color  = AVATAR_COLORS[s.color % AVATAR_COLORS.length];
    const barCol = analytics.achColor(s.pct);
    const rank = idx<3
      ? `<div class="rank-badge rank-${idx+1}">${idx+1}</div>`
      : `<div class="rank-badge rank-n">${idx+1}</div>`;
    const logBtn = store.state.role === 'master'
      ? `<button class="btn btn-outline btn-sm" data-log="${s.id}">+ Log</button>` : '';
    return `<div class="staff-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px">
          ${rank}
          <div class="staff-avatar" style="background:${color}20;color:${color}">${s.initials}</div>
          <div>
            <div style="font-size:0.88rem;font-weight:700">${s.name}</div>
            <div style="font-size:0.62rem;color:var(--text3)">No7 Specialist</div>
          </div>
        </div>
        ${logBtn}
      </div>
      <div class="staff-nums">
        <div><div class="staff-num-val" style="color:${color}">AED ${analytics.fmt(s.total)}</div><div class="staff-num-lbl">Achieved</div></div>
        <div><div class="staff-num-val">AED ${analytics.fmt(s.wkTarget)}</div><div class="staff-num-lbl">Target</div></div>
        <div><div class="staff-num-val" style="color:${barCol}">${analytics.fmtP(s.pct)}</div><div class="staff-num-lbl">Ach.</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.62rem;color:var(--text2);margin-bottom:4px">
        <span>Progress</span><span style="color:${barCol}">${analytics.fmtP(s.pct)}</span>
      </div>
      <div class="pbar-track"><div class="pbar-fill" style="width:${Math.min(100,s.pct)}%;background:${barCol}"></div></div>
    </div>`;
  }).join('');
}

function bindEvents(el) {
  el.addEventListener('click', e => {
    const logBtn = e.target.closest('[data-log]');
    if (logBtn) openEntry(parseInt(logBtn.dataset.log), el);
  });
  el.querySelector('#btn-stf-save')?.addEventListener('click', () => saveEntry(el));
  el.querySelector('#btn-stf-cancel')?.addEventListener('click', () => closeEntry(el));
}

function openEntry(staffId, el) {
  activeStaffId = staffId;
  const s = store.state.staff.find(x => x.id === staffId);
  t(el, '#stf-entry-name', s?.name || '');
  el.querySelector('#stf-no7').value    = '';
  el.querySelector('#stf-no7trn').value = '';
  el.querySelector('#stf-day').value    = store.state.activeDay;
  el.querySelector('#stf-entry-panel').style.display = 'block';
  el.querySelector('#stf-entry-panel').scrollIntoView({ behavior: 'smooth' });
}

function closeEntry(el) {
  el.querySelector('#stf-entry-panel').style.display = 'none';
  activeStaffId = null;
}

function saveEntry(el) {
  const no7    = parseFloat(el.querySelector('#stf-no7').value)    || 0;
  const no7trn = parseFloat(el.querySelector('#stf-no7trn').value) || 0;
  const day    = el.querySelector('#stf-day').value;
  store.saveStaffEntry(activeStaffId, store.state.settings.wk, day, { no7, no7trn });
  closeEntry(el);
  render(el);
  document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: '✓ Staff entry saved', type: 'success' } }));
}

function t(el, sel, val) { const e=el.querySelector(sel); if(e) e.textContent=val; }
