/**
 * js/views/admin.js
 * ─────────────────────────────────────────────────────
 * Admin panel — master access only.
 */

import {
  store, saveSettings, toggleFeature,
  addStaffMember, updateStaffTarget,
  addChecklistItem, removeChecklistItem,
  toggleWeekLock, addAuditEntry,
} from '../store/index.js';
import { db } from '../services/db.js';
import { exportCSV, exportJSON, importJSON } from '../utils/export.js';
import { fmtAED, fmtDateTime } from '../utils/format.js';
import { toast, el, setText, setVal, gNum, gStr } from '../utils/ui.js';

export function renderAdmin() {
  const container = el('view-admin');
  if (!container) return;
  container.innerHTML = adminHTML();
  populateForm();
  bindEvents();
}

// ── HTML ──────────────────────────────────────────────
function adminHTML() {
  return `<div class="view-pad">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="background:var(--mint-soft2);border-radius:8px;padding:7px 12px;font-size:.74rem;font-weight:700;color:var(--mint-dark)">🔐 Master Mode</div>
    </div>

    <!-- Store & targets -->
    <div class="admin-section">
      <div class="admin-section-title">⚙️ Store &amp; Targets</div>
      <div class="g2">
        <div class="field"><label class="field-label" for="adm-store">Store Name</label><div class="field-input"><input type="text" id="adm-store" placeholder="Dubai Airport T3"></div></div>
        <div class="field"><label class="field-label" for="adm-wk">Week Number</label><div class="field-input"><input type="number" id="adm-wk" inputmode="numeric"></div></div>
      </div>
      <div class="g2">
        <div class="field"><label class="field-label" for="adm-dbp">Daily BP Override</label><div class="field-input"><input type="number" id="adm-dbp" placeholder="Auto from BP data" inputmode="numeric"></div></div>
        <div class="field"><label class="field-label" for="adm-wbp">Week BP Override</label><div class="field-input"><input type="number" id="adm-wbp" placeholder="Auto" inputmode="numeric"></div></div>
      </div>
      <div class="g2">
        <div class="field"><label class="field-label" for="adm-n7dbp">No7 Daily BP</label><div class="field-input"><input type="number" id="adm-n7dbp" inputmode="numeric"></div></div>
        <div class="field"><label class="field-label" for="adm-n7wbp">No7 Weekly BP</label><div class="field-input"><input type="number" id="adm-n7wbp" inputmode="numeric"></div></div>
      </div>
      <div class="g2">
        <div class="field"><label class="field-label" for="adm-kd">KD Rate (1 KD = ? AED)</label><div class="field-input"><input type="number" id="adm-kd" step="0.01" inputmode="decimal"></div></div>
        <div class="field"><label class="field-label" for="adm-diva">Division A %</label><div class="field-input"><input type="number" id="adm-diva" inputmode="numeric"><span class="field-suffix">%</span></div></div>
      </div>
      <button class="btn btn-primary" id="btn-save-settings">Save Settings</button>
    </div>

    <!-- Staff manager -->
    <div class="admin-section">
      <div class="admin-section-title">👥 Staff Manager</div>
      <div id="admin-staff-list"></div>
      <button class="btn btn-outline" style="margin-top:10px" id="btn-add-staff">+ Add Staff Member</button>
    </div>

    <!-- Checklist editor -->
    <div class="admin-section">
      <div class="admin-section-title">📋 Checklist Items</div>
      <div id="admin-chk-list"></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input type="text" id="new-chk-item" placeholder="Add new checklist item"
          style="flex:1;height:40px;border:1.5px solid var(--border);border-radius:var(--r);padding:0 12px;font-size:.85rem;background:var(--bg);outline:none;font-family:var(--font-sans)">
        <button class="btn btn-primary btn-sm" id="btn-add-chk">+ Add</button>
      </div>
    </div>

    <!-- Feature toggles -->
    <div class="admin-section">
      <div class="admin-section-title">🔧 Feature Toggles</div>
      ${['ocr','confetti','staff','divisions','kd'].map(f => `
      <div class="admin-row">
        <span class="admin-row-label">${featureLabel(f)}</span>
        <button class="toggle" id="tog-${f}" aria-label="Toggle ${f}"></button>
      </div>`).join('')}
    </div>

    <!-- Export / Import -->
    <div class="admin-section">
      <div class="admin-section-title">📤 Export &amp; Backup</div>
      <div class="export-grid">
        <div class="export-btn" id="btn-export-csv"><div class="export-btn-icon">📊</div><div class="export-btn-label">Export CSV</div><div class="export-btn-sub">All weeks</div></div>
        <div class="export-btn" id="btn-export-json"><div class="export-btn-icon">🗂️</div><div class="export-btn-label">JSON Backup</div><div class="export-btn-sub">Full backup</div></div>
      </div>
      <div style="margin-top:10px">
        <label class="field-label" for="import-file">Import JSON Backup</label>
        <input type="file" id="import-file" accept=".json" style="margin-top:5px;font-size:.8rem">
      </div>
    </div>

    <!-- Audit trail -->
    <div class="admin-section">
      <div class="admin-section-title">🕐 Audit Trail <span style="font-size:.65rem;font-weight:500;color:var(--text-3)">(last 20)</span></div>
      <div id="audit-trail"></div>
    </div>

    <!-- Manager review -->
    <div class="admin-section">
      <div class="admin-section-title">✅ Manager Review &amp; Week Locks</div>
      <div id="review-weeks"></div>
    </div>

    <!-- Danger zone -->
    <div class="admin-section" style="border-color:var(--red);margin-top:16px">
      <div class="admin-section-title" style="color:var(--red)">⚠️ Danger Zone</div>
      <button class="btn btn-danger btn-full" id="btn-clear-all">Clear All Data</button>
    </div>
  </div>`;
}

function featureLabel(f) {
  return { ocr:'OCR / Photo Parsing', confetti:'Confetti on Target Beat', staff:'Staff Tracker', divisions:'Division Split View', kd:'KD Converter' }[f] || f;
}

// ── Populate form ─────────────────────────────────────
function populateForm() {
  const s = store.settings;
  setVal('adm-store', s.store);
  setVal('adm-wk',    s.weekNum);
  setVal('adm-dbp',   s.dbpOverride || '');
  setVal('adm-wbp',   s.wbpOverride || '');
  setVal('adm-n7dbp', s.n7DailyBP);
  setVal('adm-n7wbp', s.n7WeeklyBP);
  setVal('adm-kd',    s.kdRate);
  setVal('adm-diva',  s.divAPercent);

  // Toggles
  const feats = s.features || {};
  ['ocr','confetti','staff','divisions','kd'].forEach(f => {
    const tog = el('tog-' + f);
    if (tog) tog.classList.toggle('on', feats[f] !== false);
  });

  renderStaffList();
  renderChecklistAdmin();
  renderAuditTrail();
  renderReviewWeeks();
}

// ── Staff list (admin) ────────────────────────────────
function renderStaffList() {
  const container = el('admin-staff-list');
  if (!container) return;
  container.innerHTML = store.staff.map(s => `
    <div class="admin-row">
      <div>
        <div class="admin-row-label">${s.name}</div>
        <div class="admin-row-sub">Weekly No7 Target: AED ${fmtAED(s.weeklyTarget)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <input type="number" value="${s.weeklyTarget}"
          style="width:80px;height:32px;border:1.5px solid var(--border);border-radius:6px;padding:0 8px;font-size:.8rem;background:var(--bg);font-family:var(--font-mono);outline:none"
          onchange="window._updateStaffTarget(${s.id}, parseFloat(this.value))">
      </div>
    </div>`).join('');
  window._updateStaffTarget = (id, v) => { updateStaffTarget(id, v); };
}

// ── Checklist admin ───────────────────────────────────
function renderChecklistAdmin() {
  const container = el('admin-chk-list');
  if (!container) return;
  container.innerHTML = store.checklist.map((item, i) => `
    <div class="admin-row">
      <span class="admin-row-label">${item}</span>
      <button onclick="window._removeChk(${i})"
        style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.72rem;font-weight:700">Remove</button>
    </div>`).join('');
  window._removeChk = (i) => { removeChecklistItem(i); renderChecklistAdmin(); };
}

// ── Audit trail ───────────────────────────────────────
function renderAuditTrail() {
  const container = el('audit-trail');
  if (!container) return;
  const log = store.auditLog.slice(0, 20);
  container.innerHTML = log.length
    ? log.map(a => `
      <div class="audit-item">
        <div class="audit-dot"></div>
        <div class="audit-body"><strong>${a.action.replace(/_/g,' ')}</strong><br>${a.detail} <span style="color:var(--text-3)">· ${a.user}</span></div>
        <div class="audit-ts">${fmtDateTime(a.ts)}</div>
      </div>`).join('')
    : '<div style="font-size:.78rem;color:var(--text-3);padding:8px 0">No audit entries yet.</div>';
}

// ── Week review/lock ──────────────────────────────────
function renderReviewWeeks() {
  const container = el('review-weeks');
  if (!container) return;
  const wk = store.settings.weekNum;
  const weeks = [wk-2, wk-1, wk].filter(w => w > 0);
  container.innerHTML = weeks.map(w => {
    const locked = store.weekLocks[w];
    return `<div class="admin-row">
      <span class="admin-row-label">Week ${w}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${locked ? 'badge-red' : 'badge-mint'}">${locked ? '🔒 Locked' : '✓ Open'}</span>
        <button class="btn btn-outline btn-sm" onclick="window._toggleLock(${w})">${locked ? 'Unlock' : 'Lock'}</button>
      </div>
    </div>`;
  }).join('');
  window._toggleLock = (w) => {
    const now = toggleWeekLock(w);
    addAuditEntry(`week_${now?'locked':'unlocked'}`, `Week ${w}`, store.auth.user, store.auth.role);
    renderReviewWeeks();
    toast((now ? `🔒 Week ${w} locked` : `🔓 Week ${w} unlocked`), 'success');
  };
}

// ── Event binding ─────────────────────────────────────
function bindEvents() {
  // Save settings
  el('btn-save-settings')?.addEventListener('click', () => {
    saveSettings({
      store:        gStr('adm-store') || store.settings.store,
      weekNum:      parseInt(el('adm-wk')?.value) || store.settings.weekNum,
      dbpOverride:  gNum('adm-dbp'),
      wbpOverride:  gNum('adm-wbp'),
      n7DailyBP:    gNum('adm-n7dbp') || store.settings.n7DailyBP,
      n7WeeklyBP:   gNum('adm-n7wbp') || store.settings.n7WeeklyBP,
      kdRate:       gNum('adm-kd')    || store.settings.kdRate,
      divAPercent:  gNum('adm-diva')  || store.settings.divAPercent,
    });
    addAuditEntry('settings_saved', `Week ${store.settings.weekNum}`, store.auth.user, store.auth.role);
    toast('✓ Settings saved', 'success');
  });

  // Add staff
  el('btn-add-staff')?.addEventListener('click', () => {
    const name = prompt('Staff member name:');
    if (!name?.trim()) return;
    addStaffMember(name.trim());
    renderStaffList();
    toast('✓ ' + name + ' added', 'success');
  });

  // Checklist add
  el('btn-add-chk')?.addEventListener('click', () => {
    const val = el('new-chk-item')?.value?.trim();
    if (!val) return;
    addChecklistItem(val);
    el('new-chk-item').value = '';
    renderChecklistAdmin();
    toast('Item added');
  });
  el('new-chk-item')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') el('btn-add-chk')?.click();
  });

  // Toggles
  ['ocr','confetti','staff','divisions','kd'].forEach(f => {
    el('tog-'+f)?.addEventListener('click', function() {
      toggleFeature(f);
      this.classList.toggle('on');
      toast(`${featureLabel(f)} ${store.settings.features[f] ? 'enabled' : 'disabled'}`);
    });
  });

  // Export
  el('btn-export-csv')?.addEventListener('click', () => { exportCSV(); toast('✓ CSV exported', 'success'); });
  el('btn-export-json')?.addEventListener('click', () => { exportJSON(); toast('✓ JSON exported', 'success'); });

  // Import
  el('import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = importJSON(text);
    if (result.ok) toast(`✓ Imported ${result.count} keys`, 'success');
    else toast('Import failed: ' + result.error, 'error');
    e.target.value = '';
  });

  // Clear all
  el('btn-clear-all')?.addEventListener('click', () => {
    if (confirm('⚠️ Clear ALL app data? This cannot be undone.\n\nMake a JSON backup first.')) {
      db.clearAll();
      toast('All data cleared');
      setTimeout(() => location.reload(), 800);
    }
  });
}
