/**
 * js/services/sync.js — Offline-first sync queue.
 * UPGRADE HOOK: replace flushQueue() body with Supabase upsert / Firebase setDoc.
 */
import { db } from './db.js';
const QK = 'sync__queue';
const getQ = () => db.get(QK)||[];
const saveQ = q => db.set(QK,q);
export function enqueue(action,payload) { const q=getQ(); q.push({id:crypto.randomUUID?.()??String(Date.now()),action,payload,ts:new Date().toISOString()}); saveQ(q); }
export async function flushQueue() { const q=getQ(); if(!q.length) return{flushed:0}; saveQ([]); return{flushed:q.length}; }
export const networkStatus = {
  isOnline:navigator.onLine, listeners:new Set(),
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);},
  notify(){this.listeners.forEach(fn=>fn(this.isOnline));},
};
window.addEventListener('online',  ()=>{ networkStatus.isOnline=true;  networkStatus.notify(); flushQueue(); });
window.addEventListener('offline', ()=>{ networkStatus.isOnline=false; networkStatus.notify(); });
export function pendingCount() { return getQ().length; }
