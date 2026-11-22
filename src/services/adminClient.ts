import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signOut,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import { getDatabase, ref, onValue, get, query, orderByKey, limitToLast, Database } from 'firebase/database';
import { firebaseConfig } from './firebase';

/**
 * Admin-panel Firebase session. Uses a SEPARATE Firebase app instance so the admin session
 * never replaces (or leaks into) the normal customer login in the same browser.
 * The session lives only in this browser tab (sessionStorage) and expires after 12 hours.
 */
const ADMIN_APP_NAME = 'tashrifim-admin-panel';
const EXPIRY_KEY = 'tashrifim_admin_until';

let adminApp: FirebaseApp | null = null;
let adminAuth: Auth | null = null;
let adminDb: Database | null = null;

function init() {
  if (adminApp) return;
  adminApp = getApps().some((a) => a.name === ADMIN_APP_NAME)
    ? getApp(ADMIN_APP_NAME)
    : initializeApp(firebaseConfig, ADMIN_APP_NAME);
  adminAuth = getAuth(adminApp);
  adminDb = getDatabase(adminApp);
  setPersistence(adminAuth, browserSessionPersistence).catch(() => {});
}

function sessionExpiry(): number {
  try {
    return Number(sessionStorage.getItem(EXPIRY_KEY) || 0);
  } catch {
    return 0;
  }
}

export function isAdminSessionValid(user: User | null): boolean {
  return Boolean(user) && sessionExpiry() > Date.now();
}

export function watchAdminSession(cb: (signedIn: boolean) => void): () => void {
  init();
  return onAuthStateChanged(adminAuth!, (user) => {
    if (user && sessionExpiry() <= Date.now()) {
      signOut(adminAuth!).catch(() => {});
      cb(false);
      return;
    }
    cb(Boolean(user));
  });
}

export async function adminLogin(code: string): Promise<{ ok: boolean; error?: string }> {
  init();
  let data: any = null;
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data.token) {
      return { ok: false, error: data?.error || 'Kirib bo‘lmadi.' };
    }
  } catch {
    return { ok: false, error: 'Server bilan bog‘lanib bo‘lmadi.' };
  }
  try {
    sessionStorage.setItem(EXPIRY_KEY, String(data.expiresAt));
  } catch {
    /* ignore */
  }
  await signInWithCustomToken(adminAuth!, data.token);
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  init();
  try {
    sessionStorage.removeItem(EXPIRY_KEY);
  } catch {
    /* ignore */
  }
  await signOut(adminAuth!).catch(() => {});
}

async function authHeader(): Promise<Record<string, string>> {
  init();
  const token = await adminAuth!.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminAction(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return res.ok && data?.ok ? { ok: true } : { ok: false, error: data?.error || 'Xatolik yuz berdi.' };
  } catch {
    return { ok: false, error: 'Server bilan bog‘lanib bo‘lmadi.' };
  }
}

async function fetchScope(scope: string, id?: string): Promise<any> {
  const qs = new URLSearchParams({ scope, ...(id ? { id } : {}) });
  const res = await fetch(`/api/admin/data?${qs}`, { headers: await authHeader() });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.error || 'DATA_FAILED');
  return data.data;
}

/**
 * Live subscription to a top-level database node. Uses realtime listeners; if the database
 * rules do not allow it yet (rules not deployed), it falls back to polling the server every 5 s.
 */
export function subscribeAdmin<T = any>(
  path: 'orders' | 'invitations' | 'users' | 'messages' | 'adminAudit' | 'settings' | 'templateOverrides',
  onData: (value: Record<string, T>) => void,
  onModeChange?: (mode: 'realtime' | 'polling') => void
): () => void {
  init();
  let stopped = false;
  let timer: number | null = null;

  const startPolling = () => {
    onModeChange?.('polling');
    const tick = async () => {
      if (stopped) return;
      try {
        onData((await fetchScope(path)) || {});
      } catch {
        /* keep last data */
      }
      if (!stopped) timer = window.setTimeout(tick, 5000);
    };
    tick();
  };

  const source =
    path === 'adminAudit' ? query(ref(adminDb!, path), orderByKey(), limitToLast(300)) : ref(adminDb!, path);
  const unsub = onValue(
    source,
    (snap) => {
      onModeChange?.('realtime');
      onData((snap.val() as Record<string, T>) || {});
    },
    () => startPolling()
  );

  return () => {
    stopped = true;
    unsub();
    if (timer !== null) window.clearTimeout(timer);
  };
}

export async function getReceiptImage(orderId: string): Promise<string | null> {
  init();
  try {
    const snap = await get(ref(adminDb!, `receiptImages/${orderId}`));
    return snap.exists() ? snap.val()?.dataUrl || null : null;
  } catch {
    try {
      const data = await fetchScope('receiptImages', orderId);
      return data?.dataUrl || null;
    } catch {
      return null;
    }
  }
}

/** Uploads a song to Firebase Storage (music/{id}.{ext}) with the admin session; reports progress 0–100. */
export async function uploadMusicFile(
  file: File,
  id: string,
  onProgress?: (pct: number) => void
): Promise<{ url: string; storagePath: string }> {
  init();
  const { getStorage, ref: sRef, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'mp3';
  const storagePath = `music/${id}.${ext}`;
  const contentType = file.type && file.type.startsWith('audio/') ? file.type : ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg';
  const task = uploadBytesResumable(sRef(getStorage(adminApp!), storagePath), file, {
    contentType,
    cacheControl: 'public, max-age=31536000',
  });
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / Math.max(1, snap.totalBytes)) * 100)),
      reject,
      () => resolve()
    );
  });
  return { url: await getDownloadURL(task.snapshot.ref), storagePath };
}

export async function deleteMusicFile(storagePath: string): Promise<void> {
  init();
  const { getStorage, ref: sRef, deleteObject } = await import('firebase/storage');
  try {
    await deleteObject(sRef(getStorage(adminApp!), storagePath));
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') throw err;
  }
}
