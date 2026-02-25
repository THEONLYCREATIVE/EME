/**
 * js/services/auth.js
 * PIN + master password auth.
 * UPGRADE HOOK: swap verifyStaffPin/verifyMasterPassword for
 * Firebase signInWithEmailAndPassword or Supabase auth — see README.md
 */
import { db } from './db.js';
const CONFIG = { staffPins:['1234','5678','9012'], masterPassword:'master2026', maxAttempts:5, lockoutMs:60000 };
function getState()  { return { count:db.get('auth__attempts')||0, lockout:db.get('auth__lockout')||0 }; }
function bump()      { const s=getState(); s.count++; db.set('auth__attempts',s.count); if(s.count>=CONFIG.maxAttempts){const u=Date.now()+CONFIG.lockoutMs;db.set('auth__lockout',u);return{locked:true,until:u};} return{locked:false,remaining:CONFIG.maxAttempts-s.count}; }
function reset()     { db.del('auth__attempts'); db.del('auth__lockout'); }
function lockSecs()  { const r=( db.get('auth__lockout')||0)-Date.now(); return r>0?Math.ceil(r/1000):0; }
export function verifyStaffPin(pin) {
  const s=lockSecs(); if(s>0) return{ok:false,error:`Locked out. Try again in ${s}s.`};
  if(CONFIG.staffPins.includes(pin.trim())){reset(); const i=CONFIG.staffPins.indexOf(pin.trim()); return{ok:true,role:'staff',user:i===0?'Staff':`Staff ${i+1}`};}
  const r=bump(); if(r.locked) return{ok:false,error:'Too many attempts. Locked 60s.'}; return{ok:false,error:`Incorrect PIN. ${r.remaining} attempt(s) left.`};
}
export function verifyMasterPassword(pwd) {
  const s=lockSecs(); if(s>0) return{ok:false,error:`Locked out. ${s}s remaining.`};
  if(pwd.trim()===CONFIG.masterPassword) return{ok:true};
  const r=bump(); if(r.locked) return{ok:false,error:'Too many attempts. Locked 60s.'}; return{ok:false,error:`Incorrect password. ${r.remaining} attempt(s) left.`};
}
export function confirmMasterAccess() { reset(); return{ok:true,role:'master',user:'Master Admin'}; }
export function clearSession() { /* no-op for PIN auth; call provider signOut() here in real auth */ }
