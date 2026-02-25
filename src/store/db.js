/**
 * DB Adapter — No7 Analytics
 *
 * Currently wraps localStorage with a clean key-namespaced API.
 *
 * ═══════════════════════════════════════════════════════════════
 * UPGRADE HOOK: Cloud Sync / Real Database
 * ───────────────────────────────────────────────────────────────
 * To swap to Supabase or Firebase:
 *
 * 1. Install: import { createClient } from 'https://esm.sh/@supabase/supabase-js'
 * 2. Replace get/set below with Supabase calls:
 *
 *   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
 *
 *   export async function get(key) {
 *     const { data } = await supabase.from('entries').select('*').eq('key', key).single()
 *     return data?.value ?? null
 *   }
 *   export async function set(key, value) {
 *     await supabase.from('entries').upsert({ key, value, updated_at: new Date() })
 *   }
 *
 * The rest of the app calls db.get/db.set — nothing else needs to change.
 * See docs/upgrade-hooks/SYNC_UPGRADE.md for full migration guide.
 * ═══════════════════════════════════════════════════════════════
 */

const NS = 'n7_'; // namespace prefix — all keys prefixed to avoid collisions

/** Read a namespaced key. Returns parsed value or null. */
export function get(key) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Write a namespaced key. Returns true on success. */
export function set(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[DB] set failed:', key, e);
    return false;
  }
}

/** Delete a namespaced key. */
export function del(key) {
  localStorage.removeItem(NS + key);
}

/** List all keys matching an optional prefix. Returns plain key names (no NS). */
export function list(prefix = '') {
  const full = NS + prefix;
  return Object.keys(localStorage)
    .filter(k => k.startsWith(full))
    .map(k => k.slice(NS.length));
}

/** Export all app data as a plain object. Used for backup. */
export function exportAll() {
  const out = {};
  list().forEach(k => { out[k] = get(k); });
  return out;
}

/** Nuke all app data. Irreversible. */
export function clearAll() {
  list().forEach(k => del(k));
}

/** Convenience: day entry key */
export function dayKey(week, day) {
  return `w${week}_2026_${day}`;
}

/** Convenience: staff entry key */
export function staffDayKey(staffId, week, day) {
  return `staff_${staffId}_w${week}_2026_${day}`;
}
