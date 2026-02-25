/**
 * Analysis Component — Charts, Forecasts, KPI Trends
 */

import * as store     from '../store/index.js';
import * as analytics from '../services/analytics.js';
import { DAYS }       from '../data/store-bp.js';

let charts = {};

export function mount(el) {
  el.innerHTML = renderHTML();
  store.subscribe('navigate', v => { if (v === 'analysis') refresh(el); });
  refresh(el);
}

function renderHTML() {
  return `<div class="vpad">

  <div class="forecast-card">
    <div class="forecast-title">📈 Week-End Projection</div>
    <div class="forecast-main" id="an-proj">AED —</div>
    <div class="forecast-sub" id="an-proj-text">Enter daily data to generate forecast.</div>
    <div id="an-proj-badge"></div>
  </div>

  <div class="g4" style="margin-bottom:10px">
    <div class="kpi mint"><div class="kpi-lbl">Best Day</div><div class="kpi-val" id="an-best">—</div><div class="kpi-sub" id="an-best-val"></div></div>
    <div class="kpi red"><div class="kpi-lbl">Weakest Day</div><div class="kpi-val" id="an-worst">—</div><div class="kpi-sub" id="an-worst-val"></div></div>
    <div class="kpi blue"><div class="kpi-lbl">Avg ATV</div><div class="kpi-val" id="an-atv">—</div><div class="kpi-sub">Week avg</div></div>
    <div class="kpi purple"><div class="kpi-lbl">No7 Contrib</div><div class="kpi-val" id="an-no7pct">—</div><div class="kpi-sub">of total sales</div></div>
  </div>

  <div class="chart-card">
    <div class="chart-title">Sales Trend <span>Last 3 Weeks vs Target</span></div>
    <div class="chart-wrap"><canvas id="c-sales"></canvas></div>
  </div>

  <div class="chart-card">
    <div class="chart-title">No7 Contribution % <span>Daily</span></div>
    <div class="chart-wrap"><canvas id="c-no7"></canvas></div>
  </div>

  <div class="card">
    <div style="font-size:0.78rem;font-weight:700;color:var(--text);margin-bottom:14px">
      KPI Achievement — Week <span id="an-wknum"></span>
    </div>
    <div id="an-kpi-bars"></div>
  </div>

  <div class="chart-card">
    <div class="chart-title">AURA Capture % <span>Daily</span></div>
    <div class="chart-wrap"><canvas id="c-aura"></canvas></div>
  </div>

  </div>`;
}

function refresh(el) {
  const { settings } = store.state;
  const wk  = settings.wk;
  const rollup = analytics.computeWeekRollup(wk, settings);

  // Set text vals
  t(el,'#an-wknum', wk);
  t(el,'#an-best',  rollup.bestDay  || '—');
  t(el,'#an-best-val', rollup.bestVal  != null ? `AED ${analytics.fmt(rollup.bestVal)}`   : '');
  t(el,'#an-worst', rollup.worstDay || '—');
  t(el,'#an-worst-val', rollup.worstVal != null ? `AED ${analytics.fmt(rollup.worstVal)}` : '');
  t(el,'#an-atv',   rollup.atv     != null ? analytics.fmt(Math.round(rollup.atv)) : '—');
  t(el,'#an-no7pct', analytics.fmtP(rollup.no7pct));

  // Forecast
  if (rollup.daysFilled > 0 && rollup.projected != null) {
    t(el,'#an-proj',      `AED ${analytics.fmt(Math.round(rollup.projected))}`);
    t(el,'#an-proj-text', `Based on ${rollup.daysFilled} day(s) · Avg AED ${analytics.fmt(Math.round(rollup.sales/rollup.daysFilled))}/day · ${7-rollup.daysFilled} remaining`);
    const cls = rollup.projPct>=100?'good':rollup.projPct>=85?'warn':'bad';
    const ico = rollup.projPct>=100?'🎯':rollup.projPct>=85?'⚠️':'⬇️';
    const badgeEl = el.querySelector('#an-proj-badge');
    if (badgeEl) badgeEl.innerHTML = `<div class="forecast-pct ${cls}">${ico} ${analytics.fmtP(rollup.projPct)} projected</div>`;
  }

  // KPI bars
  const barsEl = el.querySelector('#an-kpi-bars');
  if (barsEl) {
    const kpis = [
      { label:'Week Sales', val:rollup.sales,  target:rollup.wkBP,   color:'var(--mint)' },
      { label:'Week No7',   val:rollup.no7,    target:rollup.n7wkBP, color:'var(--blue)' },
      { label:'Avg SFA',    val:rollup.avgSFA, target:65, unit:'%',  color:'var(--purple)' },
    ];
    barsEl.innerHTML = kpis.map(k => {
      const pct = (k.val!=null&&k.target) ? Math.min(100,(k.val/k.target)*100) : 0;
      const col = analytics.achColor(pct);
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;font-weight:600;margin-bottom:5px">
          <span>${k.label}</span>
          <span style="font-family:var(--font-mono);color:${col}">${k.val!=null?analytics.fmt(k.val)+(k.unit||''):'—'} / ${k.target?analytics.fmt(k.target)+(k.unit||''):'—'}</span>
        </div>
        <div class="pbar-track"><div class="pbar-fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="pbar-labels"><span>${pct.toFixed(0)}%</span><span>Target</span></div>
      </div>`;
    }).join('');
  }

  buildCharts(el, wk);
}

function buildCharts(el, wk) {
  // Sales trend — last 3 weeks grouped bar
  const salesData = {
    labels: DAYS,
    datasets: [-2,-1,0].map((offset, i) => {
      const w = wk + offset;
      const colors = ['rgba(200,220,255,0.7)','rgba(100,160,255,0.7)','rgba(0,200,150,0.9)'];
      return {
        label: `Week ${w}`,
        data: DAYS.map(d => (store.getDayEntry(w,d).sales || 0)),
        backgroundColor: colors[i], borderColor: colors[i],
        borderWidth: i===2?2:1,
      };
    })
  };
  buildChart(el, 'c-sales', 'c-sales-inst', 'bar', salesData, v => analytics.fmt(v));

  // No7 % line
  const no7Data = {
    labels: DAYS,
    datasets: [{
      label:'No7 %',
      data: DAYS.map(d => {
        const e = store.getDayEntry(wk, d);
        return (e.no7&&e.sales) ? +((e.no7/e.sales)*100).toFixed(1) : 0;
      }),
      borderColor:'var(--blue)', backgroundColor:'rgba(74,144,217,0.1)',
      fill:true, tension:0.4, borderWidth:2, pointRadius:4, pointBackgroundColor:'var(--blue)'
    }]
  };
  buildChart(el, 'c-no7', 'c-no7-inst', 'line', no7Data, v => v+'%');

  // AURA %
  const auraData = {
    labels: DAYS,
    datasets: [{
      label:'AURA %',
      data: DAYS.map(d => {
        const e = store.getDayEntry(wk, d);
        return (e.aura&&e.trn) ? +((e.aura/e.trn)*100).toFixed(1) : 0;
      }),
      borderColor:'var(--mint)', backgroundColor:'rgba(0,200,150,0.1)',
      fill:true, tension:0.4, borderWidth:2, pointRadius:4, pointBackgroundColor:'var(--mint)'
    }]
  };
  buildChart(el, 'c-aura', 'c-aura-inst', 'line', auraData, v => v+'%');
}

function buildChart(el, canvasId, instKey, type, data, tickFmt) {
  const canvas = el.querySelector(`#${canvasId}`);
  if (!canvas) return;
  if (charts[instKey]) { charts[instKey].destroy(); }
  charts[instKey] = new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position:'top', labels:{ font:{size:10}, boxWidth:12, padding:8 } } },
      scales: {
        x: { grid:{display:false}, ticks:{font:{size:10}} },
        y: { grid:{color:'rgba(0,0,0,0.04)'}, ticks:{font:{size:10}, callback: tickFmt} }
      }
    }
  });
}

function t(el, sel, val) { const e=el.querySelector(sel); if(e) e.textContent=val; }
