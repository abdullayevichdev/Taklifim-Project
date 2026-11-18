import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * FIREBASE KONFIGURATSIYASI — TAKLIFIM.UZ (teklifim-9dae7)
 * -------------------------------------------------------
 * Realtime Database va Firestore to'liq sozlangan
 */
export const firebaseConfig = {
  apiKey: "AIzaSyAwLudjK-S9jcApB-GXfOdHEj_EuRhaEK8",
  authDomain: "teklifim-9dae7.firebaseapp.com",
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
let db: Firestore | null = null;
let rtdb: Database | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;
let storage: FirebaseStorage | null = null;

// Teklifim loyihasida Firebase Realtime Database (RTDB) asosiy real-time bulutli baza hisoblanadi.
// Cloud Firestore esa projectda (teklifim-9dae7) yoqilmaganligi sababli 10 soniyalik backend timeout xatosini keltirib chiqarmasligi uchun nofaol qilingan.
const ENABLE_FIRESTORE = false;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    rtdb = getDatabase(app);
    auth = getAuth(app);
    storage = getStorage(app);

    if (ENABLE_FIRESTORE) {
      try {
        db = getFirestore(app);
      } catch (fErr) {
        console.warn('Firestore initialization skipped:', fErr);
      }
    }

    // Analytics faqat browser muhitida ishlaydi
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch {}
    }
    console.log('🔥 Firebase muvaffaqiyatli ulandi! RTDB & Auth faol (teklifim-9dae7)');
  } catch (err) {
    console.warn('Firebase ishga tushirishda xatolik:', err);
  }
} else {
  console.info(
    'ℹ️ Firebase sozlanmagan. Real-Time Local Store faol.'
  );
}

export { app, db, rtdb, auth, analytics, storage };
