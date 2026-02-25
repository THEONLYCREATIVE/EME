/**
 * Analytics Service — No7 Analytics
 * Pure calculation functions. No DOM, no state — just maths.
 * Components call these to compute display values.
 */

import * as db from '../store/db.js';
import { DAYS, getDayBP, getWeekBP } from '../data/store-bp.js';

/** All KPIs for a single day entry */
export function computeDayKPIs(entry, week, day, settings) {
  const { sales=null, trn=null, items=null, no7=null, no7trn=null, aura=null, sfa=null } = entry;
  const dayBP   = getDayBP(week, day, settings.dbpOverride);
  const n7dayBP = settings.n7dailyBP;
  const kd      = settings.kdRate || 11.99;

  const atv     = numDiv(sales, trn);
  const ipc     = numDiv(items, trn);
  const no7pct  = numDiv(no7, sales, 100);
  const no7vat  = no7 != null ? no7 * 0.95 : null;
  const auraPct = numDiv(aura, trn, 100);
  const achPct  = numDiv(sales, dayBP, 100);
  const gap     = sales != null && dayBP != null ? sales - dayBP : null;
  const n7ach   = numDiv(no7, n7dayBP, 100);

  const divA    = settings.divAPercent / 100 || 0.6;

  return {
    sales, trn, items, no7, no7trn, aura, sfa,
    dayBP, n7dayBP,
    atv, ipc, no7pct, no7vat, auraPct, achPct, gap, n7ach,
    divA: sales != null ? sales * divA    : null,
    divB: sales != null ? sales * (1-divA): null,
    kdSales: kdConvert(sales, kd),
    kdNo7:   kdConvert(no7, kd),
    kdATV:   kdConvert(atv, kd),
  };
}

/** Week-level rollup */
export function computeWeekRollup(week, settings) {
  const wkBP   = getWeekBP(week, settings.wbpOverride);
  const n7wkBP = settings.n7weeklyBP;
  let sales=0, trn=0, no7=0, aura=0, sfaSum=0, sfaDays=0;
  let bestDay=null, bestVal=0, worstDay=null, worstVal=Infinity;

  DAYS.forEach(day => {
    const e = db.get(db.dayKey(week, day)) || {};
    sales += e.sales || 0;
    trn   += e.trn   || 0;
    no7   += e.no7   || 0;
    aura  += e.aura  || 0;
    if (e.sfa) { sfaSum += e.sfa; sfaDays++; }
    if (e.sales > bestVal)  { bestVal=e.sales;  bestDay=day; }
    if (e.sales && e.sales < worstVal) { worstVal=e.sales; worstDay=day; }
  });

  const daysFilled = DAYS.filter(d => (db.get(db.dayKey(week,d))||{}).sales != null).length;
  const projected  = daysFilled > 0 ? (sales / daysFilled) * 7 : null;
  const projPct    = projected != null && wkBP ? (projected / wkBP) * 100 : null;

  return {
    sales, trn, no7, aura, wkBP, n7wkBP, daysFilled,
    atv:      numDiv(sales, trn),
    no7pct:   numDiv(no7, sales, 100),
    auraPct:  numDiv(aura, trn, 100),
    achPct:   numDiv(sales, wkBP, 100),
    n7achPct: numDiv(no7, n7wkBP, 100),
    avgSFA:   sfaDays ? sfaSum / sfaDays : null,
    bestDay, bestVal: bestVal || null,
    worstDay, worstVal: worstVal < Infinity ? worstVal : null,
    projected, projPct,
  };
}

/** Sales data for last N weeks (for charts) */
export function weeksSalesData(currentWeek, n = 3) {
  return DAYS.map(day => {
    const vals = [];
    for (let i = n - 1; i >= 0; i--) {
      const w = currentWeek - i;
      const e = db.get(db.dayKey(w, day)) || {};
      vals.push(e.sales || 0);
    }
    return { day, vals };
  });
}

/** Staff week rollup for one member */
export function staffWeekRollup(staffId, week) {
  let total = 0, trn = 0;
  DAYS.forEach(day => {
    const e = db.get(db.staffDayKey(staffId, week, day)) || {};
    total += e.no7 || 0;
    trn   += e.no7trn || 0;
  });
  return { total, trn };
}

// ── HELPERS ────────────────────────────────────────────────────
function numDiv(a, b, mult = 1) {
  return (a != null && b != null && b !== 0) ? (a / b) * mult : null;
}
function kdConvert(aed, rate) {
  return (aed != null && rate) ? aed / rate : null;
}

/** Format number with commas */
export function fmt(n, dec = 0) {
  if (n == null) return '—';
  return n.toLocaleString('en-AE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** Format percentage */
export function fmtP(n, dec = 1) {
  return n == null ? '—%' : n.toFixed(dec) + '%';
}

/** Format KD */
export function fmtKD(n) {
  return n == null ? '— KD' : n.toFixed(2) + ' KD';
}

/** Color for achievement % */
export function achColor(pct) {
  if (pct == null) return 'var(--text2)';
  return pct >= 100 ? 'var(--mint-dark)' : pct >= 90 ? 'var(--amber)' : 'var(--red)';
}

/** Badge class for achievement % */
export function achBadge(pct) {
  if (pct == null) return 'badge-blue';
  return pct >= 100 ? 'badge-mint' : pct >= 90 ? 'badge-amber' : 'badge-red';
}

/** Today as YYYY-MM-DD string */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
