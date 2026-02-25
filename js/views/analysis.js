/**
 * js/views/analysis.js
 * ─────────────────────────────────────────────────────
 * Analysis view: charts, KPI summaries, forecast.
 */

import { store } from '../store/index.js';
import { db } from '../services/db.js';
import { DAYS } from '../data/bp.js';
import { getDayBP, getWeekBP } from '../data/bp.js';
import { calcWeekKPIs, calcForecast, achColor, achBadgeClass, forecastBadgeClass } from '../utils/calc.js';
import { fmtAED, fmtPct } from '../utils/format.js';
import { setText, setHtml, el } from '../utils/ui.js';

let charts = {};

export function renderAnalysis() {
  const container = el('view-analysis');
  if (!container) return;
  container.innerHTML = analysisHTML();
  buildAll();
}

// ── HTML ──────────────────────────────────────────────
function analysisHTML() {
  return `<div class="view-pad">
    <!-- Forecast -->
    <div class="forecast-card">
      <div class="forecast-title">📈 Week-End Forecast</div>
      <div class="forecast-main mono" id="fc-proj">AED —</div>
      <div class="forecast-sub" id="fc-text">Enter daily data to generate forecast.</div>
      <div id="fc-badge"></div>
    </div>

    <!-- KPI summary row -->
    <div class="g4" style="margin-bottom:10px">
      <div class="kpi-card kpi-card-mint"><div class="kpi-label">Best Day</div><div class="kpi-value" id="an-best-day">—</div><div class="kpi-sub" id="an-best-val">—</div></div>
      <div class="kpi-card kpi-card-red"><div class="kpi-label">Weakest Day</div><div class="kpi-value" id="an-worst-day">—</div><div class="kpi-sub" id="an-worst-val">—</div></div>
      <div class="kpi-card kpi-card-blue"><div class="kpi-label">Avg ATV</div><div class="kpi-value" id="an-atv">—</div><div class="kpi-sub">Week avg</div></div>
      <div class="kpi-card kpi-card-purple"><div class="kpi-label">No7 Contrib</div><div class="kpi-value" id="an-no7pct">—</div><div class="kpi-sub">of total sales</div></div>
    </div>

    <!-- Sales trend chart -->
    <div class="chart-card">
      <div class="chart-card-header">
        <span class="chart-card-title">Sales Trend</span>
        <span class="chart-card-sub">Last 3 weeks vs target</span>
      </div>
      <div class="chart-wrap"><canvas id="chart-sales-trend"></canvas></div>
    </div>

    <!-- No7 chart -->
    <div class="chart-card">
      <div class="chart-card-header">
        <span class="chart-card-title">No7 Performance</span>
        <span class="chart-card-sub">Weekly contribution %</span>
      </div>
      <div class="chart-wrap"><canvas id="chart-no7"></canvas></div>
    </div>

    <!-- KPI progress bars -->
    <div class="card">
      <div style="font-size:.78rem;font-weight:700;margin-bottom:12px">KPI Achievement — Week <span id="an-wk"></span></div>
      <div id="kpi-bars"></div>
    </div>

    <!-- AURA chart -->
    <div class="chart-card">
      <div class="chart-card-header">
        <span class="chart-card-title">AURA Capture</span>
        <span class="chart-card-sub">Daily % this week</span>
      </div>
      <div class="chart-wrap"><canvas id="chart-aura"></canvas></div>
    </div>
  </div>`;
}

// ── Build all ─────────────────────────────────────────
function buildAll() {
  const { weekNum, n7WeeklyBP } = store.settings;
  const weekBP  = getWeekBP(weekNum) || store.settings.wbpOverride;
  const kdRate  = store.settings.kdRate;

  const wkEntries = DAYS.map(d => ({ ...(db.getEntry(weekNum, d) || {}), _day: d }));
  const wkKPIs = calcWeekKPIs(wkEntries, { weekBP, n7WeekBP: n7WeeklyBP, kdRate });

  setText('an-wk', weekNum);
  setText('an-best-day',  wkKPIs.bestDay  || '—');
  setText('an-best-val',  wkKPIs.bestSales  != null ? 'AED ' + fmtAED(wkKPIs.bestSales)  : '—');
  setText('an-worst-day', wkKPIs.worstDay || '—');
  setText('an-worst-val', wkKPIs.worstSales != null ? 'AED ' + fmtAED(wkKPIs.worstSales) : '—');
  setText('an-atv',    wkKPIs.wkAtv ? fmtAED(Math.round(wkKPIs.wkAtv)) : '—');
  setText('an-no7pct', fmtPct(wkKPIs.wkNo7Pct));

  // Forecast
  const fc = calcForecast(wkEntries, weekBP);
  if (fc) {
    setText('fc-proj', `AED ${fmtAED(Math.round(fc.projected))}`);
    setText('fc-text', `${fc.daysIn} day(s) entered · avg AED ${fmtAED(Math.round(fc.avgPerDay))}/day · ${fc.daysLeft} remaining`);
    const cls  = forecastBadgeClass(fc.projectedPct);
    const icon = fc.projectedPct >= 100 ? '🎯' : fc.projectedPct >= 85 ? '⚠️' : '⬇️';
    const badge = el('fc-badge');
    if (badge) badge.innerHTML = `<div class="forecast-badge ${cls}">${icon} ${fmtPct(fc.projectedPct)} projected</div>`;
  }

  // KPI progress bars
  const barsEl = el('kpi-bars');
  if (barsEl) {
    const kpis = [
      { label: 'Week Sales', val: wkKPIs.wkSales,  target: weekBP,        color: 'var(--mint)' },
      { label: 'Week No7',   val: wkKPIs.wkNo7,    target: n7WeeklyBP,    color: 'var(--blue)' },
      { label: 'Avg SFA',    val: wkKPIs.avgSfa,    target: 65, unit: '%', color: 'var(--purple)' },
      { label: 'AURA Capture', val: wkKPIs.wkAuraPct, target: 30, unit: '%', color: 'var(--mint)' },
    ];
    barsEl.innerHTML = kpis.map(k => {
      const pct  = k.val != null && k.target ? Math.min(100, (k.val / k.target) * 100) : 0;
      const col  = achColor(pct);
      const vFmt = k.unit === '%' ? fmtPct(k.val) : (k.val != null ? 'AED ' + fmtAED(k.val) : '—');
      const tFmt = k.unit === '%' ? fmtPct(k.target) : 'AED ' + fmtAED(k.target);
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;font-weight:600;margin-bottom:5px">
          <span>${k.label}</span>
          <span class="mono" style="color:${col}">${vFmt} / ${tFmt}</span>
        </div>
        <div class="pbar-track"><div class="pbar-fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="pbar-labels"><span>${pct.toFixed(0)}%</span><span>Target</span></div>
      </div>`;
    }).join('');
  }

  buildCharts(weekNum);
}

// ── Charts ────────────────────────────────────────────
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12, padding: 8 } } },
};
const gridOpts = { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } };

function buildCharts(wk) {
  buildSalesTrend(wk);
  buildNo7Chart(wk);
  buildAuraChart(wk);
}

function buildSalesTrend(wk) {
  const canvasEl = el('chart-sales-trend');
  if (!canvasEl) return;
  if (charts.sales) charts.sales.destroy();

  const wkBP = getWeekBP(wk);
  const datasets = [wk-2, wk-1, wk].map((w, i) => {
    if (w < 1) return null;
    const vals = DAYS.map(d => db.getEntry(w, d)?.sales || 0);
    const alpha = [0.3, 0.55, 0.9][i];
    return {
      label: `Week ${w}`,
      data: vals,
      backgroundColor: `rgba(0,200,150,${alpha})`,
      borderColor: `rgba(0,168,126,${alpha})`,
      borderWidth: i === 2 ? 2 : 1,
      borderRadius: 4,
    };
  }).filter(Boolean);

  // Add BP target line
  if (wkBP) {
    const dailyAvgBP = wkBP / 7;
    datasets.push({
      label: 'Daily BP avg',
      data: Array(7).fill(dailyAvgBP),
      type: 'line',
      borderColor: 'rgba(245,166,35,0.8)',
      borderWidth: 2,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
    });
  }

  charts.sales = new Chart(canvasEl, {
    type: 'bar',
    data: { labels: DAYS, datasets },
    options: {
      ...chartDefaults,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { ...gridOpts, ticks: { ...gridOpts.ticks, callback: v => fmtAED(v) } },
      },
    },
  });
}

function buildNo7Chart(wk) {
  const canvasEl = el('chart-no7');
  if (!canvasEl) return;
  if (charts.no7) charts.no7.destroy();

  const data = DAYS.map(d => {
    const e = db.getEntry(wk, d) || {};
    return e.no7 && e.sales ? +((e.no7 / e.sales) * 100).toFixed(1) : 0;
  });

  charts.no7 = new Chart(canvasEl, {
    type: 'line',
    data: {
      labels: DAYS,
      datasets: [{
        label: 'No7 %',
        data,
        borderColor: 'rgba(74,144,217,1)',
        backgroundColor: 'rgba(74,144,217,0.1)',
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4,
        pointBackgroundColor: 'rgba(74,144,217,1)',
      }],
    },
    options: {
      ...chartDefaults,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { ...gridOpts, ticks: { ...gridOpts.ticks, callback: v => v + '%' } },
      },
    },
  });
}

function buildAuraChart(wk) {
  const canvasEl = el('chart-aura');
  if (!canvasEl) return;
  if (charts.aura) charts.aura.destroy();

  const data = DAYS.map(d => {
    const e = db.getEntry(wk, d) || {};
    return e.aura && e.trn ? +((e.aura / e.trn) * 100).toFixed(1) : 0;
  });

  charts.aura = new Chart(canvasEl, {
    type: 'line',
    data: {
      labels: DAYS,
      datasets: [{
        label: 'AURA %',
        data,
        borderColor: 'rgba(0,200,150,1)',
        backgroundColor: 'rgba(0,200,150,0.1)',
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4,
        pointBackgroundColor: 'rgba(0,200,150,1)',
      }],
    },
    options: {
      ...chartDefaults,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { ...gridOpts, ticks: { ...gridOpts.ticks, callback: v => v + '%' } },
      },
    },
  });
}
