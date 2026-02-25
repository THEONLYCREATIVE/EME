/**
 * Sync Service — No7 Analytics
 *
 * Currently: Local-only (no sync needed — all data stays in localStorage).
 * This module is the bridge between local state and any future cloud backend.
 *
 * ═══════════════════════════════════════════════════════════════
 * UPGRADE HOOK: Cloud Sync (Supabase / Firebase)
 * ───────────────────────────────────────────────────────────────
 *
 * Step 1 — Install Supabase client (no build step needed):
 *   import { createClient } from 'https://esm.sh/@supabase/supabase-js'
 *   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
 *
 * Step 2 — Replace pushEntry() below:
 *   export async function pushEntry(week, day, entry) {
 *     const { error } = await supabase
 *       .from('entries')
 *       .upsert({ week, day, ...entry, store_id: 'DXB_T3' })
 *     if (error) queueForRetry({ week, day, entry })
 *   }
 *
 * Step 3 — Real-time subscribe in any component:
 *   supabase
 *     .channel('entries')
 *     .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, payload => {
 *       store.saveDayEntry(payload.new.week, payload.new.day, payload.new)
 *     })
 *     .subscribe()
 *
 * Step 4 — Register background sync in sw.js:
 *   self.addEventListener('sync', e => {
 *     if (e.tag === 'sync-entries') e.waitUntil(syncQueuedEntries())
 *   })
 *
 * Conflict resolution: last-write-wins (updatedAt timestamp comparison).
 * For stricter: implement CRDTs or server-side merge — see SYNC_UPGRADE.md
 * ═══════════════════════════════════════════════════════════════
 */

import * as db from '../store/db.js';
import { state } from '../store/index.js';

// ── OFFLINE QUEUE ──────────────────────────────────────────────
// Entries saved while offline are queued here.
// When online, processQueue() drains them.

let queue = db.get('sync_queue') || [];

/** Queue an entry for later sync. Called automatically on save. */
export function queueForSync(payload) {
  queue.push({ ...payload, queuedAt: new Date().toISOString() });
  db.set('sync_queue', queue);
}

/** Try to sync the queue when connection restores. */
export async function processQueue() {
  if (!navigator.onLine || queue.length === 0) return;

  const pending = [...queue];
  queue = [];
  db.del('sync_queue');

  for (const item of pending) {
    try {
      // ── UPGRADE HOOK: Replace with real API call ──────────
      // await supabase.from('entries').upsert(item)
      // ── END HOOK ─────────────────────────────────────────
      console.log('[Sync] Would push:', item); // placeholder
    } catch (err) {
      // Push back to queue on failure
      queue.push(item);
      console.warn('[Sync] Failed, re-queued:', err);
    }
  }
  if (queue.length) db.set('sync_queue', queue);
}

/** Returns count of pending items. Used by UI sync indicator. */
export function pendingCount() { return queue.length; }

/** Status string for the sync bar. */
export function statusText() {
  if (!state.onlineStatus)   return `Offline · ${queue.length} pending`;
  if (queue.length > 0) return `Syncing ${queue.length} item(s)…`;
  return `All saved · ${new Date().toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'})}`;
}

/** Listen for reconnect → auto-drain queue. */
window.addEventListener('online', () => processQueue());

// ── BACKUP / RESTORE ───────────────────────────────────────────

/** Create full backup object. */
export function createBackup() {
  return {
    version:    2,
    exportedAt: new Date().toISOString(),
    store:      'DXB_T3',
    data:       db.exportAll(),
  };
}

/** Restore from backup object. Merges (won't overwrite newer entries). */
export function restoreBackup(backup) {
  if (!backup?.data) throw new Error('Invalid backup format');
  let count = 0;
  for (const [key, value] of Object.entries(backup.data)) {
    const existing = db.get(key);
    // Skip if existing is newer
    if (existing?.updatedAt && value?.updatedAt && existing.updatedAt > value.updatedAt) continue;
    db.set(key, value);
    count++;
  }
  return count;
}
