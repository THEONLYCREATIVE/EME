/**
 * Export Service — No7 Analytics
 * Handles CSV, JSON, and WhatsApp sharing.
 *
 * UPGRADE HOOK: PDF Export
 * ───────────────────────────────────────────────────────────────
 * Client-side PDF with jsPDF:
 *   import jsPDF from 'https://esm.sh/jspdf'
 *   const doc = new jsPDF()
 *   doc.text('No7 Analytics Report', 10, 10)
 *   // Add charts: doc.addImage(canvas.toDataURL(), 'PNG', ...)
 *   doc.save('no7-report.pdf')
 *
 * Server-side PDF (better quality):
 *   Send data to backend → Puppeteer renders HTML → returns PDF blob
 *   See docs/upgrade-hooks/SYNC_UPGRADE.md
 */

import * as db from '../store/db.js';
import { DAYS } from '../data/store-bp.js';
import { computeDayKPIs, fmt, fmtP, fmtKD } from './analytics.js';

// ── CSV EXPORT ─────────────────────────────────────────────────
export function exportCSV(settings) {
  const headers = [
    'Week','Day','Sales AED','TRN','ATV','SFA%','Items','IPC',
    'No7 AED','No7 VAT-5%','No7%','No7 TRN','AURA','AURA%','CSAT','Focus',
    'Day BP','Ach%','Saved By','Saved At'
  ];
  const rows = [headers];

  for (let w = 1; w <= 53; w++) {
    DAYS.forEach(day => {
      const entry = db.get(db.dayKey(w, day));
      if (!entry) return;
      const k = computeDayKPIs(entry, w, day, settings);
      rows.push([
        w, day,
        entry.sales ?? '', entry.trn ?? '',
        k.atv != null ? k.atv.toFixed(0) : '',
        entry.sfa ?? '', entry.items ?? '',
        k.ipc != null ? k.ipc.toFixed(2) : '',
        entry.no7 ?? '',
        k.no7vat != null ? k.no7vat.toFixed(0) : '',
        k.no7pct != null ? k.no7pct.toFixed(2) : '',
        entry.no7trn ?? '', entry.aura ?? '',
        k.auraPct != null ? k.auraPct.toFixed(1) : '',
        entry.csat ?? '', entry.focus ?? '',
        k.dayBP ?? '',
        k.achPct != null ? k.achPct.toFixed(1) : '',
        entry.savedBy ?? '', entry.savedAt ?? ''
      ]);
    });
  }

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv' }), 'no7_data_export.csv');
}

// ── JSON BACKUP ────────────────────────────────────────────────
export function exportJSON() {
  const backup = {
    version:    2,
    exportedAt: new Date().toISOString(),
    store:      'DXB_T3',
    data:       db.exportAll(),
  };
  triggerDownload(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `no7_backup_${new Date().toISOString().slice(0,10)}.json`
  );
}

// ── WHATSAPP ────────────────────────────────────────────────────
export function shareWhatsApp({ entry, kpis, week, day, settings, user }) {
  const { sales, trn, no7, no7trn, aura, sfa, items } = entry;
  const ts = new Date().toLocaleString('en-AE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const msg = [
    `*Daily Sales Report · Wk${week} | ${day}*`,
    `Store: ${settings.store}`,
    `Entry: ${ts}`,
    ``,
    `📊 *Sales Performance*`,
    `• Sales: AED ${fmt(sales)} / AED ${fmt(kpis.dayBP)} (${fmtP(kpis.achPct)})`,
    `• TRN: ${fmt(trn)} | ATV: AED ${fmt(kpis.atv, 0)}`,
    `• SFA: ${sfa != null ? sfa+'%' : '—'} | IPC: ${kpis.ipc != null ? kpis.ipc.toFixed(2) : '—'}`,
    `• KD Value: ${fmtKD(kpis.kdSales)}`,
    ``,
    `🔵 *No7*`,
    `• Sales: AED ${fmt(no7)} (${fmtP(kpis.no7pct)} of total)`,
    `• VAT -5%: AED ${fmt(kpis.no7vat, 0)}`,
    `• No7 TRN: ${fmt(no7trn)} | KD: ${fmtKD(kpis.kdNo7)}`,
    ``,
    `💚 *AURA*`,
    `• ${fmt(aura)} signups / ${fmt(trn)} TRN = ${fmtP(kpis.auraPct)}`,
    ``,
    `*Entered by: ${user}*`,
  ].join('\n');

  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

// ── HELPER ─────────────────────────────────────────────────────
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
