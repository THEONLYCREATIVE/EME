/**
 * App State Store — No7 Analytics
 *
 * Centralised reactive state. All components read from here.
 * Components never call db.js directly — they call store actions.
 * Store actions update state AND persist via db.js.
 *
 * Pattern: Observer (subscribe/notify) — no framework needed.
 *
 * ═══════════════════════════════════════════════════════════════
 * UPGRADE HOOK: Real state management
 * ───────────────────────────────────────────────────────────────
 * To migrate to a framework later (Preact, Solid, Vue):
 * - Replace this module with a signal/store from that framework
 * - Keep the same action names — components won't need changes
 * See docs/upgrade-hooks/SYNC_UPGRADE.md
 * ═══════════════════════════════════════════════════════════════
 */

import * as db from './db.js';
import { currentWeekNum, todayDayStr } from '../data/store-bp.js';

// ── DEFAULT STATE ──────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  store:         'Dubai Airport T3 Arrivals',
  wk:            currentWeekNum(),
  kdRate:        11.99,
  n7dailyBP:     2650,
  n7weeklyBP:    18550,
  divAPercent:   60,
  dbpOverride:   null,
  wbpOverride:   null,
  features: {
    ocr:          true,
    confetti:     true,
    staffTracker: true,
    divSplit:     true,
    kdConverter:  true,
  }
};

const DEFAULT_STAFF = [
  { id:1, name:'Team Member 1', initials:'T1', color:0, wkTarget:5000 },
  { id:2, name:'Team Member 2', initials:'T2', color:1, wkTarget:5000 },
  { id:3, name:'Team Member 3', initials:'T3', color:2, wkTarget:5000 },
  { id:4, name:'Team Member 4', initials:'T4', color:3, wkTarget:5000 },
  { id:5, name:'Team Member 5', initials:'T5', color:4, wkTarget:5000 },
];

const DEFAULT_CHECKLIST = [
  'Sales data entered',
  'No7 data entered',
  'AURA signups logged',
  'SFA % confirmed',
  'Focus product counted',
  'Daily report shared',
];

// ── STATE ──────────────────────────────────────────────────────
export const state = {
  // Auth
  role:         null,   // 'staff' | 'master' | null
  user:         null,

  // Navigation
  activeView:   'entry',
  activeDay:    todayDayStr(),

  // Persisted
  settings:     db.get('settings') || { ...DEFAULT_SETTINGS },
  staff:        db.get('staff')    || DEFAULT_STAFF.map(s => ({...s})),
  checklist:    db.get('checklist')|| [...DEFAULT_CHECKLIST],
  auditLog:     db.get('audit')    || [],

  // UI
  checklistOpen: false,
  onlineStatus:  navigator.onLine,
};

// ── SUBSCRIBERS ────────────────────────────────────────────────
const subscribers = new Map();

export function subscribe(event, fn) {
  if (!subscribers.has(event)) subscribers.set(event, []);
  subscribers.get(event).push(fn);
  return () => { // returns unsubscribe
    const arr = subscribers.get(event);
    subscribers.set(event, arr.filter(f => f !== fn));
  };
}

function notify(event, data) {
  (subscribers.get(event) || []).forEach(fn => fn(data));
  (subscribers.get('*') || []).forEach(fn => fn({ event, data }));
}

// ── ACTIONS ────────────────────────────────────────────────────

export function setAuth(role, user) {
  state.role = role;
  state.user = user;
  notify('auth', { role, user });
}

export function navigate(view) {
  state.activeView = view;
  notify('navigate', view);
}

export function selectDay(day) {
  state.activeDay = day;
  notify('dayChange', day);
}

export function saveSettings(patch) {
  Object.assign(state.settings, patch);
  db.set('settings', state.settings);
  addAudit('settings_saved', `Week ${state.settings.wk}`);
  notify('settingsChange', state.settings);
}

export function getDayEntry(week, day) {
  return db.get(db.dayKey(week, day)) || {};
}

export function saveDayEntry(week, day, data) {
  const existing = getDayEntry(week, day);
  const entry = {
    ...existing,
    ...data,
    savedAt:   new Date().toISOString(),
    savedBy:   state.user || 'Staff',
    updatedAt: new Date().toISOString(),
    device:    navigator.userAgent.slice(0, 60),
    // Preserve creation timestamp
    createdAt: existing.createdAt || new Date().toISOString(),
  };
  db.set(db.dayKey(week, day), entry);
  addAudit('entry_saved', `Wk${week} ${day}: Sales AED ${data.sales ?? '—'}`);
  notify('entryChange', { week, day, entry });
}

export function saveStaffEntry(staffId, week, day, data) {
  const key = db.staffDayKey(staffId, week, day);
  const entry = {
    ...data,
    savedAt: new Date().toISOString(),
    savedBy: state.user,
  };
  db.set(key, entry);
  const s = state.staff.find(x => x.id === staffId);
  addAudit('staff_entry', `${s?.name}: No7 ${data.no7} on Wk${week} ${day}`);
  notify('staffEntryChange', { staffId, week, day, entry });
}

export function getStaffEntry(staffId, week, day) {
  return db.get(db.staffDayKey(staffId, week, day)) || {};
}

export function saveStaff(staff) {
  state.staff = staff;
  db.set('staff', staff);
  notify('staffChange', staff);
}

export function addStaffMember(name) {
  const id = state.staff.length ? Math.max(...state.staff.map(s => s.id)) + 1 : 1;
  const member = { id, name, initials: name.slice(0,2).toUpperCase(), color: id % 7, wkTarget: 5000 };
  state.staff = [...state.staff, member];
  db.set('staff', state.staff);
  addAudit('staff_added', name);
  notify('staffChange', state.staff);
  return member;
}

export function saveChecklist(items) {
  state.checklist = items;
  db.set('checklist', items);
  notify('checklistItemsChange', items);
}

export function getChecklistDone(dateStr) {
  return db.get('chk_' + dateStr) || {};
}

export function saveChecklistDone(dateStr, done) {
  db.set('chk_' + dateStr, done);
  notify('checklistDoneChange', { dateStr, done });
}

export function addAudit(action, detail) {
  state.auditLog.unshift({
    action, detail,
    user:   state.user || 'Unknown',
    role:   state.role || 'staff',
    ts:     new Date().toISOString(),
    day:    state.activeDay,
  });
  if (state.auditLog.length > 200) state.auditLog.pop();
  db.set('audit', state.auditLog);
  notify('auditChange', state.auditLog);
}

export function toggleWeekLock(week) {
  const key = `locked_w${week}`;
  const current = db.get(key) || false;
  db.set(key, !current);
  addAudit(!current ? 'week_locked' : 'week_unlocked', `Week ${week}`);
  notify('weekLockChange', { week, locked: !current });
  return !current;
}

export function isWeekLocked(week) {
  return db.get(`locked_w${week}`) || false;
}

// ── ONLINE STATUS ──────────────────────────────────────────────
window.addEventListener('online',  () => { state.onlineStatus = true;  notify('online', true);  });
window.addEventListener('offline', () => { state.onlineStatus = false; notify('online', false); });
