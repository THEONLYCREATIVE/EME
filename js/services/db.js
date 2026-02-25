/**
 * js/services/db.js
 * Local persistence layer (localStorage).
 * UPGRADE HOOK: replace get/set/del/list with Supabase/Firebase
 * keeping the same API — no other file changes needed.
 */
const NS = 'n7__';
export const db = {
  get(k)    { try{ const r=localStorage.getItem(NS+k); return r==null?null:JSON.parse(r); }catch{ return null; } },
  set(k,v)  { try{ localStorage.setItem(NS+k,JSON.stringify(v)); return true; }catch{ return false; } },
  del(k)    { localStorage.removeItem(NS+k); },
  list(prefix='') { const ks=[]; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k.startsWith(NS+prefix)) ks.push(k.slice(NS.length));} return ks; },
  clearAll()  { this.list().forEach(k=>this.del(k)); },
  exportAll() { const o={}; this.list().forEach(k=>{ o[k]=this.get(k); }); return o; },
  entryKey(wk,day)     { return `entry__w${wk}_2026_${day}`; },
  saveEntry(wk,day,data) {
    const k=this.entryKey(wk,day);
    const existing=this.get(k)||{};
    const merged={...existing,...data,updatedAt:new Date().toISOString()};
    this.set(k,merged); return merged;
  },
  getEntry(wk,day)      { return this.get(this.entryKey(wk,day)); },
  getWeekEntries(wk)    {
    const days=['Fri','Sat','Sun','Mon','Tue','Wed','Thu'];
    const out={}; days.forEach(d=>{ out[d]=this.getEntry(wk,d)||null; }); return out;
  },
};
