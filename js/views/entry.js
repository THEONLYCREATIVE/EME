/**
 * js/views/entry.js
 * ─────────────────────────────────────────────────────
 * Daily sales entry view.
 * Handles: day selection, form input, live KPI calc,
 *          photo/OCR, division split, WhatsApp share.
 */

import { store, saveSettings, addAuditEntry } from '../store/index.js';
import { db } from '../services/db.js';
import { parseImage } from '../services/ocr.js';
import { DAYS, DAYS_FULL, getDayBP, getWeekBP } from '../data/bp.js';
import { calcDayKPIs, calcWeekKPIs, achColor, achBadgeClass } from '../utils/calc.js';
import { fmtAED, fmtPct, fmtKD, fmtDateTime } from '../utils/format.js';
import { toast, celebrate, el, setText, setBar, gNum, setVal, debounce } from '../utils/ui.js';

// ── Render view HTML ──────────────────────────────────
export function renderEntry() {
  const container = el('view-entry');
  if (!container) return;
  container.innerHTML = entryHTML();
  bindEvents();
  refreshDay();
}

// ── HTML template ─────────────────────────────────────
function entryHTML() {
  return `
  <div class="view-pad">

    <!-- Week banner -->
    <div class="week-banner">
      <div class="week-banner-left">
        <h3 id="wb-week">Week — · 2026</h3>
        <p id="wb-day">—</p>
      </div>
      <div class="week-banner-right">
        <div class="week-banner-bp-lbl">Daily BP</div>
        <div class="week-banner-bp mono" id="wb-bp">AED —</div>
      </div>
    </div>

    <!-- Day picker -->
    <div class="day-pills" id="day-pills"></div>

    <!-- Accumulative week card -->
    <div class="accum-card" id="accum-card" hidden>
      <div class="accum-row">
        <span class="accum-label">Week Accumulative</span>
        <span class="accum-value mono" id="accum-value">AED —</span>
      </div>
      <div class="pbar-wrap">
        <div class="pbar-track"><div class="pbar-fill" id="accum-bar" style="width:0%"></div></div>
        <div class="pbar-labels">
          <span id="accum-pct">0%</span>
          <span id="accum-bp-lbl">of Week BP</span>
        </div>
      </div>
    </div>

    <!-- Photo capture card -->
    <div class="card card-accent card-accent-mint" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:.82rem;font-weight:700">📷 Quick Photo Entry</div>
        <button class="btn btn-outline btn-sm" id="btn-camera">📷 Capture</button>
      </div>
      <p style="font-size:.72rem;color:var(--text-3);line-height:1.5">Photograph your sales screen — fields will be auto-detected.</p>
      <div class="photo-preview" id="photo-preview">
        <img id="photo-img" src="" alt="Captured photo">
        <div class="photo-preview-actions">
          <button class="btn btn-outline btn-sm" id="btn-retake">Retake</button>
          <button class="btn btn-primary btn-sm" id="btn-parse">⚙ Parse Fields</button>
        </div>
      </div>
      <div class="ocr-panel" id="ocr-panel">
        <div style="font-size:.68rem;font-weight:700;color:var(--mint-dark);margin-bottom:8px">📊 Detected Fields</div>
        <div id="ocr-fields"></div>
        <button class="btn btn-primary" style="height:36px;font-size:.78rem;margin-top:8px" id="btn-apply-ocr">Apply to Form</button>
      </div>
    </div>

    <!-- SALES section -->
    <div class="section-label">Sales Data</div>
    <div class="g2">
      <div class="field">
        <div class="field-label-row">
          <label class="field-label" for="f-sales">Sales (AED)</label>
        </div>
        <div class="field-input">
          <input type="number" id="f-sales" class="mono" placeholder="0" inputmode="numeric">
          <span class="field-suffix" id="kd-sales"></span>
        </div>
        <div class="prev-chips" id="prev-sales"></div>
      </div>
      <div class="field">
        <label class="field-label" for="f-trn">TRN</label>
        <div class="field-input">
          <input type="number" id="f-trn" class="mono" placeholder="0" inputmode="numeric">
        </div>
        <div class="prev-chips" id="prev-trn"></div>
      </div>
    </div>
    <div class="g2">
      <div class="field">
        <label class="field-label" for="f-sfa">SFA %</label>
        <div class="field-input">
          <input type="number" id="f-sfa" class="mono" placeholder="0.0" step="0.1" inputmode="decimal">
        </div>
      </div>
      <div class="field">
        <div class="field-label-row">
          <label class="field-label" for="f-items">Total Items</label>
          <span class="badge badge-mint" style="font-size:.52rem">→IPC</span>
        </div>
        <div class="field-input">
          <input type="number" id="f-items" class="mono" placeholder="0" inputmode="numeric">
        </div>
      </div>
    </div>

    <!-- Live KPI mini-cards -->
    <div class="g3" style="margin-bottom:12px">
      <div class="kpi-card kpi-card-mint"><div class="kpi-label">ATV</div><div class="kpi-value" id="kv-atv">—</div><div class="kpi-sub">AUTO</div></div>
      <div class="kpi-card kpi-card-amber"><div class="kpi-label">IPC</div><div class="kpi-value" id="kv-ipc">—</div><div class="kpi-sub">AUTO</div></div>
      <div class="kpi-card kpi-card-blue"><div class="kpi-label">Conv.</div><div class="kpi-value" id="kv-conv">—</div><div class="kpi-sub">AUTO</div></div>
    </div>

    <!-- Sales vs BP hero -->
    <div class="card card-accent card-accent-mint" id="sales-hero" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-2)">Sales vs BP</span>
        <span class="badge badge-mint" id="sales-badge">—</span>
      </div>
      <div class="mono" style="font-size:2rem;font-weight:700;line-height:1" id="sales-hero-val">AED —</div>
      <div style="font-size:.72rem;color:var(--text-2);margin-top:4px" id="sales-hero-sub">Enter sales above</div>
      <div class="pbar-wrap" id="sales-hero-pbar" hidden>
        <div class="pbar-track"><div class="pbar-fill" id="sales-hero-fill" style="width:0%"></div></div>
        <div class="pbar-labels"><span>0</span><span id="sales-hero-bp-lbl"></span></div>
      </div>
    </div>

    <!-- NO7 section -->
    <div class="section-label">No7 Performance</div>
    <div class="g2">
      <div class="field">
        <label class="field-label" for="f-no7">No7 Sales (AED)</label>
        <div class="field-input">
          <input type="number" id="f-no7" class="mono" placeholder="0" inputmode="numeric">
          <span class="field-suffix" id="kd-no7"></span>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="f-no7trn">No7 TRN</label>
        <div class="field-input">
          <input type="number" id="f-no7trn" class="mono" placeholder="0" inputmode="numeric">
        </div>
      </div>
    </div>

    <!-- No7 live block -->
    <div class="card card-accent card-accent-blue" style="margin-bottom:12px">
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div><div style="font-size:.56rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">No7 Sales</div><div class="mono" style="font-size:1.3rem;font-weight:700;color:var(--blue)" id="kv-no7">AED —</div></div>
        <div style="width:1px;background:var(--border);align-self:stretch"></div>
        <div><div style="font-size:.56rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">VAT -5%</div><div class="mono" style="font-size:.95rem;font-weight:600;color:var(--text-2)" id="kv-no7vat">AED —</div></div>
        <div style="width:1px;background:var(--border);align-self:stretch"></div>
        <div><div style="font-size:.56rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">% of Sales</div><div class="mono" style="font-size:.95rem;font-weight:600" id="kv-no7pct">—%</div></div>
      </div>
      <div class="pbar-wrap" style="margin-top:8px">
        <div class="pbar-track"><div class="pbar-fill" id="no7-bar" style="width:0%;background:var(--blue)"></div></div>
        <div class="pbar-labels"><span id="kv-n7dpct">0% of No7 BP</span><span id="kv-n7wktot"></span></div>
      </div>
    </div>

    <!-- AURA section -->
    <div class="section-label">AURA &amp; Staff Metrics</div>
    <div class="g2">
      <div class="field">
        <label class="field-label" for="f-aura">AURA Signups</label>
        <div class="field-input"><input type="number" id="f-aura" class="mono" placeholder="0" inputmode="numeric"></div>
      </div>
      <div class="field">
        <label class="field-label" for="f-csat">CSAT / NPS</label>
        <div class="field-input"><input type="number" id="f-csat" class="mono" placeholder="0" inputmode="numeric"></div>
      </div>
    </div>
    <div class="field">
      <label class="field-label" for="f-focus">Focus Product Count</label>
      <div class="field-input"><input type="number" id="f-focus" class="mono" placeholder="0" inputmode="numeric"></div>
    </div>

    <!-- AURA live display -->
    <div class="card card-accent card-accent-mint" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="text-align:center"><div class="mono" style="font-size:1.5rem;font-weight:700;color:var(--mint-dark)" id="kv-aura">—</div><div style="font-size:.52rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">SIGNUPS</div></div>
        <div style="font-size:1.1rem;color:var(--text-3)">÷</div>
        <div style="text-align:center"><div class="mono" style="font-size:1.5rem;font-weight:700;color:var(--text-2)" id="kv-aura-trn">—</div><div style="font-size:.52rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">TRN</div></div>
        <div style="font-size:1.1rem;color:var(--text-3)">=</div>
        <div style="text-align:center"><div class="mono" style="font-size:1.8rem;font-weight:800;color:var(--mint-dark)" id="kv-aura-pct">—%</div><div style="font-size:.52rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">AURA CAPTURE</div></div>
      </div>
    </div>

    <!-- KD Converter -->
    <div id="kd-strip">
      <div class="section-label">KD Equivalent</div>
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <div style="flex:1;text-align:center;min-width:80px"><div style="font-size:.52rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">Total Sales</div><div class="mono" style="font-size:.9rem;font-weight:700;color:var(--amber);margin-top:4px" id="kd-total">— KD</div></div>
          <div style="width:1px;background:var(--border)"></div>
          <div style="flex:1;text-align:center;min-width:80px"><div style="font-size:.52rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">No7 Sales</div><div class="mono" style="font-size:.9rem;font-weight:700;color:var(--amber);margin-top:4px" id="kd-no7-val">— KD</div></div>
          <div style="width:1px;background:var(--border)"></div>
          <div style="flex:1;text-align:center;min-width:80px"><div style="font-size:.52rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3)">ATV</div><div class="mono" style="font-size:.9rem;font-weight:700;color:var(--amber);margin-top:4px" id="kd-atv-val">— KD</div></div>
        </div>
      </div>
    </div>

    <!-- Division split -->
    <div id="div-section">
      <div class="section-label">Division Split</div>
      <div class="division-split">
        <div class="div-card div-card-a">
          <div class="div-card-label">Division A</div>
          <div class="div-card-value" id="div-a-val">AED —</div>
          <div class="div-card-pct" id="div-a-pct">—% of total</div>
          <div class="pbar-wrap"><div class="pbar-track" style="background:rgba(0,200,150,.15)"><div class="pbar-fill" id="div-a-bar" style="width:0%;background:var(--mint)"></div></div></div>
        </div>
        <div class="div-card div-card-b">
          <div class="div-card-label">Division B</div>
          <div class="div-card-value" id="div-b-val">AED —</div>
          <div class="div-card-pct" id="div-b-pct">—% of total</div>
          <div class="pbar-wrap"><div class="pbar-track" style="background:rgba(74,144,217,.15)"><div class="pbar-fill" id="div-b-bar" style="width:0%;background:var(--blue)"></div></div></div>
        </div>
      </div>
    </div>

    <!-- Timestamp -->
    <div class="mono" style="font-size:.58rem;color:var(--text-3);text-align:right;margin-bottom:8px" id="entry-ts"></div>

    <!-- Actions -->
    <div class="btn-row">
      <button class="btn btn-primary" id="btn-save-entry">✓ Save Entry</button>
      <button class="btn btn-outline" id="btn-clear-entry">Clear</button>
    </div>
    <button class="btn btn-wa btn-single" id="btn-whatsapp">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Share to WhatsApp
    </button>

  </div>`;
}

// ── Event binding ─────────────────────────────────────
function bindEvents() {
  // Inputs → live calc
  const inputs = ['f-sales','f-trn','f-sfa','f-items','f-no7','f-no7trn','f-aura','f-csat','f-focus'];
  inputs.forEach(id => el(id)?.addEventListener('input', debounce(liveCalc, 150)));

  // Camera
  el('btn-camera')?.addEventListener('click', () => el('camera-input').click());
  el('btn-retake')?.addEventListener('click', () => {
    el('photo-preview').classList.remove('show');
    el('ocr-panel').classList.remove('show');
  });
  el('btn-parse')?.addEventListener('click', handleParse);
  el('btn-apply-ocr')?.addEventListener('click', applyOcrFields);

  // Camera input change
  el('camera-input')?.addEventListener('change', handleCameraCapture);

  // Save / clear
  el('btn-save-entry')?.addEventListener('click', saveEntry);
  el('btn-clear-entry')?.addEventListener('click', clearEntry);

  // WhatsApp
  el('btn-whatsapp')?.addEventListener('click', shareWhatsApp);

  // Feature visibility
  applyFeatureToggles();
}

// ── Day pills ─────────────────────────────────────────
function renderDayPills() {
  const { weekNum } = store.settings;
  const container = el('day-pills');
  if (!container) return;

  container.innerHTML = DAYS.map(day => {
    const entry = db.getEntry(weekNum, day);
    const hasData = entry && entry.sales != null;
    const active  = day === store.settings.currentDay;
    return `<button class="day-pill ${active?'active':''} ${hasData?'has-data':''}"
      data-day="${day}">${day}</button>`;
  }).join('');

  container.querySelectorAll('.day-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      saveSettings({ currentDay: btn.dataset.day });
      refreshDay();
    });
  });
}

// ── Load day into form ────────────────────────────────
function loadDay() {
  const { weekNum, currentDay } = store.settings;
  const entry = db.getEntry(weekNum, currentDay) || {};
  const fields = ['sales','trn','sfa','items','no7','no7trn','aura','csat','focus'];
  fields.forEach(f => setVal('f-'+f, entry[f]));
  showPrevData(currentDay);
  updateTimestamp(entry);
  liveCalc();
}

function showPrevData(day) {
  const { weekNum } = store.settings;
  // Last week same day
  const lw = db.getEntry(weekNum - 1, day) || {};
  const prevSalesEl = el('prev-sales');
  const prevTrnEl   = el('prev-trn');
  if (prevSalesEl) prevSalesEl.innerHTML = lw.sales != null
    ? `<span class="prev-chip">LW ${day}: <strong>AED ${fmtAED(lw.sales)}</strong></span>` : '';
  if (prevTrnEl) prevTrnEl.innerHTML = lw.trn != null
    ? `<span class="prev-chip">LW TRN: <strong>${fmtAED(lw.trn,0)}</strong></span>` : '';
}

function updateTimestamp(entry) {
  const tsEl = el('entry-ts');
  if (!tsEl) return;
  tsEl.textContent = entry.updatedAt
    ? `Last saved: ${fmtDateTime(entry.updatedAt)} · by ${entry.enteredBy || 'Staff'}`
    : '';
}

// ── Header update ─────────────────────────────────────
function updateHeader() {
  const { weekNum, currentDay } = store.settings;
  const di   = DAYS.indexOf(currentDay);
  const now  = new Date();
  setText('wb-week', `Week ${weekNum} · 2026`);
  setText('wb-day', `${DAYS_FULL[di >= 0 ? di : 0]}, ${now.toLocaleDateString('en-AE',{day:'2-digit',month:'short'})}`);
  const dayBP = getDayBP(weekNum, currentDay) || store.settings.dbpOverride;
  setText('wb-bp', dayBP ? 'AED ' + fmtAED(dayBP) : 'AED —');
  document.getElementById('header-title').textContent = 'Entry';
}

// ── Live calculation ──────────────────────────────────
function liveCalc() {
  const { weekNum, currentDay, kdRate, divAPercent, n7DailyBP, n7WeeklyBP, features } = store.settings;
  const dayBP  = getDayBP(weekNum, currentDay) || store.settings.dbpOverride;
  const weekBP = getWeekBP(weekNum) || store.settings.wbpOverride;

  const rawEntry = {
    sales: gNum('f-sales'), trn: gNum('f-trn'), sfa: gNum('f-sfa'),
    items: gNum('f-items'), no7: gNum('f-no7'), no7trn: gNum('f-no7trn'),
    aura: gNum('f-aura'), csat: gNum('f-csat'), focus: gNum('f-focus'),
  };
  const kpis = calcDayKPIs(rawEntry, { dayBP, n7DayBP: n7DailyBP, kdRate, divAPercent });

  // Mini KPIs
  setText('kv-atv',  kpis.atv  ? fmtAED(Math.round(kpis.atv))  : '—');
  setText('kv-ipc',  kpis.ipc  ? kpis.ipc.toFixed(2)             : '—');
  setText('kv-conv', kpis.conv ? kpis.conv.toFixed(2)            : '—');

  // Sales hero
  const salesEl = el('sales-hero-val');
  if (salesEl) salesEl.textContent = rawEntry.sales != null ? `AED ${fmtAED(rawEntry.sales)}` : 'AED —';
  setText('sales-hero-sub', dayBP
    ? `Target: AED ${fmtAED(dayBP)} · Gap: ${kpis.gap != null ? (kpis.gap >= 0 ? '+' : '') + fmtAED(Math.round(kpis.gap)) : '—'}`
    : 'Set BP in Admin');
  const heroCard = el('sales-hero');
  if (heroCard) {
    heroCard.className = `card card-accent ${kpis.achPct >= 100 ? 'card-accent-mint' : kpis.achPct >= 85 ? 'card-accent-amber' : 'card-accent-red'}`;
  }
  const badge = el('sales-badge');
  if (badge) { badge.textContent = fmtPct(kpis.achPct); badge.className = 'badge ' + achBadgeClass(kpis.achPct); }
  const pbarEl = el('sales-hero-pbar');
  if (pbarEl) pbarEl.hidden = rawEntry.sales == null;
  setBar('sales-hero-fill', kpis.achPct, achColor(kpis.achPct));
  setText('sales-hero-bp-lbl', dayBP ? fmtAED(dayBP) : '');

  // KD suffixes (inline)
  const kdS = el('kd-sales'); if (kdS) kdS.textContent = rawEntry.sales ? (rawEntry.sales / kdRate).toFixed(1) + ' KD' : '';
  const kdN = el('kd-no7');   if (kdN) kdN.textContent = rawEntry.no7   ? (rawEntry.no7   / kdRate).toFixed(1) + ' KD' : '';

  // No7 block
  setText('kv-no7',    rawEntry.no7 != null ? `AED ${fmtAED(rawEntry.no7)}` : 'AED —');
  setText('kv-no7vat', kpis.no7Vat != null  ? `AED ${fmtAED(Math.round(kpis.no7Vat))}` : 'AED —');
  const n7pctEl = el('kv-no7pct');
  if (n7pctEl) { n7pctEl.textContent = fmtPct(kpis.no7Pct); n7pctEl.style.color = achColor(kpis.no7Pct); }
  setText('kv-n7dpct', `${fmtPct(kpis.n7AchPct)} of No7 BP`);
  setBar('no7-bar', kpis.n7AchPct, 'var(--blue)');

  // Week accumulative
  const wkEntries = DAYS.map(d => {
    if (d === currentDay) return { ...rawEntry, _day: d };
    return { ...(db.getEntry(weekNum, d) || {}), _day: d };
  });
  const wkKPIs = calcWeekKPIs(wkEntries, { weekBP, n7WeekBP: n7WeeklyBP, kdRate });
  const accumCard = el('accum-card');
  if (accumCard) accumCard.hidden = wkKPIs.wkSales <= 0;
  setText('accum-value', `AED ${fmtAED(wkKPIs.wkSales)}`);
  setText('accum-pct', fmtPct(wkKPIs.wkAchPct));
  setText('accum-bp-lbl', weekBP ? `of AED ${fmtAED(weekBP)}` : 'of Week BP');
  setBar('accum-bar', wkKPIs.wkAchPct, achColor(wkKPIs.wkAchPct));
  setText('kv-n7wktot', wkKPIs.wkNo7 > 0 ? `Wk total: AED ${fmtAED(wkKPIs.wkNo7)}` : '');

  // AURA
  setText('kv-aura',     rawEntry.aura != null ? fmtAED(rawEntry.aura, 0) : '—');
  setText('kv-aura-trn', rawEntry.trn  != null ? fmtAED(rawEntry.trn, 0)  : '—');
  setText('kv-aura-pct', fmtPct(kpis.auraPct));

  // KD strip
  setText('kd-total',   fmtKD(rawEntry.sales, kdRate));
  setText('kd-no7-val', fmtKD(rawEntry.no7,   kdRate));
  setText('kd-atv-val', fmtKD(kpis.atv,       kdRate));

  // Division split
  if (rawEntry.sales != null) {
    setText('div-a-val', `AED ${fmtAED(Math.round(kpis.divAValue))}`);
    setText('div-b-val', `AED ${fmtAED(Math.round(kpis.divBValue))}`);
    setText('div-a-pct', `${kpis.divAPct.toFixed(0)}% of total`);
    setText('div-b-pct', `${kpis.divBPct.toFixed(0)}% of total`);
    setBar('div-a-bar', kpis.divAPct,  'var(--mint)');
    setBar('div-b-bar', kpis.divBPct,  'var(--blue)');
  }

  // Confetti if target beaten
  if (kpis.achPct >= 100 && features.confetti && rawEntry.sales != null) {
    celebrate('🎯');
  }

  autoSave(rawEntry);
}

// ── Auto-save ─────────────────────────────────────────
function autoSave(rawEntry) {
  if (Object.values(rawEntry).every(v => v == null)) return;
  const { weekNum, currentDay } = store.settings;
  db.saveEntry(weekNum, currentDay, {
    ...rawEntry,
    enteredBy: store.auth.user,
    createdAt: db.getEntry(weekNum, currentDay)?.createdAt || new Date().toISOString(),
  });
}

// ── Save entry ────────────────────────────────────────
function saveEntry() {
  const { weekNum, currentDay } = store.settings;
  const entry = db.getEntry(weekNum, currentDay);
  addAuditEntry('entry_saved', `${currentDay} Wk${weekNum} · Sales: AED ${fmtAED(entry?.sales)}`,
    store.auth.user, store.auth.role);
  renderDayPills();
  toast('✓ Entry saved', 'success');
}

// ── Clear form ────────────────────────────────────────
function clearEntry() {
  ['f-sales','f-trn','f-sfa','f-items','f-no7','f-no7trn','f-aura','f-csat','f-focus'].forEach(id => {
    const e = el(id); if (e) e.value = '';
  });
  liveCalc();
  toast('Cleared');
}

// ── Camera / OCR ──────────────────────────────────────
let ocrFields = [];

async function handleCameraCapture(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    el('photo-img').src = ev.target.result;
    el('photo-preview').classList.add('show');
    el('ocr-panel').classList.remove('show');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

async function handleParse() {
  const img = el('photo-img');
  if (!img?.src || img.src === window.location.href) { toast('No photo captured', 'error'); return; }
  toast('🔍 Parsing image…', '', 3000);
  try {
    // Convert img src to blob for API
    const blob = await fetch(img.src).then(r => r.blob());
    const result = await parseImage(blob);
    ocrFields = result.fields;
    renderOcrFields(result.fields);
    el('ocr-panel').classList.add('show');
    toast(`${result.fields.length} fields detected`, 'success');
    addAuditEntry('ocr_parsed', `${result.fields.length} fields from photo`, store.auth.user, store.auth.role);
  } catch (err) {
    toast('Parse failed: ' + err.message, 'error');
  }
}

function renderOcrFields(fields) {
  const container = el('ocr-fields');
  if (!container) return;
  container.innerHTML = fields.map(f => `
    <div class="ocr-field-row">
      <span class="ocr-field-label">${f.label}</span>
      <div style="text-align:right">
        <div class="ocr-field-value">${f.value}</div>
        <div class="ocr-confidence">Confidence: ${(f.confidence * 100).toFixed(0)}%</div>
      </div>
    </div>`).join('');
}

function applyOcrFields() {
  ocrFields.forEach(f => setVal('f-' + f.key, f.rawValue));
  el('ocr-panel').classList.remove('show');
  liveCalc();
  toast('✓ Fields applied', 'success');
  addAuditEntry('ocr_applied', 'Auto-filled from photo', store.auth.user, store.auth.role);
}

// ── WhatsApp share ────────────────────────────────────
function shareWhatsApp() {
  const { weekNum, currentDay, kdRate, n7DailyBP } = store.settings;
  const entry = db.getEntry(weekNum, currentDay) || {};
  const dayBP = getDayBP(weekNum, currentDay);
  const achPct = entry.sales && dayBP ? ((entry.sales / dayBP) * 100).toFixed(1) : '—';
  const atv    = entry.sales && entry.trn ? (entry.sales / entry.trn).toFixed(0) : '—';
  const n7pct  = entry.no7 && entry.sales ? ((entry.no7 / entry.sales) * 100).toFixed(2) : '—';
  const aurpct = entry.aura && entry.trn  ? ((entry.aura / entry.trn) * 100).toFixed(1) : '—';
  const ts     = fmtDateTime(new Date().toISOString());
  const msg =
    `*Daily Sales Report · Wk ${weekNum} | ${currentDay}*\n` +
    `Store: ${store.settings.store}\nTime: ${ts}\n\n` +
    `📊 *Sales*\n` +
    `• Sales: AED ${fmtAED(entry.sales)} / ${fmtAED(dayBP)} (${achPct}%)\n` +
    `• TRN: ${fmtAED(entry.trn,0)} | ATV: AED ${atv} | SFA: ${entry.sfa||'—'}%\n` +
    `• KD: ${fmtKD(entry.sales, kdRate)}\n\n` +
    `🔵 *No7*\n` +
    `• Sales: AED ${fmtAED(entry.no7)} (${n7pct}% of total)\n` +
    `• VAT -5%: AED ${entry.no7 ? fmtAED(Math.round(entry.no7*0.95)) : '—'}\n\n` +
    `💚 *AURA*\n` +
    `• ${fmtAED(entry.aura,0)} / ${fmtAED(entry.trn,0)} TRN = ${aurpct}%\n\n` +
    `_Entered by: ${store.auth.user}_`;

  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  addAuditEntry('whatsapp_share', `${currentDay} data shared`, store.auth.user, store.auth.role);
}

// ── Feature toggles ───────────────────────────────────
function applyFeatureToggles() {
  const { features } = store.settings;
  const kdStrip  = el('kd-strip');
  const divSect  = el('div-section');
  if (kdStrip) kdStrip.hidden  = !features.kd;
  if (divSect) divSect.hidden  = !features.divisions;
}

// ── Refresh (called on view show + day change) ────────
export function refreshDay() {
  renderDayPills();
  loadDay();
  updateHeader();
  applyFeatureToggles();
}
