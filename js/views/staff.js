/**
 * js/views/staff.js
 * ─────────────────────────────────────────────────────
 * Staff No7 tracker view.
 */

import { store, logStaffEntry, addAuditEntry } from '../store/index.js';
import { db } from '../services/db.js';
import { DAYS } from '../data/bp.js';
import { achColor, achBadgeClass } from '../utils/calc.js';
import { fmtAED, fmtPct } from '../utils/format.js';
import { toast, el, setText, setHtml, gNum } from '../utils/ui.js';

const AVATAR_COLORS = ['#00c896','#4a90d9','#f5a623','#8b5cf6','#f05050','#00a8d4','#2ecc71'];
let activeStaffId = null;

export function renderStaff() {
  const container = el('view-staff');
  if (!container) return;
  container.innerHTML = staffHTML();
  buildStaffView();
}

function staffHTML() {
  return `<div class="view-pad">
    <!-- Team summary -->
    <div class="card card-accent card-accent-mint" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:.8rem;font-weight:700">Team No7 · Week <span id="stf-wk">—</span></div>
        <span class="badge badge-mint" id="stf-team-badge">—</span>
      </div>
      <div class="g3">
        <div style="text-align:center">
          <div class="mono" style="font-size:1.25rem;font-weight:700;color:var(--mint-dark)" id="stf-team-total">—</div>
          <div style="font-size:.52rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Team Total</div>
        </div>
        <div style="text-align:center">
          <div class="mono" style="font-size:1.25rem;font-weight:700" id="stf-team-target">—</div>
          <div style="font-size:.52rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Team Target</div>
        </div>
        <div style="text-align:center">
          <div class="mono" style="font-size:1.25rem;font-weight:700" id="stf-team-pct">—%</div>
          <div style="font-size:.52rem;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">Achievement</div>
        </div>
      </div>
    </div>

    <!-- Staff cards -->
    <div id="staff-cards"></div>

    <!-- Log entry panel (master only) -->
    <div class="card" id="staff-entry-panel" hidden>
      <div style="font-size:.82rem;font-weight:700;margin-bottom:12px">Log No7 Entry · <span id="stf-entry-name"></span></div>
      <div class="g2">
        <div class="field">
          <label class="field-label" for="stf-no7">No7 Sales (AED)</label>
          <div class="field-input"><input type="number" id="stf-no7" class="mono" placeholder="0" inputmode="numeric"></div>
        </div>
        <div class="field">
          <label class="field-label" for="stf-no7trn">No7 TRN</label>
          <div class="field-input"><input type="number" id="stf-no7trn" class="mono" placeholder="0" inputmode="numeric"></div>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="stf-day">Day</label>
        <div class="field-input">
          <select id="stf-day">${DAYS.map(d => `<option>${d}</option>`).join('')}</select>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="btn-stf-save">Save</button>
        <button class="btn btn-outline" id="btn-stf-cancel">Cancel</button>
      </div>
    </div>
  </div>`;
}

function buildStaffView() {
  const { weekNum } = store.settings;
  setText('stf-wk', weekNum);

  // Compute per-staff totals
  const ranked = store.staff.map(s => {
    const wkTotal = DAYS.reduce((sum, d) => {
      const e = (s.entries || {})[db.entryKey(weekNum, d)];
      return sum + (e?.no7 || 0);
    }, 0);
    return { ...s, wkTotal, pct: s.weeklyTarget ? (wkTotal / s.weeklyTarget) * 100 : 0 };
  }).sort((a, b) => b.pct - a.pct);

  // Team totals
  const teamTotal  = ranked.reduce((s, x) => s + x.wkTotal, 0);
  const teamTarget = ranked.reduce((s, x) => s + x.weeklyTarget, 0);
  const teamPct    = teamTarget ? (teamTotal / teamTarget) * 100 : 0;

  setText('stf-team-total',  'AED ' + fmtAED(teamTotal));
  setText('stf-team-target', 'AED ' + fmtAED(teamTarget));
  const pctEl = el('stf-team-pct');
  if (pctEl) { pctEl.textContent = fmtPct(teamPct); pctEl.style.color = achColor(teamPct); }
  const badge = el('stf-team-badge');
  if (badge) { badge.textContent = fmtPct(teamPct) + ' achieved'; badge.className = 'badge ' + achBadgeClass(teamPct); }

  // Render staff cards
  const isMaster = store.auth.role === 'master';
  const cardsEl  = el('staff-cards');
  if (cardsEl) {
    cardsEl.innerHTML = ranked.map((s, idx) => {
      const color    = AVATAR_COLORS[s.colorIdx % AVATAR_COLORS.length];
      const barColor = achColor(s.pct);
      const rankHtml = idx === 0 ? '<div class="rank-badge rank-1">1</div>'
                     : idx === 1 ? '<div class="rank-badge rank-2">2</div>'
                     : idx === 2 ? '<div class="rank-badge rank-3">3</div>'
                     : `<div class="rank-badge rank-n">${idx+1}</div>`;
      return `<div class="staff-card">
        <div class="staff-card-top">
          <div class="staff-info">
            ${rankHtml}
            <div class="staff-avatar" style="background:${color}20;color:${color}">${s.initials}</div>
            <div>
              <div class="staff-name">${s.name}</div>
              <div class="staff-role">No7 Specialist</div>
            </div>
          </div>
          ${isMaster ? `<button class="btn btn-outline btn-sm" data-staffid="${s.id}" onclick="window._openStaffEntry(${s.id})">+ Log</button>` : ''}
        </div>
        <div class="staff-nums">
          <div class="staff-num"><div class="staff-num-value" style="color:${color}">AED ${fmtAED(s.wkTotal)}</div><div class="staff-num-label">Achieved</div></div>
          <div class="staff-num"><div class="staff-num-value">AED ${fmtAED(s.weeklyTarget)}</div><div class="staff-num-label">Target</div></div>
          <div class="staff-num"><div class="staff-num-value" style="color:${barColor}">${fmtPct(s.pct)}</div><div class="staff-num-label">Achievement</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.62rem;color:var(--text-2);margin-bottom:4px">
          <span>No7 Progress</span><span style="color:${barColor}">${fmtPct(s.pct)}</span>
        </div>
        <div class="pbar-track"><div class="pbar-fill" style="width:${Math.min(100,s.pct)}%;background:${barColor}"></div></div>
      </div>`;
    }).join('');
  }

  // Master entry panel binding
  window._openStaffEntry = (id) => openStaffEntry(id);
  el('btn-stf-save')?.addEventListener('click', saveStaffEntry);
  el('btn-stf-cancel')?.addEventListener('click', closeStaffEntry);
}

function openStaffEntry(id) {
  activeStaffId = id;
  const s = store.staff.find(x => x.id === id);
  setText('stf-entry-name', s?.name || '');
  const panel = el('staff-entry-panel');
  if (panel) {
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth' });
  }
  el('stf-day').value = store.settings.currentDay;
  el('stf-no7').value = '';
  el('stf-no7trn').value = '';
}

function closeStaffEntry() {
  el('staff-entry-panel').hidden = true;
  activeStaffId = null;
}

function saveStaffEntry() {
  const s = store.staff.find(x => x.id === activeStaffId);
  if (!s) return;
  const no7    = gNum('stf-no7')    || 0;
  const no7trn = gNum('stf-no7trn') || 0;
  const day    = el('stf-day')?.value || store.settings.currentDay;
  const dayKey = db.entryKey(store.settings.weekNum, day);

  logStaffEntry(activeStaffId, dayKey, { no7, no7trn, by: store.auth.user });
  addAuditEntry('staff_entry', `${s.name}: No7 AED ${fmtAED(no7)} on ${day}`, store.auth.user, store.auth.role);
  toast(`✓ ${s.name} entry saved`, 'success');
  closeStaffEntry();
  buildStaffView();

  // Confetti if target beaten
  const { weekNum } = store.settings;
  const wkTotal = DAYS.reduce((sum, d) => {
    const e = (s.entries || {})[db.entryKey(weekNum, d)];
    return sum + (e?.no7 || 0);
  }, 0) + no7;
  if (wkTotal >= s.weeklyTarget && store.settings.features.confetti) {
    setTimeout(() => {
      const { celebrate } = import('../utils/ui.js');
      celebrate && celebrate('🏆');
    }, 300);
  }
}
