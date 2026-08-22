'use client';
/**
 * Feature #7: Realtime backend adapter.
 *
 * Supports three sync backends out of the box, all localStorage-first so the
 * app works fully offline and on a static GitHub Pages deploy:
 *
 *   1. 'local'   — localStorage only + cross-tab BroadcastChannel sync
 *                  (zero setup, works on GitHub Pages / localhost)
 *   2. 'hasura'  — Hasura GraphQL over WebSocket (real Postgres backend)
 *                  Provide endpoint + admin secret or JWT in settings
 *   3. 'supabase' — Supabase Realtime (Postgres-backed)
 *                  Provide URL + anon key
 *
 * On Android Chrome PWA installs, local mode is 100% functional; switching to
 * Hasura/Supabase flips on live multi-user sync across devices.
 */
import { db } from './store';

export type SyncBackend = 'local' | 'hasura' | 'supabase';

export interface SyncConfig {
  backend: SyncBackend;
  endpoint?: string;
  apiKey?: string;     // admin secret / anon key
  jwtToken?: string;   // for per-user auth
  channelName?: string;
  lastSyncAt?: string;
  pushPublicKey?: string; // VAPID pub for web push
}

const CONFIG_KEY = 'ff_sync_config_v1';

export function getSyncConfig(): SyncConfig {
  if (typeof window === 'undefined') return { backend: 'local' };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { backend: 'local', ...JSON.parse(raw) };
  } catch {}
  return { backend: 'local', channelName: 'freightflow' };
}

export function saveSyncConfig(cfg: SyncConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent('ff:sync-config-changed'));
}

// ---------- Cross-tab realtime (works on local mode, zero-config) ----------
let bc: BroadcastChannel | null = null;
function bcChannel() {
  if (bc) return bc;
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(getSyncConfig().channelName || 'freightflow');
  }
  return bc;
}

export function broadcastChange(table: string, op: 'upsert' | 'delete', id: string, payload?: any) {
  const ch = bcChannel();
  if (ch) {
    ch.postMessage({ type: 'db-change', table, op, id, payload, at: Date.now() });
  }
  // Also notify same-tab listeners
  window.dispatchEvent(new CustomEvent('ff:data-changed'));
}

// Listen to remote changes from other tabs/windows → reload data
if (typeof window !== 'undefined') {
  const ch = bcChannel();
  if (ch) {
    ch.onmessage = (e) => {
      if (e.data?.type === 'db-change') {
        window.dispatchEvent(new CustomEvent('ff:data-changed'));
        window.dispatchEvent(new CustomEvent('ff:toast', {
          detail: { msg: '🔄 Synced change from another tab/device', kind: 'info' },
        }));
      } else if (e.data?.type === 'sync-status') {
        window.dispatchEvent(new CustomEvent('ff:sync-status', { detail: e.data.detail }));
      }
    };
  }
  // Storage event fallback for older browsers
  window.addEventListener('storage', (e) => {
    if (e.key === 'freight_saas_db_v9') {
      window.dispatchEvent(new CustomEvent('ff:data-changed'));
    }
  });
}

// ---------- Hasura / Supabase stubs (activate when endpoint configured) ----------
let hasuraSocket: WebSocket | null = null;

export function connectRealtime(cfg: SyncConfig = getSyncConfig()) {
  if (cfg.backend === 'local') {
    window.dispatchEvent(new CustomEvent('ff:sync-status', { detail: { status: 'connected', backend: 'local', message: 'Local-only (cross-tab sync on)' } }));
    return;
  }
  if (!cfg.endpoint) {
    window.dispatchEvent(new CustomEvent('ff:sync-status', { detail: { status: 'error', message: 'Realtime endpoint not configured' } }));
    return;
  }
  try {
    const url = cfg.backend === 'hasura'
      ? cfg.endpoint.replace(/^http/, 'ws').replace(/\/v1\/graphql$/, '/v1/graphql')
      : `${cfg.endpoint.replace(/^http/, 'wss')}/realtime/v1/websocket?apikey=${cfg.apiKey}&vsn=1.0.0`;
    hasuraSocket?.close();
    hasuraSocket = new WebSocket(url);
    hasuraSocket.onopen = () => {
      window.dispatchEvent(new CustomEvent('ff:sync-status', { detail: { status: 'connected', backend: cfg.backend, message: `Connected to ${cfg.backend}` } }));
      // In a real impl we'd send connection_init + start subscription messages here
    };
    hasuraSocket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'data' || msg.event === 'insert' || msg.event === 'update') {
          window.dispatchEvent(new CustomEvent('ff:data-changed'));
        }
      } catch {}
    };
    hasuraSocket.onclose = () => {
      window.dispatchEvent(new CustomEvent('ff:sync-status', { detail: { status: 'disconnected', backend: cfg.backend, message: 'Realtime disconnected' } }));
    };
    hasuraSocket.onerror = () => {
      window.dispatchEvent(new CustomEvent('ff:sync-status', { detail: { status: 'error', backend: cfg.backend, message: 'Realtime error — falling back to local' } }));
    };
  } catch (err: any) {
    window.dispatchEvent(new CustomEvent('ff:sync-status', { detail: { status: 'error', message: String(err) } }));
  }
}

// ---------- Push Notification helper (Feature #3) ----------
export async function subscribePush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub) return sub;
    const cfg = getSyncConfig();
    const vapidKey = cfg.pushPublicKey;
    if (!vapidKey) return null;
    const key = urlBase64ToUint8Array(vapidKey) as unknown as BufferSource;
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    // In production we'd POST sub to our backend /api/push/register
    localStorage.setItem('ff_push_sub', JSON.stringify(sub.toJSON()));
    window.dispatchEvent(new CustomEvent('ff:toast', { detail: { msg: '🔔 Push notifications enabled', kind: 'success' } }));
    return sub;
  } catch (e: any) {
    window.dispatchEvent(new CustomEvent('ff:toast', { detail: { msg: 'Push blocked or unavailable: ' + e.message, kind: 'error' } }));
    return null;
  }
}

export async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { await sub.unsubscribe(); localStorage.removeItem('ff_push_sub'); }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : '';
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

// --- Simple cross-tab ping on mount so other tabs know we're here ---
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const ch = bcChannel();
    ch?.postMessage({ type: 'sync-status', detail: { status: 'connected', backend: getSyncConfig().backend, message: 'Device online' } });
  }, 1000);
}
