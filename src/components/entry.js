/**
 * Entry Component — Daily Sales Data Entry
 * The main day-by-day data entry screen with live KPI calculation.
 */

import * as store    from '../store/index.js';
import * as analytics from '../services/analytics.js';
import * as ocr      from '../services/ocr.js';
import * as exportSvc from '../services/export.js';
import { DAYS, DAYS_FULL, getDayBP } from '../data/store-bp.js';

let liveCalcTimeout = null;

export function mount(el) {
  el.innerHTML = renderHTML();
  loadDay(store.state.activeDay, el);
  bindEvents(el);

  store.subscribe('dayChange', day => loadDay(day, el));
  store.subscribe('navigate',  v => { if (v === 'entry') refreshAccum(el); });
}

// ── RENDER ─────────────────────────────────────────────────────
function renderHTML() {
  const { settings } = store.state;
  const week = settings.wk;
  const day  = store.state.activeDay;

  return `
  <div class="vpad">

    <!-- Week banner -->
    <div class="week-banner">
      <div>
        <h3 style="font-size:1.1rem;font-weight:800" id="e-week-label">Week ${week} · 2026</h3>
        <p style="font-size:0.68rem;opacity:0.8;margin-top:2px" id="e-day-label">&nbsp;</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.6rem;opacity:0.8">Daily BP</div>
        <div class="wb-bp" id="e-day-bp">AED —</div>
      </div>
    </div>

    <!-- Day pills -->
    <div class="day-pills" id="e-day-pills"></div>

    <!-- Accumulative progress -->
    <div class="accum-card" id="e-accum" style="display:none">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span class="accum-label">Week Accumulative</span>
        <span class="accum-val" id="e-accum-val">AED —</span>
      </div>
      <div class="pbar-track"><div class="pbar-fill" id="e-accum-bar" style="width:0%"></div></div>
      <div class="pbar-labels">
        <span id="e-accum-pct">0%</span>
        <span id="e-accum-bp-lbl"></span>
      </div>
    </div>

    <!-- Photo / OCR quick entry -->
    <div class="card card-accent mint" id="e-photo-card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:0.8rem;font-weight:700">📷 Quick Photo Entry</div>
        <button class="btn btn-outline btn-sm" id="btn-camera">📷 Capture</button>
      </div>
      <p style="font-size:0.72rem;color:var(--text3);line-height:1.5">
        Photograph your POS screen — fields will be detected and pre-filled.
      </p>
      <div class="photo-preview" id="e-photo-preview">
        <img id="e-photo-img" src="" alt="Captured" style="width:100%">
        <div style="padding:8px 10px;display:flex;gap:8px;border-top:1px solid var(--border)">
          <button class="btn btn-outline btn-sm" id="btn-retake">Retake</button>
          <button class="btn btn-mint btn-sm" id="btn-parse">Parse Fields</button>
        </div>
      </div>
      <div class="ocr-result" id="e-ocr-result">
        <div style="font-size:0.68rem;font-weight:700;color:var(--mint-dark);margin-bottom:8px">📊 Detected Fields</div>
        <div id="e-ocr-fields"></div>
        <button class="btn btn-mint btn-full" style="height:36px;font-size:0.78rem;margin-top:8px" id="btn-apply-ocr">
          Apply to Form
        </button>
      </div>
    </div>
    <input type="file" id="camera-input" accept="image/*" capture="environment" style="display:none">

    <!-- ── SALES ── -->
    <div class="slbl">Sales Data</div>

    <div class="g2">
      <div class="field">
        <div class="field-header">
          <label class="field-label">Sales (AED)</label>
        </div>
        <div class="field-input">
          <input type="number" id="f-sales" placeholder="0" inputmode="numeric">
          <span class="field-suffix" id="sf-kd-sales"></span>
        </div>
        <div class="prev-chips" id="prev-sales"></div>
      </div>
      <div class="field">
        <div class="field-header"><label class="field-label">TRN</label></div>
        <div class="field-input">
          <input type="number" id="f-trn" placeholder="0" inputmode="numeric">
        </div>
        <div class="prev-chips" id="prev-trn"></div>
      </div>
    </div>

    <div class="g2">
      <div class="field">
        <div class="field-header"><label class="field-label">SFA %</label></div>
        <div class="field-input">
          <input type="number" id="f-sfa" placeholder="0.0" step="0.1" inputmode="decimal">
        </div>
      </div>
      <div class="field">
        <div class="field-header">
          <label class="field-label">Total Items</label>
          <span class="field-tag">→IPC</span>
        </div>
        <div class="field-input">
          <input type="number" id="f-items" placeholder="0" inputmode="numeric">
        </div>
      </div>
    </div>

    <!-- Auto KPI row -->
    <div class="g3" style="margin-bottom:12px">
      <div class="kpi mint"><div class="kpi-lbl">ATV</div><div class="kpi-val" id="kv-atv">—</div><div class="kpi-sub">AUTO</div></div>
      <div class="kpi amber"><div class="kpi-lbl">IPC</div><div class="kpi-val" id="kv-ipc">—</div><div class="kpi-sub">AUTO</div></div>
      <div class="kpi blue"><div class="kpi-lbl">Conv.</div><div class="kpi-val" id="kv-conv">—</div><div class="kpi-sub">AUTO</div></div>
    </div>

    <!-- Sales vs BP hero -->
    <div class="card card-accent" id="e-sales-hero" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text2)">Sales vs BP</span>
        <span class="badge badge-blue" id="e-hero-badge">—</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:2rem;font-weight:700;line-height:1" id="e-hero-val">AED —</div>
      <div style="font-size:0.72rem;color:var(--text2);margin-top:4px" id="e-hero-sub">Set BP in Admin to see progress</div>
      <div class="pbar-wrap" id="e-hero-pbar" style="display:none">
        <div class="pbar-track"><div class="pbar-fill" id="e-hero-fill" style="width:0%"></div></div>
      </div>
    </div>

    <!-- ── NO7 ── -->
    <div class="slbl">No7 Performance</div>

    <div class="g2">
      <div class="field">
        <div class="field-header"><label class="field-label">No7 Sales (AED)</label></div>
        <div class="field-input">
          <input type="number" id="f-no7" placeholder="0" inputmode="numeric">
          <span class="field-suffix" id="sf-kd-no7"></span>
        </div>
      </div>
      <div class="field">
        <div class="field-header"><label class="field-label">No7 TRN</label></div>
        <div class="field-input">
          <input type="number" id="f-no7trn" placeholder="0" inputmode="numeric">
        </div>
      </div>
    </div>

    <!-- No7 live card -->
    <div class="card card-accent blue" style="margin-bottom:12px">
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div>
          <div class="kpi-lbl">No7 Sales</div>
          <div style="font-family:var(--font-mono);font-size:1.4rem;font-weight:700;color:var(--blue)" id="kv-no7">AED —</div>
        </div>
        <div style="width:1px;background:var(--border);align-self:stretch"></div>
        <div>
          <div class="kpi-lbl">VAT −5%</div>
          <div style="font-family:var(--font-mono);font-size:1rem;font-weight:600;color:var(--text2)" id="kv-no7-vat">AED —</div>
        </div>
        <div style="width:1px;background:var(--border);align-self:stretch"></div>
        <div>
          <div class="kpi-lbl">% of Sales</div>
          <div style="font-family:var(--font-mono);font-size:1rem;font-weight:600" id="kv-no7-pct">—%</div>
        </div>
      </div>
      <div class="pbar-wrap">
        <div class="pbar-track"><div class="pbar-fill" id="e-no7-fill" style="width:0%;background:var(--blue)"></div></div>
        <div class="pbar-labels">
          <span id="kv-no7-ach">0% of daily No7 BP</span>
          <span id="kv-no7-wk"></span>
        </div>
      </div>
    </div>

    <!-- ── AURA ── -->
    <div class="slbl">AURA & Metrics</div>

    <div class="g2">
      <div class="field">
        <div class="field-header"><label class="field-label">AURA Signups</label></div>
        <div class="field-input">
          <input type="number" id="f-aura" placeholder="0" inputmode="numeric">
        </div>
      </div>
      <div class="field">
        <div class="field-header"><label class="field-label">CSAT / NPS</label></div>
        <div class="field-input">
          <input type="number" id="f-csat" placeholder="0" inputmode="numeric">
        </div>
      </div>
    </div>

    <div class="field">
      <div class="field-header"><label class="field-label">Focus Product Count</label></div>
      <div class="field-input">
        <input type="number" id="f-focus" placeholder="0" inputmode="numeric">
      </div>
    </div>

    <!-- AURA equation display -->
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.6rem;font-weight:700;color:var(--mint-dark)" id="kv-aura-n">—</div>
          <div class="kpi-sub">SIGNUPS</div>
        </div>
        <div style="font-size:1.2rem;color:var(--text3)">÷</div>
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.6rem;font-weight:700;color:var(--text2)" id="kv-aura-trn">—</div>
          <div class="kpi-sub">TRN</div>
        </div>
        <div style="font-size:1.2rem;color:var(--text3)">=</div>
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.9rem;font-weight:800;color:var(--mint-dark)" id="kv-aura-pct">—%</div>
          <div class="kpi-sub">AURA CAPTURE</div>
        </div>
      </div>
    </div>

    <!-- KD Strip -->
    <div class="slbl" id="kd-slbl">KD Equivalent</div>
    <div class="kd-strip" id="kd-strip">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <div class="kd-item"><div class="kd-item-lbl">Total Sales</div><div class="kd-item-val" id="kv-kd-sales">— KD</div></div>
        <div style="width:1px;background:var(--border)"></div>
        <div class="kd-item"><div class="kd-item-lbl">No7 Sales</div><div class="kd-item-val" id="kv-kd-no7">— KD</div></div>
        <div style="width:1px;background:var(--border)"></div>
        <div class="kd-item"><div class="kd-item-lbl">ATV</div><div class="kd-item-val" id="kv-kd-atv">— KD</div></div>
      </div>
    </div>

    <!-- Division split -->
    <div class="slbl" id="div-slbl">Division Split</div>
    <div class="div-split" id="div-split">
      <div class="div-card div-a">
        <div class="div-label">Division A</div>
        <div class="div-val" id="div-a-val">AED —</div>
        <div style="font-size:0.68rem;color:var(--mint-dark);margin-top:4px" id="div-a-pct">—% of total</div>
        <div class="pbar-wrap"><div class="pbar-track" style="background:rgba(0,200,150,0.15)">
          <div class="pbar-fill" id="div-a-bar" style="width:0%;background:var(--mint)"></div>
        </div></div>
      </div>
      <div class="div-card div-b">
        <div class="div-label">Division B</div>
        <div class="div-val" id="div-b-val">AED —</div>
        <div style="font-size:0.68rem;color:var(--blue);margin-top:4px" id="div-b-pct">—% of total</div>
        <div class="pbar-wrap"><div class="pbar-track" style="background:rgba(74,144,217,0.15)">
          <div class="pbar-fill" id="div-b-bar" style="width:0%;background:var(--blue)"></div>
        </div></div>
      </div>
    </div>

    <!-- Timestamp -->
    <div class="entry-ts" id="e-ts"></div>

    <!-- Actions -->
    <div class="btn-row">
      <button class="btn btn-mint" id="btn-save">✓ Save Entry</button>
      <button class="btn btn-outline" id="btn-clear">Clear</button>
    </div>
    <button class="btn btn-wa btn-full" style="margin-top:8px" id="btn-wa">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Share to WhatsApp
    </button>

  </div>`;
}

// ── LOAD DAY ────────────────────────────────────────────────────
function loadDay(day, el) {
  const { settings } = store.state;
  const entry = store.getDayEntry(settings.wk, day);
  const fields = ['sales','trn','sfa','items','no7','no7trn','aura','csat','focus'];
  fields.forEach(f => {
    const inp = el.querySelector(`#f-${f}`);
    if (inp) inp.value = entry[f] ?? '';
  });
  refreshDayPills(el);
  refreshHeader(el, day);
  refreshPrevData(el, day);
  liveCalc(el);
  const ts = entry.savedAt;
  const tsEl = el.querySelector('#e-ts');
  if (tsEl) tsEl.textContent = ts
    ? `Last saved: ${new Date(ts).toLocaleString('en-AE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · by ${entry.savedBy||'Staff'}`
    : '';
}

function refreshDayPills(el) {
  const { settings } = store.state;
  const container = el.querySelector('#e-day-pills');
  if (!container) return;
  container.innerHTML = DAYS.map(d => {
    const e = store.getDayEntry(settings.wk, d);
    const hasData = e.sales != null;
    return `<button class="day-pill ${d===store.state.activeDay?'active':''} ${hasData?'has-data':''}"
      data-day="${d}">${d}</button>`;
  }).join('');
}

function refreshHeader(el, day) {
  const { settings } = store.state;
  const di  = DAYS.indexOf(day);
  const now = new Date();
  el.querySelector('#e-week-label').textContent = `Week ${settings.wk} · 2026`;
  el.querySelector('#e-day-label').textContent  =
    `${DAYS_FULL[di>=0?di:0]}, ${now.toLocaleDateString('en-AE',{day:'2-digit',month:'short'})}`;
  const dayBP = getDayBP(settings.wk, day, settings.dbpOverride);
  el.querySelector('#e-day-bp').textContent = dayBP ? `AED ${analytics.fmt(dayBP)}` : 'AED —';
}

function refreshPrevData(el, day) {
  const { settings } = store.state;
  const lwEntry = store.getDayEntry(settings.wk - 1, day);
  const ps = el.querySelector('#prev-sales');
  const pt = el.querySelector('#prev-trn');
  if (ps) ps.innerHTML = lwEntry.sales != null
    ? `<span class="prev-chip">LW ${day}: <strong>AED ${analytics.fmt(lwEntry.sales)}</strong></span>` : '';
  if (pt) pt.innerHTML = lwEntry.trn != null
    ? `<span class="prev-chip">LW: <strong>${analytics.fmt(lwEntry.trn)} TRN</strong></span>` : '';
}

// ── LIVE CALC ───────────────────────────────────────────────────
function liveCalc(el) {
  clearTimeout(liveCalcTimeout);
  liveCalcTimeout = setTimeout(() => doCalc(el), 80);
}

function gNum(el, id) {
  const v = el.querySelector(id)?.value;
  return (v === '' || v == null) ? null : parseFloat(v);
}

function doCalc(el) {
  const { settings } = store.state;
  const entry = {
    sales:  gNum(el,'#f-sales'),  trn:    gNum(el,'#f-trn'),
    sfa:    gNum(el,'#f-sfa'),    items:  gNum(el,'#f-items'),
    no7:    gNum(el,'#f-no7'),    no7trn: gNum(el,'#f-no7trn'),
    aura:   gNum(el,'#f-aura'),   csat:   gNum(el,'#f-csat'),
    focus:  gNum(el,'#f-focus'),
  };
  const day  = store.state.activeDay;
  const week = settings.wk;
  const kpis = analytics.computeDayKPIs(entry, week, day, settings);

  setText(el, '#kv-atv',    kpis.atv    != null ? analytics.fmt(Math.round(kpis.atv)) : '—');
  setText(el, '#kv-ipc',    kpis.ipc    != null ? kpis.ipc.toFixed(2)                 : '—');
  setText(el, '#kv-conv',   kpis.ipc    != null ? kpis.ipc.toFixed(2)                 : '—');
  setText(el, '#kv-no7',    kpis.no7    != null ? `AED ${analytics.fmt(kpis.no7)}`   : 'AED —');
  setText(el, '#kv-no7-vat',kpis.no7vat != null ? `AED ${analytics.fmt(Math.round(kpis.no7vat))}` : 'AED —');

  const no7PctEl = el.querySelector('#kv-no7-pct');
  if (no7PctEl) { no7PctEl.textContent = analytics.fmtP(kpis.no7pct); no7PctEl.style.color = analytics.achColor(kpis.no7pct); }

  setText(el, '#kv-no7-ach', `${analytics.fmtP(kpis.n7ach)} of daily No7 BP`);
  setBar(el, '#e-no7-fill', Math.min(100, kpis.n7ach || 0));

  setText(el, '#kv-aura-n',   entry.aura  != null ? analytics.fmt(entry.aura)  : '—');
  setText(el, '#kv-aura-trn', entry.trn   != null ? analytics.fmt(entry.trn)   : '—');
  const aurPctEl = el.querySelector('#kv-aura-pct');
  if (aurPctEl) { aurPctEl.textContent = analytics.fmtP(kpis.auraPct); }

  // KD
  if (settings.features?.kdConverter) {
    setText(el, '#kv-kd-sales', analytics.fmtKD(kpis.kdSales));
    setText(el, '#kv-kd-no7',   analytics.fmtKD(kpis.kdNo7));
    setText(el, '#kv-kd-atv',   analytics.fmtKD(kpis.kdATV));
    const sfx = el.querySelector('#sf-kd-sales');
    if (sfx) sfx.textContent = kpis.kdSales != null ? kpis.kdSales.toFixed(1)+' KD' : '';
    const sfx2 = el.querySelector('#sf-kd-no7');
    if (sfx2) sfx2.textContent = kpis.kdNo7 != null ? kpis.kdNo7.toFixed(1)+' KD' : '';
  }

  // Division
  if (settings.features?.divSplit && entry.sales) {
    const divA = settings.divAPercent / 100 || 0.6;
    setText(el, '#div-a-val', `AED ${analytics.fmt(Math.round(entry.sales * divA))}`);
    setText(el, '#div-b-val', `AED ${analytics.fmt(Math.round(entry.sales * (1-divA)))}`);
    setText(el, '#div-a-pct', `${(divA*100).toFixed(0)}% of total`);
    setText(el, '#div-b-pct', `${((1-divA)*100).toFixed(0)}% of total`);
    setBar(el, '#div-a-bar', divA*100);
    setBar(el, '#div-b-bar', (1-divA)*100);
  }

  // Sales hero
  const heroCard = el.querySelector('#e-sales-hero');
  if (heroCard) {
    heroCard.className = 'card card-accent ' + (kpis.achPct>=100?'mint':kpis.achPct>=90?'amber':'red');
  }
  const badgeEl = el.querySelector('#e-hero-badge');
  if (badgeEl) { badgeEl.textContent = analytics.fmtP(kpis.achPct); badgeEl.className = 'badge '+analytics.achBadge(kpis.achPct); }
  setText(el, '#e-hero-val', entry.sales != null ? `AED ${analytics.fmt(entry.sales)}` : 'AED —');
  setText(el, '#e-hero-sub', kpis.dayBP ? `Target: AED ${analytics.fmt(kpis.dayBP)} · Gap: ${kpis.gap!=null?(kpis.gap>=0?'+':'')+analytics.fmt(Math.round(kpis.gap)):'—'}` : 'Set BP in Admin');
  const pbarEl = el.querySelector('#e-hero-pbar');
  if (pbarEl) pbarEl.style.display = entry.sales ? 'block' : 'none';
  setBar(el, '#e-hero-fill', Math.min(100, kpis.achPct || 0),
    kpis.achPct>=100?'var(--mint)':kpis.achPct>=90?'var(--amber)':'var(--red)');

  // Accumulative
  refreshAccum(el);

  // Confetti if target beaten
  if (kpis.achPct >= 100 && settings.features?.confetti) {
    document.dispatchEvent(new CustomEvent('app:celebrate'));
  }
}

function refreshAccum(el) {
  const { settings } = store.state;
  const week = settings.wk;
  let total = 0;
  DAYS.forEach(d => { total += store.getDayEntry(week, d).sales || 0; });
  const { wkBP } = analytics.computeWeekRollup(week, settings);
  const accEl = el.querySelector('#e-accum');
  if (!accEl) return;
  if (total > 0) {
    accEl.style.display = 'block';
    const pct = wkBP ? (total / wkBP) * 100 : 0;
    setText(el, '#e-accum-val',   `AED ${analytics.fmt(total)}`);
    setText(el, '#e-accum-pct',   analytics.fmtP(pct));
    setText(el, '#e-accum-bp-lbl', wkBP ? `of AED ${analytics.fmt(wkBP)}` : '');
    setBar(el, '#e-accum-bar', Math.min(100,pct), analytics.achColor(pct));
  } else {
    accEl.style.display = 'none';
  }
}

// ── EVENTS ──────────────────────────────────────────────────────
function bindEvents(el) {
  // Day pill selection
  el.querySelector('#e-day-pills').addEventListener('click', e => {
    const pill = e.target.closest('[data-day]');
    if (pill) store.selectDay(pill.dataset.day);
  });

  // Live calc on input
  const inputIds = ['#f-sales','#f-trn','#f-sfa','#f-items','#f-no7','#f-no7trn','#f-aura','#f-csat','#f-focus'];
  inputIds.forEach(id => {
    el.querySelector(id)?.addEventListener('input', () => liveCalc(el));
  });

  // Save
  el.querySelector('#btn-save')?.addEventListener('click', () => saveEntry(el));

  // Clear
  el.querySelector('#btn-clear')?.addEventListener('click', () => clearEntry(el));

  // WhatsApp
  el.querySelector('#btn-wa')?.addEventListener('click', () => shareWA(el));

  // Camera
  el.querySelector('#btn-camera')?.addEventListener('click', () => el.querySelector('#camera-input').click());
  el.querySelector('#camera-input')?.addEventListener('change', e => onPhotoCapture(e, el));
  el.querySelector('#btn-retake')?.addEventListener('click',  () => {
    el.querySelector('#e-photo-preview')?.classList.remove('show');
    el.querySelector('#e-ocr-result')?.classList.remove('show');
  });
  el.querySelector('#btn-parse')?.addEventListener('click',   () => parsePhoto(el));
  el.querySelector('#btn-apply-ocr')?.addEventListener('click', () => applyOcr(el));
}

function saveEntry(el) {
  const { settings } = store.state;
  const entry = {};
  ['sales','trn','sfa','items','no7','no7trn','aura','csat','focus'].forEach(f => {
    const v = gNum(el, `#f-${f}`);
    if (v != null) entry[f] = v;
  });
  store.saveDayEntry(settings.wk, store.state.activeDay, entry);
  refreshDayPills(el);
  document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: '✓ Entry saved', type: 'success' } }));
}

function clearEntry(el) {
  ['sales','trn','sfa','items','no7','no7trn','aura','csat','focus'].forEach(f => {
    const inp = el.querySelector(`#f-${f}`);
    if (inp) inp.value = '';
  });
  liveCalc(el);
  document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Cleared' } }));
}

function shareWA(el) {
  const { settings } = store.state;
  const entry = {};
  ['sales','trn','sfa','items','no7','no7trn','aura','csat','focus'].forEach(f => {
    entry[f] = gNum(el, `#f-${f}`);
  });
  const kpis = analytics.computeDayKPIs(entry, settings.wk, store.state.activeDay, settings);
  exportSvc.shareWhatsApp({ entry, kpis, week: settings.wk, day: store.state.activeDay, settings, user: store.state.user });
  store.addAudit('share_wa', `${store.state.activeDay} data shared`);
}

// ── CAMERA / OCR ────────────────────────────────────────────────
let capturedFile = null;

function onPhotoCapture(e, el) {
  const file = e.target.files[0]; if (!file) return;
  capturedFile = file;
  const url = URL.createObjectURL(file);
  el.querySelector('#e-photo-img').src = url;
  el.querySelector('#e-photo-preview').classList.add('show');
  el.querySelector('#e-ocr-result').classList.remove('show');
  e.target.value = '';
}

async function parsePhoto(el) {
  if (!capturedFile) return;
  document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: '🔍 Parsing image…' } }));
  const result = await ocr.parse(capturedFile, store.state.settings);
  if (!result.ok) {
    document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'OCR disabled or failed', type: 'error' } }));
    return;
  }
  const fieldsEl = el.querySelector('#e-ocr-fields');
  const fieldLabels = { sales:'Sales', trn:'TRN', no7:'No7 Sales', no7trn:'No7 TRN', sfa:'SFA %', items:'Items', aura:'AURA' };
  fieldsEl.innerHTML = Object.entries(result.fields)
    .filter(([,v]) => v != null)
    .map(([k,v]) => {
      const conf = result.fieldMeta?.[k]?.confidence;
      return `<div class="ocr-field-row">
        <span style="font-size:0.66rem;color:var(--text2);font-weight:600">${fieldLabels[k]||k}</span>
        <div style="text-align:right">
          <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--mint-dark);font-weight:600">${analytics.fmt(v)}</div>
          ${conf ? `<div style="font-size:0.55rem;color:var(--text3)">Conf: ${(conf*100).toFixed(0)}%</div>` : ''}
        </div>
      </div>`;
    }).join('');
  el.querySelector('#e-ocr-result').classList.add('show');
  document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: 'Fields detected — review & apply', type: 'success' } }));
  el._ocrFields = result.fields;
}

function applyOcr(el) {
  const fields = el._ocrFields; if (!fields) return;
  Object.entries(fields).forEach(([k,v]) => {
    const inp = el.querySelector(`#f-${k}`);
    if (inp && v != null) inp.value = v;
  });
  el.querySelector('#e-ocr-result').classList.remove('show');
  liveCalc(el);
  store.addAudit('ocr_applied', 'Auto-filled from photo');
  document.dispatchEvent(new CustomEvent('app:toast', { detail: { msg: '✓ Fields applied', type: 'success' } }));
}

// ── HELPERS ─────────────────────────────────────────────────────
function setText(el, selector, text) { const e=el.querySelector(selector); if(e) e.textContent=text; }
function setBar(el, selector, pct, color) { const e=el.querySelector(selector); if(e){e.style.width=pct+'%';if(color)e.style.background=color;} }
