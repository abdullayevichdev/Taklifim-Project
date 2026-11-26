import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';

/**
 * FIREBASE KONFIGURATSIYASI — TAKLIFIM.UZ (teklifim-9dae7)
 * -------------------------------------------------------
 * Realtime Database va Firestore to'liq sozlangan
 */
function resolveAuthDomain(): string {
  const fallback = 'teklifim-9dae7.firebaseapp.com';
  const configured = String((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  if (!configured || typeof window === 'undefined') return fallback;
  // Only use the custom domain when the visitor is actually on that site (apex or www).
  const host = window.location.hostname;
  return host === configured || host.endsWith(`.${configured}`) ? configured : fallback;
}

export const firebaseConfig = {
  apiKey: "AIzaSyAwLudjK-S9jcApB-GXfOdHEj_EuRhaEK8",
  // Google sign-in opens its window on authDomain. Serving it from the site's own domain
  // (Vercel proxies /__/auth/* to firebaseapp.com) avoids browsers that block third-party
  // storage ("The requested action is invalid"). Set VITE_FIREBASE_AUTH_DOMAIN=tashrifim.uz on
  // Vercel once https://tashrifim.uz/__/auth/handler is an authorized redirect URI in Google Cloud.
  authDomain: resolveAuthDomain(),
  databaseURL: "https://teklifim-9dae7-default-rtdb.firebaseio.com",
  projectId: "teklifim-9dae7",
  storageBucket: "teklifim-9dae7.firebasestorage.app",
  messagingSenderId: "233634192535",
  appId: "1:233634192535:web:a7536a57488f137dbf1dd2",
  measurementId: "G-BP39X9V59Z"
};

/**
 * Firebase haqiqiy kalitlar bilan sozlanganligini tekshirish
 */
export const isFirebaseConfigured = (): boolean => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
    Boolean(firebaseConfig.projectId) &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
};

let app: FirebaseApp | null = null;
// Cloud Firestore is not enabled for this project; RTDB is the single source of truth.
const db: null = null;
let rtdb: Database | null = null;
let auth: Auth | null = null;
let analytics: unknown = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    rtdb = getDatabase(app);
    auth = getAuth(app);

    // Analytics is non-critical: load it after the page is interactive so it never delays first paint.
    if (typeof window !== 'undefined') {
      const loadAnalytics = () => {
        import('firebase/analytics')
          .then(({ getAnalytics }) => {
            if (app) analytics = getAnalytics(app);
          })
          .catch(() => {});
      };
      const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(loadAnalytics, { timeout: 8000 });
      else window.setTimeout(loadAnalytics, 4000);
    }
  } catch (err) {
    console.warn('Firebase ishga tushirishda xatolik:', err);
  }
}

/** Firebase Storage is only needed for PDF receipts, so its SDK is loaded on demand. */
export async function getStorageLazy(): Promise<FirebaseStorage | null> {
  if (!app) return null;
  if (storage) return storage;
  const { getStorage } = await import('firebase/storage');
  storage = getStorage(app);
  return storage;
}

export { app, db, rtdb, auth, analytics, storage };
