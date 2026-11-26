import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, isFirebaseConfigured, rtdb } from '../services/firebase';
import {
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  OAuthProvider,
  AuthProvider as FirebaseAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCustomToken,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { ref as rtdbRef, update as rtdbUpdate, get as rtdbGet } from 'firebase/database';
import { getStoredLanguage, translations } from '../locales';
import type { Language } from '../types';

const getAuthT = () => translations[getStoredLanguage()]?.auth || translations.uz.auth;

const ACTIVE_USER_STORAGE_KEY = 'taklifim_active_user';
const CACHE_OWNER_STORAGE_KEY = 'taklifim_cache_owner_uid';
const BUILDER_DRAFT_STORAGE_KEY = 'taklifim_builder_draft';
const USER_SCOPED_CACHE_KEYS = [
  'taklifim_demo_invitations',
  'taklifim_demo_guests',
  'taklifim_demo_orders',
];

/**
 * Removes the builder draft when it belongs to an account other than `nextUid`
 * (with `nextUid === null`, any owned draft is removed). Guest drafts without an owner
 * are kept so signing in can claim them.
 */
function dropForeignBuilderDraft(nextUid: string | null): void {
  try {
    const raw = localStorage.getItem(BUILDER_DRAFT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { ownerId?: string; ownerUid?: string; orderId?: string } | null;
    const owner = parsed?.ownerUid || parsed?.ownerId || '';
    const ownedByOther = Boolean(owner) && owner !== 'anonymous' && owner !== nextUid;
    // A guest draft that already has an order attached can only belong to someone who was logged in.
    const orphanOrder = !owner && Boolean(parsed?.orderId);
    if (ownedByOther || orphanOrder) {
      localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    }
  } catch {
    try {
      localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    } catch {}
  }
}

/**
 * Keeps browser caches strictly per-account: when a different user signs in on the same
 * browser (or the user signs out), invitations / orders / drafts of the previous account
 * must never be shown or re-submitted under the new account.
 */
function scopeLocalCachesToUser(nextUid: string | null): void {
  try {
    const previousUid = localStorage.getItem(CACHE_OWNER_STORAGE_KEY);
    if (previousUid !== nextUid) {
      USER_SCOPED_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
    }
    dropForeignBuilderDraft(nextUid);
    if (nextUid) {
      localStorage.setItem(CACHE_OWNER_STORAGE_KEY, nextUid);
    } else {
      localStorage.removeItem(CACHE_OWNER_STORAGE_KEY);
    }
  } catch {}
}

export type AuthProviderId = 'google' | 'apple' | 'phone';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  lang?: Language;
  photoURL?: string;
  authProvider?: AuthProviderId;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthActionResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  authReady: boolean;
  hasFirebaseSession: boolean;
  user: UserProfile | null;
  loginWithGoogle: () => Promise<AuthActionResult>;
  loginWithApple: () => Promise<AuthActionResult>;
  /** Signs in with a server-issued custom token (Apple users: phone + PIN). */
  loginWithPhoneToken: (token: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: { name?: string; phone?: string; lang?: Language }) => Promise<void>;
  canUseFreePlan: () => boolean;
  markFreePlanUsed: () => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

function translateAuthError(errCode: string): string {
  const errT = getAuthT().errors;
  switch (errCode) {
    case 'auth/user-disabled':
      return errT.userDisabled;
    case 'auth/too-many-requests':
      return errT.tooManyRequests;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return errT.popupClosed;
    case 'auth/popup-blocked':
      return errT.popupBlocked;
    case 'auth/network-request-failed':
      return errT.networkFailed;
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/invalid-oauth-provider':
    case 'auth/invalid-oauth-client-id':
      return errT.providerNotEnabled;
    case 'auth/unauthorized-domain':
      return errT.unauthorizedDomain;
    case 'auth/account-exists-with-different-credential':
      return errT.accountExistsDifferentCredential;
    case 'auth/web-storage-unsupported':
      return errT.storageBlocked;
    default:
      return errT.generic;
  }
}

/** Resolves with `fallback` if the promise does not settle in time (RTDB waits forever when unreachable). */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

/**
 * True when this network cannot reach Firebase (DNS/ISP/antivirus filtering of *.firebaseio.com or
 * the auth endpoints). Used to show a clear message instead of a spinner that never ends.
 */
async function isFirebaseNetworkBlocked(): Promise<boolean> {
  const probe = (url: string) =>
    withTimeout(
      fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(() => true),
      6000,
      false
    );
  const [rtdbOk, authOk] = await Promise.all([
    probe('https://teklifim-9dae7-default-rtdb.firebaseio.com/.json?shallow=true'),
    probe('https://identitytoolkit.googleapis.com/v1/projects'),
  ]);
  return !rtdbOk || !authOk;
}

/** Errors where a full-page redirect sign-in usually still works. */
function shouldFallbackToRedirect(code: string): boolean {
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/web-storage-unsupported' ||
    code === 'auth/internal-error'
  );
}

function isSilentAuthError(errCode: string): boolean {
  return (
    errCode === 'auth/popup-closed-by-user' ||
    errCode === 'auth/cancelled-popup-request' ||
    errCode === 'auth/user-cancelled'
  );
}

function inferProvider(fbUser: FirebaseUser): AuthProviderId | undefined {
  const providerIds = (fbUser.providerData || []).map((p) => p?.providerId).filter(Boolean);
  if (providerIds.includes('google.com')) return 'google';
  if (providerIds.includes('apple.com')) return 'apple';
  return undefined;
}

function readStoredUser(): UserProfile | null {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<UserProfile>;
    if (!parsed || typeof parsed.id !== 'string' || !parsed.id) {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      return null;
    }
    return {
      id: parsed.id,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      lang: parsed.lang,
      photoURL: parsed.photoURL,
      authProvider:
        parsed.authProvider === 'google' || parsed.authProvider === 'apple' || parsed.authProvider === 'phone'
          ? parsed.authProvider
          : undefined,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      lastLoginAt: parsed.lastLoginAt,
    };
  } catch {
    try {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    } catch {}
    return null;
  }
}

function writeStoredUser(profile: UserProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    }
  } catch {}
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  authReady: false,
  hasFirebaseSession: false,
  user: null,
  loginWithGoogle: async () => ({ success: false }),
  loginWithApple: async () => ({ success: false }),
  loginWithPhoneToken: async () => ({ success: false }),
  logout: async () => {},
  updateUserProfile: async () => {},
  canUseFreePlan: () => false,
  markFreePlanUsed: () => {},
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => readStoredUser());
  const [authReady, setAuthReady] = useState<boolean>(() => !isFirebaseConfigured() || !auth);
  const [hasFirebaseSession, setHasFirebaseSession] = useState<boolean>(() => Boolean(auth?.currentUser));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isLoggedIn = Boolean(user);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'info') => {
      const id = `toast_${Date.now()}_${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  // Merge Firebase Auth user with the RTDB users/{uid} profile (keeps user-edited name/phone).
  const syncFirebaseUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<UserProfile> => {
    let profileData: Partial<UserProfile> = {};

    if (rtdb) {
      try {
        // Never block sign-in on the database: if it is slow or unreachable, continue with the
        // Firebase Auth profile and sync later.
        const snap = await withTimeout(rtdbGet(rtdbRef(rtdb, `users/${fbUser.uid}`)), 4000, null);
        if (snap && snap.exists()) {
          profileData = snap.val() as Partial<UserProfile>;
        }
      } catch (err) {
        console.warn('RTDB user profile read note:', err);
      }
    }

    const provider = inferProvider(fbUser) || profileData.authProvider;
    const defaultName =
      provider === 'apple' ? getAuthT().appleUserDefault : getAuthT().alreadyLoggedUser;

    const resolvedLang: Language | undefined =
      profileData.lang === 'uz' || profileData.lang === 'ru' || profileData.lang === 'en'
        ? profileData.lang
        : undefined;

    const resolvedUser: UserProfile = {
      id: fbUser.uid,
      name:
        (typeof profileData.name === 'string' && profileData.name.trim()) ||
        fbUser.displayName ||
        fbUser.email?.split('@')[0] ||
        defaultName,
      email: fbUser.email || (typeof profileData.email === 'string' ? profileData.email : ''),
      phone:
        (typeof profileData.phone === 'string' && profileData.phone) || fbUser.phoneNumber || '',
      lang: resolvedLang,
      photoURL: fbUser.photoURL || profileData.photoURL,
      authProvider: provider,
      createdAt:
        typeof profileData.createdAt === 'string'
          ? profileData.createdAt
          : fbUser.metadata?.creationTime || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    setUser(resolvedUser);
    writeStoredUser(resolvedUser);

    if (rtdb && auth?.currentUser?.uid === fbUser.uid) {
      try {
        // Fire-and-forget (bounded): the profile write must not delay the UI.
        void withTimeout(rtdbUpdate(
          rtdbRef(rtdb, `users/${fbUser.uid}`),
          stripUndefined({
            id: resolvedUser.id,
            name: resolvedUser.name,
            email: resolvedUser.email,
            phone: resolvedUser.phone,
            photoURL: resolvedUser.photoURL,
            authProvider: resolvedUser.authProvider,
            createdAt: resolvedUser.createdAt,
            lastLoginAt: resolvedUser.lastLoginAt,
          })
        ), 8000, undefined);
      } catch (err) {
        console.warn('RTDB user profile write note:', err);
      }
    }

    return resolvedUser;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const authInstance = auth;

    if (!isFirebaseConfigured() || !authInstance) {
      setAuthReady(true);
      return () => {
        isMounted = false;
      };
    }

    setPersistence(authInstance, browserLocalPersistence).catch(() => {});

    // Completes a redirect-based sign-in (used when the browser blocks popups).
    getRedirectResult(authInstance).catch((err: any) => {
      const code = err?.code || '';
      if (code && !isSilentAuthError(code)) {
        showToast(translateAuthError(code), 'error');
      }
    });

    const unsub = onAuthStateChanged(authInstance, async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        scopeLocalCachesToUser(fbUser.uid);
        setHasFirebaseSession(true);
        try {
          await syncFirebaseUserProfile(fbUser);
        } finally {
          if (isMounted) setAuthReady(true);
        }
      } else {
        scopeLocalCachesToUser(null);
        setHasFirebaseSession(false);
        setUser(null);
        writeStoredUser(null);
        setAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [syncFirebaseUserProfile, showToast]);

  const signInWithProvider = useCallback(
    async (provider: FirebaseAuthProvider, providerId: AuthProviderId): Promise<AuthActionResult> => {
      if (!isFirebaseConfigured() || !auth) {
        const msg = getAuthT().errors.providerNotEnabled;
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      try {
        await setPersistence(auth, browserLocalPersistence).catch(() => {});
        const res = await signInWithPopup(auth, provider);
        if (!res.user?.uid) {
          const msg = getAuthT().errors.generic;
          showToast(msg, 'error');
          return { success: false, message: msg };
        }

        scopeLocalCachesToUser(res.user.uid);
        setHasFirebaseSession(true);
        const resolvedUser = await syncFirebaseUserProfile(res.user);
        showToast(
          providerId === 'google'
            ? `${getAuthT().toastGoogleWelcomePrefix} ${resolvedUser.name}!`
            : getAuthT().toastAppleSuccess,
          'success'
        );
        return { success: true };
      } catch (err: any) {
        const code = err?.code || '';
        console.warn(`Firebase ${providerId} auth error:`, code || err?.message);

        // Popup blocked (e.g. in-app browsers) → fall back to full-page redirect sign-in.
        if (shouldFallbackToRedirect(code)) {
          // A redirect to an unreachable Google/Firebase page would strand the user on a browser
          // error page — check the network first.
          if (await isFirebaseNetworkBlocked()) {
            return { success: false, message: getAuthT().errors.firebaseBlocked };
          }
          try {
            showToast(getAuthT().errors.redirecting, 'info');
            await signInWithRedirect(auth, provider);
            return { success: false };
          } catch (redirectErr: any) {
            const msg = translateAuthError(redirectErr?.code || code);
            showToast(msg, 'error');
            return { success: false, message: msg };
          }
        }

        // Network problems: tell the user whether their network blocks Google/Firebase.
        if (code === 'auth/network-request-failed' || code === 'auth/timeout') {
          const blocked = await isFirebaseNetworkBlocked();
          return { success: false, message: blocked ? getAuthT().errors.firebaseBlocked : translateAuthError(code) };
        }

        // The user closed the popup — often because the Google window showed an error.
        if (code === 'auth/popup-closed-by-user') {
          const blocked = await isFirebaseNetworkBlocked();
          if (!blocked) showToast(getAuthT().errors.popupClosedHint, 'info');
          return { success: false, message: blocked ? getAuthT().errors.firebaseBlocked : undefined };
        }

        const msg = translateAuthError(code);
        if (!isSilentAuthError(code)) {
          showToast(msg, 'error');
        }
        return { success: false, message: msg };
      }
    },
    [showToast, syncFirebaseUserProfile]
  );

  const loginWithGoogle = useCallback(() => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithProvider(provider, 'google');
  }, [signInWithProvider]);

  const loginWithApple = useCallback(() => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return signInWithProvider(provider, 'apple');
  }, [signInWithProvider]);

  const loginWithPhoneToken = useCallback(
    async (token: string): Promise<AuthActionResult> => {
      if (!isFirebaseConfigured() || !auth) {
        return { success: false, message: getAuthT().errors.providerNotEnabled };
      }
      try {
        await setPersistence(auth, browserLocalPersistence).catch(() => {});
        const res = await signInWithCustomToken(auth, token);
        scopeLocalCachesToUser(res.user.uid);
        setHasFirebaseSession(true);
        await syncFirebaseUserProfile(res.user);
        return { success: true };
      } catch (err: any) {
        const msg = translateAuthError(err?.code || '');
        return { success: false, message: msg };
      }
    },
    [syncFirebaseUserProfile]
  );

  const logout = useCallback(async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        await signOut(auth);
      } catch {}
    }
    scopeLocalCachesToUser(null);
    try {
      localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    } catch {}
    setHasFirebaseSession(false);
    setUser(null);
    writeStoredUser(null);
    showToast(getAuthT().toastLoggedOut, 'info');
  }, [showToast]);

  const updateUserProfile = useCallback(
    async (updates: { name?: string; phone?: string; lang?: Language }) => {
      if (!user) return;

      const allowedPatch: { name?: string; phone?: string; lang?: Language } = {};
      if (typeof updates.name === 'string') {
        const cleanName = updates.name.trim().slice(0, 120);
        if (cleanName) allowedPatch.name = cleanName;
      }
      if (typeof updates.phone === 'string') {
        allowedPatch.phone = updates.phone.trim().slice(0, 32);
      }
      if (updates.lang === 'uz' || updates.lang === 'ru' || updates.lang === 'en') {
        allowedPatch.lang = updates.lang;
      }

      if (Object.keys(allowedPatch).length === 0) return;

      const updated: UserProfile = { ...user, ...allowedPatch };
      setUser(updated);
      writeStoredUser(updated);

      if (isFirebaseConfigured() && rtdb && auth?.currentUser?.uid === user.id) {
        await rtdbUpdate(rtdbRef(rtdb, `users/${user.id}`), allowedPatch);
      }
    },
    [user]
  );

  const canUseFreePlan = useCallback(() => false, []);
  const markFreePlanUsed = useCallback(() => {}, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        authReady,
        hasFirebaseSession,
        user,
        loginWithGoogle,
        loginWithApple,
        loginWithPhoneToken,
        logout,
        updateUserProfile,
        canUseFreePlan,
        markFreePlanUsed,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
