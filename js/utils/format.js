/** js/utils/format.js — Pure number/date formatting */
export function fmtAED(n,d=0){ if(n==null||!isFinite(n)) return '—'; return n.toLocaleString('en-AE',{minimumFractionDigits:d,maximumFractionDigits:d}); }
export function fmtPct(n,d=1){ if(n==null||!isFinite(n)) return '—%'; return n.toFixed(d)+'%'; }
export function fmtKD(aed,rate=11.99){ if(aed==null||!isFinite(aed)) return '— KD'; return (aed/rate).toFixed(2)+' KD'; }
export function fmtShort(n){ if(n==null) return '—'; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(1)+'k'; return String(Math.round(n)); }
export function fmtDate(iso){ return new Date(iso).toLocaleDateString('en-AE',{weekday:'short',day:'2-digit',month:'short'}); }
export function fmtDateTime(iso){ return new Date(iso).toLocaleString('en-AE',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
export function fmtTimeAgo(iso){ const d=Date.now()-new Date(iso).getTime(); if(d<60000) return 'just now'; if(d<3600000) return Math.floor(d/60000)+'m ago'; if(d<86400000) return Math.floor(d/3600000)+'h ago'; return fmtDate(iso); }
export function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
