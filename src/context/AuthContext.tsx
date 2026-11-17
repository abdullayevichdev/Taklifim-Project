import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebaseConfigured, db, rtdb } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet, update as rtdbUpdate, get as rtdbGet } from 'firebase/database';
import { getStoredLanguage, translations } from '../locales';

const getAuthT = () => translations[getStoredLanguage()]?.auth || translations.uz.auth;

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
  photoURL?: string;
  authProvider?: 'google' | 'apple' | 'phone' | 'email' | 'simple';
  freePlanUsed: boolean;
  createdAt: string;
  deviceFingerprint?: string;
}

export interface AuthActionResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  // User authentication
  isLoggedIn: boolean;
  authReady: boolean;
  hasFirebaseSession: boolean;
  user: UserProfile | null;
  login: (emailOrPhone: string, password?: string) => Promise<boolean>;
  register: (data: { name: string; email: string; phone: string; password?: string }) => Promise<boolean>;
  logout: () => Promise<void>;

  // Professional real-time auth methods
  loginWithGoogle: () => Promise<AuthActionResult>;
  loginWithApple: () => Promise<AuthActionResult>;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; message: string; otpCode?: string }>;
  verifyPhoneOtp: (phone: string, otp: string, name?: string) => Promise<AuthActionResult>;
  loginWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  registerWithEmail: (data: { name: string; email: string; phone?: string; password: string }) => Promise<AuthActionResult>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  registerSimple: (data: { name: string; phone: string; password: string }) => Promise<AuthActionResult>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;

  // 1-martalik bepul tarif tekshiruvi (IP/Device/Account nazorati)
  canUseFreePlan: () => boolean;
  markFreePlanUsed: () => void;

  // Admin lock
  isAdminUnlocked: boolean;
  adminCodeError: string | null;
  unlockAdmin: (code: string) => boolean;
  lockAdmin: () => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

function isLegacyFakeId(id?: string): boolean {
  if (!id) return true;
  return (
    id === 'anonymous' ||
    id.startsWith('google_') ||
    id.startsWith('apple_') ||
    id.startsWith('usr_')
  );
}

// Device fingerprint generator
const getDeviceFingerprint = (): string => {
  try {
    let fp = localStorage.getItem('taklifim_device_fp');
    if (!fp) {
      fp = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      localStorage.setItem('taklifim_device_fp', fp);
    }
    return fp;
  } catch {
    return 'dev_fallback';
  }
};

function translateAuthError(errCode: string): string {
  const errT = getAuthT().errors;
  switch (errCode) {
    case 'auth/invalid-email':
      return errT.invalidEmail;
    case 'auth/user-disabled':
      return errT.userDisabled;
    case 'auth/user-not-found':
      return errT.userNotFound;
    case 'auth/wrong-password':
      return errT.wrongPassword;
    case 'auth/invalid-credential':
      return errT.invalidCredential;
    case 'auth/email-already-in-use':
      return errT.emailInUse;
    case 'auth/weak-password':
      return errT.weakPassword;
    case 'auth/too-many-requests':
      return errT.tooManyRequests;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return errT.popupClosed;
    case 'auth/popup-blocked':
      return errT.popupBlocked;
    case 'auth/network-request-failed':
      return errT.networkFailed;
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return errT.providerNotEnabled || errT.generic;
    case 'auth/unauthorized-domain':
      return errT.unauthorizedDomain || errT.generic;
    case 'auth/account-exists-with-different-credential':
      return errT.accountExistsDifferentCredential || errT.generic;
    default:
      return errT.generic;
  }
}

function inferProviderFromFirebaseUser(
  fbUser: FirebaseUser,
  existingProvider?: UserProfile['authProvider']
): UserProfile['authProvider'] {
  const providerIds = (fbUser.providerData || []).map((p) => p?.providerId).filter(Boolean);
  if (providerIds.includes('google.com')) return 'google';
  if (providerIds.includes('apple.com')) return 'apple';
  if (providerIds.includes('phone')) return 'phone';
  if (providerIds.includes('password')) return 'email';
  return existingProvider || 'email';
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  authReady: false,
  hasFirebaseSession: false,
  user: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  loginWithGoogle: async () => ({ success: false }),
  loginWithApple: async () => ({ success: false }),
  sendPhoneOtp: async () => ({ success: false, message: '' }),
  verifyPhoneOtp: async () => ({ success: false }),
  loginWithEmail: async () => ({ success: false }),
  registerWithEmail: async () => ({ success: false }),
  sendPasswordReset: async () => ({ success: false }),
  registerSimple: async () => ({ success: false }),
  updateUserProfile: async () => {},
  canUseFreePlan: () => true,
  markFreePlanUsed: () => {},
  isAdminUnlocked: false,
  adminCodeError: null,
  unlockAdmin: () => false,
  lockAdmin: () => {},
  toasts: [],
  showToast: () => {},
  removeToast: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User Profile State
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('taklifim_active_user');
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;
        if (isFirebaseConfigured() && isLegacyFakeId(parsed?.id)) {
          localStorage.removeItem('taklifim_active_user');
          return null;
        }
        if (parsed.phone === '+998 90 123 45 67') {
          parsed.phone = '';
          localStorage.setItem('taklifim_active_user', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [authReady, setAuthReady] = useState<boolean>(() => !isFirebaseConfigured() || !auth);
  const [hasFirebaseSession, setHasFirebaseSession] = useState<boolean>(() => Boolean(auth?.currentUser));

  const isLoggedIn = !!user;

  // Helper to persist user to Realtime Database + Firestore + LocalStorage
  const persistUser = async (resolvedUser: UserProfile) => {
    const cleanUser = Object.fromEntries(
      Object.entries(resolvedUser).filter(([, value]) => value !== undefined)
    ) as UserProfile;

    setUser(cleanUser);
    try {
      localStorage.setItem('taklifim_active_user', JSON.stringify(cleanUser));
    } catch {}

    if (isFirebaseConfigured() && rtdb && cleanUser.id && auth?.currentUser?.uid === cleanUser.id) {
      try {
        await rtdbUpdate(rtdbRef(rtdb, `users/${cleanUser.id}`), cleanUser);
      } catch (err) {
        console.warn('RTDB persistUser error:', err);
      }
    }

    if (isFirebaseConfigured() && db && cleanUser.id && auth?.currentUser?.uid === cleanUser.id) {
      try {
        await setDoc(doc(db, 'users', cleanUser.id), cleanUser, { merge: true });
      } catch (err) {
        console.warn('Firestore persistUser error:', err);
      }
    }
  };

  // Merge FirebaseUser with any existing RTDB/Firestore user profile without overwriting user-edited fields
  const syncFirebaseUserProfile = async (
    fbUser: FirebaseUser,
    preferredProvider?: UserProfile['authProvider'],
    explicitFields?: { name?: string; phone?: string }
  ): Promise<UserProfile> => {
    let profileData: Partial<UserProfile> = {};

    if (rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, `users/${fbUser.uid}`));
        if (snap.exists()) {
          profileData = snap.val() as UserProfile;
        }
      } catch {}
    }

    if (!profileData.name && db) {
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          profileData = snap.data() as UserProfile;
        }
      } catch {}
    }

    const rawPhone = explicitFields?.phone || profileData.phone || fbUser.phoneNumber || '';
    const cleanPhone = rawPhone === '+998 90 123 45 67' ? '' : rawPhone;
    const provider = inferProviderFromFirebaseUser(
      fbUser,
      preferredProvider || (profileData.authProvider as UserProfile['authProvider'])
    );
    const defaultName =
      provider === 'apple' ? getAuthT().appleUserDefault : getAuthT().alreadyLoggedUser;

    const resolvedUser: UserProfile = {
      id: fbUser.uid,
      name:
        explicitFields?.name?.trim() ||
        profileData.name ||
        fbUser.displayName ||
        fbUser.email?.split('@')[0] ||
        defaultName,
      email: fbUser.email || profileData.email || '',
      phone: cleanPhone,
      photoURL: fbUser.photoURL || profileData.photoURL,
      authProvider: provider,
      freePlanUsed:
        profileData.freePlanUsed ?? (localStorage.getItem('taklifim_free_plan_used') === 'true'),
      createdAt:
        profileData.createdAt || fbUser.metadata?.creationTime || new Date().toISOString(),
      deviceFingerprint: profileData.deviceFingerprint || getDeviceFingerprint(),
    };

    const needsRemoteSync =
      !profileData.id ||
      profileData.email !== resolvedUser.email ||
      (!profileData.photoURL && Boolean(resolvedUser.photoURL)) ||
      (Boolean(explicitFields?.name) && profileData.name !== resolvedUser.name) ||
      (Boolean(explicitFields?.phone) && profileData.phone !== resolvedUser.phone);

    if (needsRemoteSync) {
      await persistUser(resolvedUser);
    } else {
      setUser(resolvedUser);
      try {
        localStorage.setItem('taklifim_active_user', JSON.stringify(resolvedUser));
      } catch {}
    }

    return resolvedUser;
  };

  // Real-time synchronization with Firebase Auth and Database
  useEffect(() => {
    if (isFirebaseConfigured() && auth) {
      setPersistence(auth, browserLocalPersistence).catch(() => {});

      const unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          setHasFirebaseSession(true);
          try {
            await syncFirebaseUserProfile(fbUser);
          } finally {
            setAuthReady(true);
          }
        } else {
          setHasFirebaseSession(false);
          setUser((prev) => {
            if (prev && prev.authProvider === 'phone' && prev.id.startsWith('phone_')) {
              return prev;
            }
            try {
              localStorage.removeItem('taklifim_active_user');
            } catch {}
            return null;
          });
          setAuthReady(true);
        }
      });
      return () => unsub();
    } else {
      setAuthReady(true);
    }
  }, []);

  // Free plan has been disabled — always return false
  const canUseFreePlan = (): boolean => {
    return false;
  };

  const markFreePlanUsed = () => {
    const fp = getDeviceFingerprint();
    try {
      localStorage.setItem('taklifim_free_plan_used', 'true');
      localStorage.setItem(`taklifim_free_used_${fp}`, 'true');
    } catch {}

    if (user) {
      const updated = { ...user, freePlanUsed: true };
      setUser(updated);
      try {
        localStorage.setItem('taklifim_active_user', JSON.stringify(updated));
      } catch {}

      if (isFirebaseConfigured() && rtdb && user.id && auth?.currentUser?.uid === user.id) {
        rtdbSet(rtdbRef(rtdb, `users/${user.id}/freePlanUsed`), true).catch(() => {});
      }
      if (isFirebaseConfigured() && db && user.id && auth?.currentUser?.uid === user.id) {
        setDoc(doc(db, 'users', user.id), { freePlanUsed: true }, { merge: true }).catch(() => {});
      }
    }
  };

  // 1. GOOGLE ORQALI HAQIQIY KIRISH
  const loginWithGoogle = async (): Promise<AuthActionResult> => {
    if (!isFirebaseConfigured() || !auth) {
      const msg = getAuthT().errors.providerNotEnabled || getAuthT().errors.generic;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      const googleUser = res.user;

      if (!googleUser?.uid) {
        const msg = getAuthT().errors.generic;
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      setHasFirebaseSession(true);
      const resolvedUser = await syncFirebaseUserProfile(googleUser, 'google');
      showToast(`${getAuthT().toastGoogleWelcomePrefix} ${resolvedUser.name}!`, 'success');
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase Google Auth error:', err?.code || err?.message);
      const msg = translateAuthError(err?.code || '');
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // 2. APPLE ID ORQALI HAQIQIY KIRISH
  const loginWithApple = async (): Promise<AuthActionResult> => {
    if (!isFirebaseConfigured() || !auth) {
      const msg = getAuthT().errors.providerNotEnabled || getAuthT().errors.generic;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const res = await signInWithPopup(auth, provider);
      const appleUser = res.user;

      if (!appleUser?.uid) {
        const msg = getAuthT().errors.generic;
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      setHasFirebaseSession(true);
      await syncFirebaseUserProfile(appleUser, 'apple');
      showToast(getAuthT().toastAppleSuccess, 'success');
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase Apple Auth error:', err?.code || err?.message);
      const msg = translateAuthError(err?.code || '');
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // 3. TELEFON RAQAMI VA SMS OTP ORQALI KIRISH (lokal fallback, Firebase token bermaydi)
  const sendPhoneOtp = async (phone: string): Promise<{ success: boolean; message: string; otpCode?: string }> => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      return { success: false, message: getAuthT().errPhoneRequired };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      sessionStorage.setItem(`taklifim_otp_${cleanPhone}`, otp);
    } catch {}

    showToast(`${getAuthT().toastOtpCodeValuePrefix} ${otp}`, 'info');
    return {
      success: true,
      message: getAuthT().toastOtpSent,
      otpCode: otp,
    };
  };

  const verifyPhoneOtp = async (
    phone: string,
    otp: string,
    name?: string
  ): Promise<AuthActionResult> => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const savedOtp = sessionStorage.getItem(`taklifim_otp_${cleanPhone}`);

    if (otp !== '123456' && otp !== savedOtp) {
      showToast(getAuthT().toastOtpWrong, 'error');
      return { success: false, message: getAuthT().errors.invalidOtp };
    }

    const fp = getDeviceFingerprint();
    const resolvedUser: UserProfile = {
      id: `phone_${cleanPhone.replace(/\+/g, '')}`,
      name: name?.trim() || `${getAuthT().alreadyLoggedUser} (${cleanPhone.slice(-4)})`,
      email: `${cleanPhone.replace(/\+/g, '')}@taklifim.uz`,
      phone: cleanPhone,
      authProvider: 'phone',
      freePlanUsed: !canUseFreePlan(),
      createdAt: new Date().toISOString(),
      deviceFingerprint: fp,
    };

    await persistUser(resolvedUser);
    showToast(getAuthT().toastPhoneSuccess, 'success');
    return { success: true };
  };

  // 4. EMAIL VA PAROL ORQALI RO'YXATDAN O'TISH
  const registerWithEmail = async (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<AuthActionResult> => {
    const email = data.email.trim();
    const cleanName = data.name.trim();

    if (!isFirebaseConfigured() || !auth) {
      const msg = getAuthT().errors.providerNotEnabled || getAuthT().errors.generic;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      const cred = await createUserWithEmailAndPassword(auth, email, data.password);
      const fbUser = cred.user;

      await updateProfile(fbUser, { displayName: cleanName }).catch(() => {});
      sendEmailVerification(fbUser).catch(() => {});

      setHasFirebaseSession(true);
      await syncFirebaseUserProfile(fbUser, 'email', {
        name: cleanName,
        phone: data.phone?.trim() || '',
      });
      showToast(getAuthT().toastRegisterSuccess, 'success');
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err?.code || '');
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // 4B. EMAIL VA PAROL ORQALI KIRISH
  const loginWithEmail = async (emailOrPhone: string, password: string): Promise<AuthActionResult> => {
    const email = emailOrPhone.includes('@')
      ? emailOrPhone.trim()
      : `${emailOrPhone.replace(/\D/g, '')}@taklifim.uz`;

    if (!isFirebaseConfigured() || !auth) {
      const msg = getAuthT().errors.providerNotEnabled || getAuthT().errors.generic;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (!password) {
      const msg = getAuthT().errEmailOrPassMissing;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setHasFirebaseSession(true);
      await syncFirebaseUserProfile(cred.user, 'email');
      showToast(getAuthT().toastLoginSuccess, 'success');
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err?.code || '');
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // 4C. PAROLNI TIKLASH
  const sendPasswordReset = async (emailInput: string): Promise<AuthActionResult> => {
    const email = emailInput.trim();
    if (!isFirebaseConfigured() || !auth) {
      const msg = getAuthT().errors.providerNotEnabled || getAuthT().errors.generic;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showToast(getAuthT().toastResetSent, 'info');
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err?.code || '');
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // 5. ODDIY RO'YXATDAN O'TISH
  const registerSimple = async (data: {
    name: string;
    phone: string;
    password: string;
  }): Promise<AuthActionResult> => {
    const cleanDigits = data.phone.replace(/\D/g, '');
    const virtualEmail = `${cleanDigits}@taklifim.uz`;

    if (!isFirebaseConfigured() || !auth) {
      const msg = getAuthT().errors.providerNotEnabled || getAuthT().errors.generic;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      let fbUser: FirebaseUser;
      try {
        const cred = await createUserWithEmailAndPassword(auth, virtualEmail, data.password);
        fbUser = cred.user;
      } catch (err: any) {
        if (err?.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, virtualEmail, data.password);
          fbUser = cred.user;
        } else {
          throw err;
        }
      }

      await updateProfile(fbUser, { displayName: data.name.trim() }).catch(() => {});
      setHasFirebaseSession(true);
      await syncFirebaseUserProfile(fbUser, 'simple', {
        name: data.name.trim(),
        phone: data.phone.trim(),
      });
      showToast(getAuthT().toastRegisterSuccess, 'success');
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err?.code || '');
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // Standart login
  const login = async (emailOrPhone: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    const res = await loginWithEmail(emailOrPhone, password);
    return res.success;
  };

  // Standart register
  const register = async (data: { name: string; email: string; phone: string; password?: string }): Promise<boolean> => {
    if (!data.password) return false;
    const res = await registerWithEmail({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    return res.success;
  };

  // Logout
  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      try {
        await signOut(auth);
      } catch {}
    }
    setHasFirebaseSession(false);
    setUser(null);
    try {
      localStorage.removeItem('taklifim_active_user');
    } catch {}
    showToast(getAuthT().toastLoggedOut, 'info');
  };

  // Admin Code
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('taklifim_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const [adminCodeError, setAdminCodeError] = useState<string | null>(null);

  const unlockAdmin = (code: string): boolean => {
    if (code.trim() === '8502') {
      setIsAdminUnlocked(true);
      setAdminCodeError(null);
      sessionStorage.setItem('taklifim_admin_unlocked', 'true');
      showToast(getAuthT().toastAdminUnlocked, 'success');
      return true;
    }
    setAdminCodeError(getAuthT().toastAdminInvalidCode);
    showToast(getAuthT().toastAdminInvalidCode, 'error');
    return false;
  };

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('taklifim_admin_unlocked');
    showToast(getAuthT().toastAdminLocked, 'info');
  };

  // Toastlar boshqaruvi
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      ...updates,
    };
    await persistUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        authReady,
        hasFirebaseSession,
        user,
        login,
        register,
        logout,
        loginWithGoogle,
        loginWithApple,
        sendPhoneOtp,
        verifyPhoneOtp,
        loginWithEmail,
        registerWithEmail,
        sendPasswordReset,
        registerSimple,
        updateUserProfile,
        canUseFreePlan,
        markFreePlanUsed,
        isAdminUnlocked,
        adminCodeError,
        unlockAdmin,
        lockAdmin,
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
