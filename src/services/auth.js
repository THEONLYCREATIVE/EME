/**
 * Auth Service — No7 Analytics
 *
 * Currently: PIN-based local auth with lockout.
 * Structured so the "verify" function can be swapped for a real
 * backend call without touching any component code.
 *
 * ═══════════════════════════════════════════════════════════════
 * UPGRADE HOOK: Real Authentication
 * ───────────────────────────────────────────────────────────────
 * Option A — Firebase Auth:
 *   import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
 *   Replace verifyStaff() with:
 *     const cred = await signInWithEmailAndPassword(auth, email, password)
 *     return { ok: true, role: cred.user.customClaims.role, user: cred.user.email }
 *
 * Option B — Supabase Auth:
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
 *   if (error) return { ok: false, message: error.message }
 *   return { ok: true, role: data.user.user_metadata.role, user: data.user.email }
 *
 * Option C — Entra ID (Teams SSO):
 *   Use MSAL.js — see docs/upgrade-hooks/TEAMS_UPGRADE.md
 *
 * The component only calls auth.verifyStaff() / auth.verifyMaster()
 * and reads { ok, role, user, message } — interface never changes.
 * ═══════════════════════════════════════════════════════════════
 */

import * as db from '../store/db.js';

// ── CONFIG ─────────────────────────────────────────────────────
// ⚠️  CHANGE THESE before deploying. In production, move to
//     server-side validation — never trust client-side secrets.
const STAFF_PINS   = ['1234', '5678', '9012', '3456', '7890'];
const MASTER_PWD   = 'master2026';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 60_000; // 1 minute

// ── RATE LIMITING ──────────────────────────────────────────────
function getAttempts() { return db.get('login_attempts') || 0; }
function getLockout()  { return db.get('login_lockout')  || 0; }
function bumpAttempts() {
  const n = getAttempts() + 1;
  db.set('login_attempts', n);
  if (n >= MAX_ATTEMPTS) {
    db.set('login_lockout', Date.now() + LOCKOUT_MS);
  }
  return n;
}
function resetAttempts() {
  db.del('login_attempts');
  db.del('login_lockout');
}

/** Check if currently locked out. Returns ms remaining (0 = not locked). */
export function lockoutRemaining() {
  const until = getLockout();
  return Math.max(0, until - Date.now());
}

// ── VERIFY FUNCTIONS ───────────────────────────────────────────

/**
 * Verify a staff PIN.
 * Returns: { ok: boolean, role: 'staff', user: string, message?: string }
 */
export async function verifyStaff(pin) {
  const remaining = lockoutRemaining();
  if (remaining > 0) {
    return { ok: false, message: `Locked out. Try again in ${Math.ceil(remaining/1000)}s.` };
  }

  // ── UPGRADE HOOK: Replace below with API call ───────────────
  // const res = await fetch('/api/auth/staff', {
  //   method: 'POST',
  //   body: JSON.stringify({ pin }),
  //   headers: { 'Content-Type': 'application/json' }
  // })
  // const data = await res.json()
  // if (data.ok) { resetAttempts(); return { ok:true, role:'staff', user: data.user } }
  // bumpAttempts()
  // return { ok: false, message: data.message }
  // ── END HOOK ────────────────────────────────────────────────

  if (STAFF_PINS.includes(String(pin).trim())) {
    resetAttempts();
    return { ok: true, role: 'staff', user: `Staff` };
  }
  const n = bumpAttempts();
  const left = MAX_ATTEMPTS - n;
  return { ok: false, message: left > 0 ? `Wrong PIN. ${left} attempt(s) left.` : 'Account locked for 60 seconds.' };
}

/**
 * Verify master password (first step of 2-factor master unlock).
 * Returns: { ok: boolean, message?: string }
 */
export async function verifyMasterPassword(pwd) {
  // ── UPGRADE HOOK: Replace with server-side check ────────────
  // const res = await fetch('/api/auth/master-verify', { method:'POST', body: JSON.stringify({ pwd }) })
  // return res.json()
  // ── END HOOK ────────────────────────────────────────────────

  if (pwd.trim() === MASTER_PWD) {
    return { ok: true };
  }
  bumpAttempts();
  return { ok: false, message: 'Incorrect master password.' };
}

/**
 * Complete master auth after drag+hold gesture.
 * Returns: { ok: true, role: 'master', user: 'Master Admin' }
 *
 * ── UPGRADE HOOK: Issue session token here ──────────────────
 * const { token } = await fetch('/api/auth/master-complete').then(r=>r.json())
 * sessionStorage.setItem('token', token)
 * ── END HOOK ────────────────────────────────────────────────
 */
export async function completeMasterAuth() {
  resetAttempts();
  return { ok: true, role: 'master', user: 'Master Admin' };
}

/**
 * Sign out. Clears any session data.
 *
 * ── UPGRADE HOOK: Invalidate server session ─────────────────
 * await fetch('/api/auth/logout', { method: 'POST' })
 * sessionStorage.removeItem('token')
 * ── END HOOK ────────────────────────────────────────────────
 */
export function signOut() {
  sessionStorage.removeItem('n7_session');
}
