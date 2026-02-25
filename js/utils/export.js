/** js/utils/export.js — CSV / JSON export. See README for PDF upgrade. */
import { db } from '../services/db.js';
import { DAYS } from '../data/bp.js';
export function exportCSV(){
  const H=['Week','Day','Sales','TRN','ATV','IPC','SFA%','Items','No7','No7%','No7VAT5%','No7TRN','AURA','AURA%','CSAT','Focus','EnteredBy','UpdatedAt'];
  const rows=[H];
  for(let w=1;w<=53;w++) DAYS.forEach(d=>{ const e=db.getEntry(w,d); if(!e) return; const atv=e.trn?(e.sales/e.trn).toFixed(0):'',ipc=(e.items&&e.trn)?(e.items/e.trn).toFixed(2):'',n7p=(e.no7&&e.sales)?((e.no7/e.sales)*100).toFixed(2):'',n7v=e.no7?(e.no7*.95).toFixed(0):'',aup=(e.aura&&e.trn)?((e.aura/e.trn)*100).toFixed(1):''; rows.push([w,d,e.sales??'',e.trn??'',atv,ipc,e.sfa??'',e.items??'',e.no7??'',n7p,n7v,e.no7trn??'',e.aura??'',aup,e.csat??'',e.focus??'',e.enteredBy??'',e.updatedAt??'']); });
  dl(rows.map(r=>r.map(c=>{const s=String(c??'');return s.includes(',')||s.includes('"')?`"${s.replace(/"/g,'""')}"`:''+s;}).join(',')).join('\n'),'no7_export.csv','text/csv');
}
export function exportJSON(){ dl(JSON.stringify(db.exportAll(),null,2),`no7_backup_${slug()}.json`,'application/json'); }
export function importJSON(text){ try{const d=JSON.parse(text);Object.entries(d).forEach(([k,v])=>db.set(k,v));return{ok:true,count:Object.keys(d).length};}catch(e){return{ok:false,error:e.message};} }
function dl(content,name,mime){ Object.assign(document.createElement('a'),{href:`data:${mime};charset=utf-8,`+encodeURIComponent(content),download:name}).click(); }
function slug(){ return new Date().toISOString().slice(0,10); }
