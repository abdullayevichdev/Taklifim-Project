import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, isFirebaseConfigured, rtdb } from '../services/firebase';
import {
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { ref as rtdbRef, update as rtdbUpdate, get as rtdbGet } from 'firebase/database';
import { getStoredLanguage, translations } from '../locales';
import type { Language } from '../types';

const getAuthT = () => translations[getStoredLanguage()]?.auth || translations.uz.auth;

const ACTIVE_USER_STORAGE_KEY = 'taklifim_active_user';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  phoneVerified?: boolean;
  telegramUserId?: string;
  telegramChatId?: string;
  username?: string;
  lang?: Language;
  photoURL?: string;
  authProvider: 'telegram';
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
  completeTelegramLogin: (customToken: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: { name?: string; lang?: Language }) => Promise<void>;
  canUseFreePlan: () => boolean;
  markFreePlanUsed: () => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

function isValidTelegramProfile(parsed: Partial<UserProfile> | null | undefined): boolean {
  if (!parsed || typeof parsed.id !== 'string') return false;
  return parsed.id.startsWith('tg_') && (!parsed.authProvider || parsed.authProvider === 'telegram');
}

function purgeLegacyAuthStorage(): void {
  try {
    sessionStorage.removeItem('taklifim_admin_unlocked');
    sessionStorage.removeItem('taklifim_auth_redirect_provider');
    const otpKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('taklifim_otp_')) {
        otpKeys.push(k);
      }
    }
    otpKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore storage errors
  }

  try {
    const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<UserProfile>;
      if (!isValidTelegramProfile(parsed)) {
        localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    } catch {}
  }
}

function translateFirebaseError(errCode: string): string {
  const errT = getAuthT().errors;
  if (errCode === 'auth/network-request-failed') {
    return errT.networkFailed;
  }
  return errT.generic;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  authReady: false,
  hasFirebaseSession: false,
  user: null,
  completeTelegramLogin: async () => ({ success: false }),
  logout: async () => {},
  updateUserProfile: async () => {},
  canUseFreePlan: () => false,
  markFreePlanUsed: () => {},
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    purgeLegacyAuthStorage();
    try {
      const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;
        if (isValidTelegramProfile(parsed)) {
          return { ...parsed, authProvider: 'telegram' };
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

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

  // Read-only profile sync from Firebase RTDB users/{uid}; server creates/updates restricted fields.
  const syncFirebaseUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<UserProfile> => {
    let profileData: Partial<UserProfile> = {};

    if (rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, `users/${fbUser.uid}`));
        if (snap.exists()) {
          profileData = snap.val() as Partial<UserProfile>;
        }
      } catch (err) {
        console.warn('RTDB user profile read note:', err);
      }
    }

    const resolvedLang: Language | undefined =
      profileData.lang === 'uz' || profileData.lang === 'ru' || profileData.lang === 'en'
        ? profileData.lang
        : undefined;

    const resolvedUser: UserProfile = {
      id: fbUser.uid,
      name:
        (typeof profileData.name === 'string' && profileData.name.trim()) ||
        fbUser.displayName ||
        getAuthT().alreadyLoggedUser,
      phone: typeof profileData.phone === 'string' ? profileData.phone : fbUser.phoneNumber || '',
      phoneVerified: Boolean(profileData.phoneVerified ?? profileData.phone),
      telegramUserId:
        typeof profileData.telegramUserId === 'string'
          ? profileData.telegramUserId
          : fbUser.uid.startsWith('tg_')
          ? fbUser.uid.slice(3)
          : undefined,
      telegramChatId:
        typeof profileData.telegramChatId === 'string' ? profileData.telegramChatId : undefined,
      username: typeof profileData.username === 'string' && profileData.username ? profileData.username : undefined,
      lang: resolvedLang,
      photoURL: fbUser.photoURL || profileData.photoURL,
      authProvider: 'telegram',
      createdAt:
        typeof profileData.createdAt === 'string'
          ? profileData.createdAt
          : fbUser.metadata?.creationTime || new Date().toISOString(),
      lastLoginAt:
        typeof profileData.lastLoginAt === 'string' ? profileData.lastLoginAt : undefined,
    };

    setUser(resolvedUser);
    try {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(resolvedUser));
    } catch {}

    return resolvedUser;
  }, []);

  useEffect(() => {
    let isMounted = true;
    purgeLegacyAuthStorage();

    const authInstance = auth;
    if (isFirebaseConfigured() && authInstance) {
      setPersistence(authInstance, browserLocalPersistence).catch(() => {});

      const unsub = onAuthStateChanged(authInstance, async (fbUser) => {
        if (!isMounted) return;
        if (fbUser && fbUser.uid.startsWith('tg_')) {
          setHasFirebaseSession(true);
          try {
            await syncFirebaseUserProfile(fbUser);
          } finally {
            if (isMounted) setAuthReady(true);
          }
        } else {
          if (fbUser && !fbUser.uid.startsWith('tg_')) {
            // Legacy non-Telegram Firebase session (Google/Apple/Email) is no longer supported
            signOut(authInstance).catch(() => {});
          }
          setHasFirebaseSession(false);
          setUser(null);
          try {
            localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
          } catch {}
          setAuthReady(true);
        }
      });

      return () => {
        isMounted = false;
        unsub();
      };
    } else {
      setAuthReady(true);
      return () => {
        isMounted = false;
      };
    }
  }, [syncFirebaseUserProfile]);

  const completeTelegramLogin = useCallback(
    async (customToken: string): Promise<AuthActionResult> => {
      if (!isFirebaseConfigured() || !auth) {
        const msg = getAuthT().errors.generic;
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      try {
        await setPersistence(auth, browserLocalPersistence).catch(() => {});
        const cred = await signInWithCustomToken(auth, customToken);
        if (!cred.user?.uid) {
          const msg = getAuthT().errors.generic;
          showToast(msg, 'error');
          return { success: false, message: msg };
        }

        setHasFirebaseSession(true);
        await syncFirebaseUserProfile(cred.user);
        showToast(getAuthT().toastTelegramSuccess, 'success');
        return { success: true };
      } catch (err: any) {
        const msg = translateFirebaseError(err?.code || '');
        showToast(msg, 'error');
        return { success: false, message: msg };
      }
    },
    [showToast, syncFirebaseUserProfile]
  );

  const logout = useCallback(async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        await signOut(auth);
      } catch {}
    }
    setHasFirebaseSession(false);
    setUser(null);
    try {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    } catch {}
    showToast(getAuthT().toastLoggedOut, 'info');
  }, [showToast]);

  // Client is allowed to update ONLY { name, lang } in users/{uid}
  const updateUserProfile = useCallback(
    async (updates: { name?: string; lang?: Language }) => {
      if (!user) return;

      const allowedPatch: { name?: string; lang?: Language } = {};
      if (typeof updates.name === 'string') {
        const cleanName = updates.name.trim().slice(0, 120);
        if (cleanName) {
          allowedPatch.name = cleanName;
        }
      }
      if (updates.lang === 'uz' || updates.lang === 'ru' || updates.lang === 'en') {
        allowedPatch.lang = updates.lang;
      }

      if (Object.keys(allowedPatch).length === 0) return;

      const updated: UserProfile = {
        ...user,
        ...allowedPatch,
      };

      setUser(updated);
      try {
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updated));
      } catch {}

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
        completeTelegramLogin,
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
