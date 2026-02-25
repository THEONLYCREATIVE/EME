/**
 * js/store/index.js — Reactive state store (pub/sub)
 */
import { db } from '../services/db.js';
import { getCurrentWeekNum, getTodayRetailDay } from '../data/bp.js';

const DEFAULT_SETTINGS = {
  store:'Dubai Airport T3 Arrivals', weekNum:getCurrentWeekNum(),
  currentDay:getTodayRetailDay(), kdRate:11.99,
  n7DailyBP:2650, n7WeeklyBP:18550, divAPercent:60,
  dbpOverride:null, wbpOverride:null,
  features:{ ocr:true, confetti:true, staff:true, divisions:true, kd:true },
};
const DEFAULT_STAFF = [
  {id:1,name:'Team Member 1',initials:'T1',colorIdx:0,weeklyTarget:5000,entries:{}},
  {id:2,name:'Team Member 2',initials:'T2',colorIdx:1,weeklyTarget:5000,entries:{}},
  {id:3,name:'Team Member 3',initials:'T3',colorIdx:2,weeklyTarget:5000,entries:{}},
  {id:4,name:'Team Member 4',initials:'T4',colorIdx:3,weeklyTarget:5000,entries:{}},
  {id:5,name:'Team Member 5',initials:'T5',colorIdx:4,weeklyTarget:5000,entries:{}},
];
const DEFAULT_CHECKLIST = ['Sales data entered','No7 data entered','AURA signups logged','SFA % confirmed','Focus product counted','Daily report shared'];

const state = {
  auth:{ loggedIn:false, role:null, user:null },
  settings:{ ...DEFAULT_SETTINGS },
  staff:[...DEFAULT_STAFF],
  checklist:[...DEFAULT_CHECKLIST],
  checklistDone:{},
  auditLog:[],
  weekLocks:{},
};

const subs = {};
function notify(k) { subs[k]?.forEach(fn => { try{ fn(state[k]); }catch(e){} }); }
export function subscribe(k, fn) { if(!subs[k]) subs[k]=new Set(); subs[k].add(fn); return ()=>subs[k].delete(fn); }

export const store = {
  get auth()          { return state.auth; },
  get settings()      { return state.settings; },
  get staff()         { return state.staff; },
  get checklist()     { return state.checklist; },
  get checklistDone() { return state.checklistDone; },
  get auditLog()      { return state.auditLog; },
  get weekLocks()     { return state.weekLocks; },
};

export function setAuth(a) { state.auth={ ...state.auth,...a }; notify('auth'); }

export function loadSettings() {
  const s=db.get('settings');
  if(s) state.settings={ ...DEFAULT_SETTINGS,...s, features:{...DEFAULT_SETTINGS.features,...(s.features||{})} };
  notify('settings');
}
export function saveSettings(patch) {
  state.settings={ ...state.settings,...patch };
  db.set('settings',state.settings); notify('settings');
}
export function toggleFeature(key) {
  state.settings.features[key]=!state.settings.features[key];
  db.set('settings',state.settings); notify('settings');
}

export function loadStaff() { const s=db.get('staff'); if(s) state.staff=s; notify('staff'); }
export function saveStaff() { db.set('staff',state.staff); notify('staff'); }
export function addStaffMember(name) {
  const id=state.staff.length?Math.max(...state.staff.map(s=>s.id))+1:1;
  state.staff.push({id,name,initials:name.slice(0,2).toUpperCase(),colorIdx:id%7,weeklyTarget:5000,entries:{}});
  saveStaff();
}
export function updateStaffTarget(id,t) { const s=state.staff.find(x=>x.id===id); if(s){s.weeklyTarget=t;saveStaff();} }
export function logStaffEntry(staffId,dayKey,{no7,no7trn,by}) {
  const s=state.staff.find(x=>x.id===staffId); if(!s) return;
  if(!s.entries) s.entries={};
  s.entries[dayKey]={no7,no7trn,by,ts:new Date().toISOString()}; saveStaff();
}

function todayKey() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function loadChecklist() {
  const items=db.get('checklist'); if(items) state.checklist=items;
  const done=db.get('chk_done_'+todayKey()); if(done) state.checklistDone=done;
  notify('checklist');
}
export function toggleChecklistItem(i) {
  state.checklistDone[i]=!state.checklistDone[i];
  db.set('chk_done_'+todayKey(),state.checklistDone); notify('checklist');
}
export function addChecklistItem(text) { state.checklist.push(text); db.set('checklist',state.checklist); notify('checklist'); }
export function removeChecklistItem(i) { state.checklist.splice(i,1); db.set('checklist',state.checklist); notify('checklist'); }

export function loadAuditLog() { const s=db.get('audit_log'); if(s) state.auditLog=s; }
export function addAuditEntry(action,detail,user,role) {
  state.auditLog.unshift({action,detail,user,role,ts:new Date().toISOString()});
  if(state.auditLog.length>200) state.auditLog.pop();
  db.set('audit_log',state.auditLog); notify('auditLog');
}

export function loadWeekLocks() { const s=db.get('week_locks'); if(s) state.weekLocks=s; }
export function toggleWeekLock(wk) {
  state.weekLocks[wk]=!state.weekLocks[wk];
  db.set('week_locks',state.weekLocks); notify('weekLocks');
  return state.weekLocks[wk];
}

export function loadAll() { loadSettings(); loadStaff(); loadChecklist(); loadAuditLog(); loadWeekLocks(); }
