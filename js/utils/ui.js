/** js/utils/ui.js — Toast, DOM helpers, confetti */
let toastTimer=null;
export function toast(msg,type='',dur=2500){ const e=document.getElementById('toast'); if(!e) return; e.textContent=msg; e.className=`toast on${type?' '+type:''}`; clearTimeout(toastTimer); toastTimer=setTimeout(()=>e.classList.remove('on'),dur); }
let cooldown=false;
export function celebrate(emoji='🎯',dur=2000){ if(cooldown) return; cooldown=true; setTimeout(()=>cooldown=false,5000); const ov=document.getElementById('success-overlay'),bu=document.getElementById('success-burst'); if(bu) bu.textContent=emoji; if(ov){ov.classList.add('show');setTimeout(()=>ov.classList.remove('show'),dur);} if(typeof confetti!=='undefined') confetti({particleCount:100,spread:75,origin:{y:.5},colors:['#00c896','#00e6ac','#4a90d9','#f5a623','#8b5cf6']}); }
export function updateSyncBar({online=true,pendingSync=0}={}){ const bar=document.getElementById('sync-bar'),text=document.getElementById('sync-text'); if(!bar) return; bar.className=online?'sync-bar':'sync-bar offline'; const ts=new Date().toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'}); text.textContent=!online?'Offline — changes queued':pendingSync?`${pendingSync} item(s) pending · ${ts}`:`Saved locally · ${ts}`; }
export const el    = id => document.getElementById(id);
export function setText(id,v){ const e=el(id); if(e) e.textContent=v??'—'; }
export function setHtml(id,v){ const e=el(id); if(e) e.innerHTML=v??''; }
export function show(id){ const e=el(id); if(e) e.hidden=false; }
export function hide(id){ const e=el(id); if(e) e.hidden=true; }
export function setBar(id,pct,color){ const e=el(id); if(!e) return; e.style.width=Math.min(100,Math.max(0,pct||0))+'%'; if(color) e.style.background=color; }
export function gNum(id){ const v=el(id)?.value; if(v===''||v==null) return null; const n=parseFloat(v); return isNaN(n)?null:n; }
export function gStr(id){ return el(id)?.value?.trim()||null; }
export function setVal(id,v){ const e=el(id); if(e&&v!=null) e.value=v; }
export function debounce(fn,ms=300){ let t; return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}; }
