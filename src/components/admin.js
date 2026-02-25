/**
 * Admin Component — Master-only control panel
 * Hidden from staff role entirely. Only shown after master auth.
 */

import * as store    from '../store/index.js';
import * as exportSvc from '../services/export.js';
import { DAYS }       from '../data/store-bp.js';

export function mount(el) {
  el.innerHTML = renderHTML();
  store.subscribe('navigate', v => { if (v === 'admin') render(el); });
  store.subscribe('auditChange', () => renderAudit(el));
  render(el);
  bindEvents(el);
}

function renderHTML() {
  return `<div class="vpad">

  <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
    <div style="background:var(--mint-soft2);border-radius:8px;padding:8px 12px;font-size:0.75rem;font-weight:700;color:var(--mint-dark)">
      🔐 Master Mode Active
    </div>
    <span style="font-size:0.72rem;color:var(--text3)" id="adm-user-info"></span>
  </div>

  <!-- Store settings -->
  <div class="admin-section">
    <div class="admin-section-title">⚙️ Store & Targets</div>
    <div class="g2">
      <div class="field"><div class="field-header"><label class="field-label">Store Name</label></div><div class="field-input"><input type="text" id="adm-store" placeholder="Dubai Airport T3"></div></div>
      <div class="field"><div class="field-header"><label class="field-label">Week Number</label></div><div class="field-input"><input type="number" id="adm-wk" placeholder="8" inputmode="numeric"></div></div>
    </div>
    <div class="g2">
      <div class="field"><div class="field-header"><label class="field-label">Daily BP Override</label></div><div class="field-input"><input type="number" id="adm-dbp" placeholder="Auto from store data"></div></div>
      <div class="field"><div class="field-header"><label class="field-label">Week BP Override</label></div><div class="field-input"><input type="number" id="adm-wbp" placeholder="Auto"></div></div>
    </div>
    <div class="g2">
      <div class="field"><div class="field-header"><label class="field-label">No7 Daily BP</label></div><div class="field-input"><input type="number" id="adm-n7dbp" placeholder="2650"></div></div>
      <div class="field"><div class="field-header"><label class="field-label">No7 Weekly BP</label></div><div class="field-input"><input type="number" id="adm-n7wbp" placeholder="18550"></div></div>
    </div>
    <div class="g2">
      <div class="field"><div class="field-header"><label class="field-label">KD Rate (1 KD = ? AED)</label></div><div class="field-input"><input type="number" id="adm-kd" step="0.01" placeholder="11.99"></div></div>
      <div class="field"><div class="field-header"><label class="field-label">Division A % Split</label></div><div class="field-input"><input type="number" id="adm-diva" placeholder="60"><span class="field-suffix">%</span></div></div>
    </div>
    <button class="btn btn-mint" id="btn-save-settings">Save Settings</button>
  </div>

  <!-- Staff -->
  <div class="admin-section">
    <div class="admin-section-title">👥 Staff Manager</div>
    <div id="adm-staff-list"></div>
    <button class="btn btn-outline" style="margin-top:10px" id="btn-add-staff">+ Add Staff Member</button>
  </div>

  <!-- Checklist editor -->
  <div class="admin-section">
    <div class="admin-section-title">📋 Checklist Items</div>
    <div id="adm-chklist"></div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <input type="text" id="new-chk-item" placeholder="New checklist item"
        style="flex:1;height:40px;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:0 12px;font-size:0.85rem;background:var(--bg);outline:none">
      <button class="btn btn-mint btn-sm" id="btn-add-chk" style="white-space:nowrap">+ Add</button>
    </div>
  </div>

  <!-- Feature toggles -->
  <div class="admin-section">
    <div class="admin-section-title">🔧 Feature Toggles</div>
    <div class="admin-row"><span>OCR / Photo Parsing</span><div class="toggle" id="tog-ocr" data-feat="ocr"></div></div>
    <div class="admin-row"><span>Confetti on Target Beat</span><div class="toggle" id="tog-confetti" data-feat="confetti"></div></div>
    <div class="admin-row"><span>Staff Tracker</span><div class="toggle" id="tog-staff" data-feat="staffTracker"></div></div>
    <div class="admin-row"><span>Division Split View</span><div class="toggle" id="tog-div" data-feat="divSplit"></div></div>
    <div class="admin-row"><span>KD Converter</span><div class="toggle" id="tog-kd" data-feat="kdConverter"></div></div>
  </div>

  <!-- Export -->
  <div class="admin-section">
    <div class="admin-section-title">📤 Export Data</div>
    <div class="export-grid">
      <div class="export-btn" id="btn-exp-csv"><div style="font-size:1.4rem">📊</div><div style="font-size:0.7rem;font-weight:700;color:var(--text2)">Export CSV</div><div style="font-size:0.58rem;color:var(--text3)">All weeks data</div></div>
      <div class="export-btn" id="btn-exp-json"><div style="font-size:1.4rem">🗂️</div><div style="font-size:0.7rem;font-weight:700;color:var(--text2)">Export JSON</div><div style="font-size:0.58rem;color:var(--text3)">Full backup</div></div>
    </div>
  </div>

  <!-- Audit -->
  <div class="admin-section">
    <div class="admin-section-title">🕐 Audit Trail</div>
    <div id="adm-audit"></div>
  </div>

  <!-- Manager review -->
  <div class="admin-section">
    <div class="admin-section-title">✅ Manager Review</div>
    <div id="adm-review"></div>
  </div>

  <button class="btn btn-red" id="btn-clear-all" style="margin-top:8px">⚠️ Clear All Data</button>

  </div>`;
}

function render(el) {
  const { settings, staff, checklist, auditLog } = store.state;

  // Populate fields
  val(el,'#adm-store', settings.store);
  val(el,'#adm-wk',    settings.wk);
  val(el,'#adm-dbp',   settings.dbpOverride  || '');
  val(el,'#adm-wbp',   settings.wbpOverride  || '');
  val(el,'#adm-n7dbp', settings.n7dailyBP    || 2650);
  val(el,'#adm-n7wbp', settings.n7weeklyBP   || 18550);
  val(el,'#adm-kd',    settings.kdRate        || 11.99);
  val(el,'#adm-diva',  settings.divAPercent   || 60);
  t(el,'#adm-user-info', `Logged in as ${store.state.user}`);

  // Toggles
  const feats = settings.features || {};
  el.querySelectorAll('[data-feat]').forEach(tog => {
    tog.classList.toggle('on', feats[tog.dataset.feat] !== false);
  });

  // Staff list
  const staffListEl = el.querySelector('#adm-staff-list');
  if (staffListEl) staffListEl.innerHTML = staff.map(s => `
    <div class="admin-row">
      <div><div style="font-weight:500">${s.name}</div><div style="font-size:0.6rem;color:var(--text3)">Weekly Target: AED ${s.wkTarget}</div></div>
      <input type="number" value="${s.wkTarget}" data-stf-id="${s.id}"
        style="width:80px;height:32px;border:1px solid var(--border);border-radius:6px;padding:0 8px;font-size:0.8rem;background:var(--bg);font-family:var(--font-mono)">
    </div>`).join('');

  // Checklist items
  const chkEl = el.querySelector('#adm-chklist');
  if (chkEl) chkEl.innerHTML = checklist.map((item,i) => `
    <div class="admin-row">
      <span>${item}</span>
      <button data-del-chk="${i}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.75rem;font-weight:600">Remove</button>
    </div>`).join('');

  // Review weeks
  renderReview(el, settings.wk);
  renderAudit(el);
}

function renderAudit(el) {
  const auditEl = el.querySelector('#adm-audit');
  if (!auditEl) return;
  const log = store.state.auditLog;
  auditEl.innerHTML = log.length
    ? log.slice(0,15).map(a => `
      <div class="audit-item">
        <div class="audit-dot"></div>
        <div class="audit-text"><strong>${a.action.replace(/_/g,' ')}</strong><br>${a.detail} <span style="color:var(--text3)">· ${a.user}</span></div>
        <div class="audit-ts">${new Date(a.ts).toLocaleString('en-AE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
      </div>`).join('')
    : '<div style="font-size:0.78rem;color:var(--text3);padding:8px 0">No entries yet</div>';
}

function renderReview(el, currentWk) {
  const reviewEl = el.querySelector('#adm-review');
  if (!reviewEl) return;
  const weeks = [currentWk-2, currentWk-1, currentWk].filter(w => w > 0);
  reviewEl.innerHTML = weeks.map(w => {
    const locked = store.isWeekLocked(w);
    return `<div class="admin-row">
      <span style="font-weight:500">Week ${w}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${locked?'badge-red':'badge-mint'}">${locked?'🔒 Locked':'✓ Open'}</span>
        <button data-lock="${w}" class="btn btn-outline btn-sm" style="height:30px;font-size:0.7rem">
          ${locked?'Unlock':'Lock & Review'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function bindEvents(el) {
  // Save settings
  el.querySelector('#btn-save-settings')?.addEventListener('click', () => {
    store.saveSettings({
      store:        el.querySelector('#adm-store').value,
      wk:           parseInt(el.querySelector('#adm-wk').value) || store.state.settings.wk,
      dbpOverride:  parseFloat(el.querySelector('#adm-dbp').value) || null,
      wbpOverride:  parseFloat(el.querySelector('#adm-wbp').value) || null,
      n7dailyBP:    parseFloat(el.querySelector('#adm-n7dbp').value) || 2650,
      n7weeklyBP:   parseFloat(el.querySelector('#adm-n7wbp').value) || 18550,
      kdRate:       parseFloat(el.querySelector('#adm-kd').value) || 11.99,
      divAPercent:  parseFloat(el.querySelector('#adm-diva').value) || 60,
    });
    document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: '✓ Settings saved', type: 'success' } }));
  });

  // Toggles
  el.addEventListener('click', e => {
    const tog = e.target.closest('[data-feat]');
    if (tog) {
      tog.classList.toggle('on');
      const feats = { ...store.state.settings.features };
      feats[tog.dataset.feat] = tog.classList.contains('on');
      store.saveSettings({ features: feats });
    }
    if (e.target.dataset.delChk !== undefined) {
      const i = parseInt(e.target.dataset.delChk);
      const items = [...store.state.checklist];
      items.splice(i, 1);
      store.saveChecklist(items);
      render(el);
    }
    if (e.target.dataset.lock !== undefined) {
      const w = parseInt(e.target.dataset.lock);
      const locked = store.toggleWeekLock(w);
      document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: `${locked?'🔒':'🔓'} Week ${w} ${locked?'locked':'unlocked'}`, type:'success' } }));
      render(el);
    }
    if (e.target.id === 'btn-add-staff') {
      const name = prompt('Staff member name:');
      if (name) { store.addStaffMember(name); render(el); }
    }
    if (e.target.id === 'btn-add-chk') {
      const val2 = el.querySelector('#new-chk-item').value.trim();
      if (val2) { store.saveChecklist([...store.state.checklist, val2]); el.querySelector('#new-chk-item').value = ''; render(el); }
    }
    if (e.target.id === 'btn-exp-csv')  exportSvc.exportCSV(store.state.settings);
    if (e.target.id === 'btn-exp-json') exportSvc.exportJSON();
    if (e.target.id === 'btn-clear-all') {
      if (confirm('⚠️ Clear ALL data? This cannot be undone.')) {
        const { clearAll } = await import('../store/db.js');
        clearAll();
        document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'All data cleared' } }));
        setTimeout(() => location.reload(), 800);
      }
    }
  });

  // Staff target input
  el.addEventListener('change', e => {
    if (e.target.dataset.stfId) {
      const id  = parseInt(e.target.dataset.stfId);
      const s   = store.state.staff.find(x => x.id === id);
      if (s) {
        s.wkTarget = parseFloat(e.target.value) || s.wkTarget;
        store.saveStaff(store.state.staff);
      }
    }
  });
}

function val(el, sel, v) { const e=el.querySelector(sel); if(e) e.value=v; }
function t(el, sel, v)   { const e=el.querySelector(sel); if(e) e.textContent=v; }
