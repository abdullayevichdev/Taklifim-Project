import {
  Template,
  InvitationData,
  GuestRSVP,
  OrderItem,
  ContactMessage,
} from '../types';
import { generateInvitationSlug, parseHostNames } from '../utils/slug';
import {
  uploadReceiptWithRetry,
  type UploadReceiptPayload,
  type UploadReceiptResult,
} from '../utils/receiptUpload';
import { mockTemplates } from '../data/mockTemplates';
import { mockGuests } from '../data/mockGuests';
import { mockOrders } from '../data/mockOrders';
import { isFirebaseConfigured, db, rtdb, auth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  onValue as rtdbOnValue,
  remove as rtdbRemove,
  update as rtdbUpdate,
  query as rtdbQuery,
  orderByChild,
  equalTo,
} from 'firebase/database';

async function ensureFirebaseAuthReady(): Promise<string | null> {
  if (!isFirebaseConfigured() || !auth) return null;
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
  } catch {
    // ignore
  }
  return auth.currentUser?.uid || null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  await ensureFirebaseAuthReady();
  const currentUser = auth?.currentUser;
  if (!currentUser) return {};
  try {
    const idToken = await currentUser.getIdToken();
    if (idToken) return { Authorization: `Bearer ${idToken}` };
    const refreshed = await currentUser.getIdToken(true);
    return refreshed ? { Authorization: `Bearer ${refreshed}` } : {};
  } catch {
    try {
      const refreshed = await currentUser.getIdToken(true);
      return refreshed ? { Authorization: `Bearer ${refreshed}` } : {};
    } catch {
      return {};
    }
  }
}

function getAuthenticatedUid(): string | null {
  return auth?.currentUser?.uid || null;
}

function isFallbackLocalId(id?: string): boolean {
  if (!id) return true;
  return (
    id === 'anonymous' ||
    id.startsWith('usr_') ||
    id.startsWith('phone_') ||
    id.startsWith('google_') ||
    id.startsWith('apple_')
  );
}

function mergeLocalInvitations(userId: string | undefined, remoteList: InvitationData[]): void {
  const existing = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
  const others = userId
    ? existing.filter((inv) => inv.ownerId !== userId && inv.ownerUid !== userId)
    : [];
  const merged = [...remoteList, ...others];
  setStored(STORAGE_KEY_INVITATIONS, merged);
}

// Storage keys
const STORAGE_KEY_INVITATIONS = 'taklifim_demo_invitations';
const STORAGE_KEY_GUESTS = 'taklifim_demo_guests';
const STORAGE_KEY_ORDERS = 'taklifim_demo_orders';
const STORAGE_KEY_TEMPLATES = 'taklifim_demo_templates';
const STORAGE_KEY_MESSAGES = 'taklifim_demo_messages';

// Initial contact messages
const initialMessages: ContactMessage[] = [
  {
    id: 'msg-1',
    name: 'Dilshod Raxmatov',
    contact: '+998 90 777 88 99',
    subject: 'Maxsus dizayn taklifnomasi',
    message: 'Assalomu alaykum! Bizga alohida monogrammali maxsus to‘y taklifnomasi kerak edi. Qanday bog‘lansak bo‘ladi?',
    status: 'new',
    createdAt: '2026-10-26 15:30',
  },
  {
    id: 'msg-2',
    name: 'Madina Alimova',
    contact: 'madina.alimova@gmail.com',
    subject: 'Individual taklifnoma buyurtmasi',
    message: 'To‘y marosimimiz uchun maxsus musiqali va interaktiv taklifnoma tayyorlash muddatlari qanday?',
    status: 'read',
    createdAt: '2026-10-25 11:20',
  },
];

// Helper functions for Local Storage
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return fallback;
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// Strip undefined fields and oversized payload for Firestore / RTDB
function sanitizeForFirestore<T>(data: T): Record<string, any> {
  const cloned = JSON.parse(JSON.stringify(data));
  // If base64 music is huge (>500KB), don't break database document limits
  if (cloned.musicFileData && typeof cloned.musicFileData === 'string' && cloned.musicFileData.length > 500000) {
    delete cloned.musicFileData;
  }
  return cloned;
}

// Timeout wrapper so network/offline Firestore never blocks UI completely
async function safeFirestore<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T | null> {
  let timer: any;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    console.warn('Firestore safe operation caught error or timed out:', err);
    return null;
  }
}

// REAL-TIME BROADCAST CHANNEL & EVENT BUS
type EventType = 'invitations' | 'guests' | 'orders' | 'templates' | 'messages';
type Listener<T = any> = (data: T) => void;

class RealtimeHub {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<EventType, Set<Listener>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('taklifim_realtime_hub');
        this.channel.onmessage = (event) => {
          const { type, payload } = event.data;
          this.notifyLocally(type, payload);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported or restricted:', e);
      }
    }

    // Storage fallback for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (!e.key) return;
        if (e.key === STORAGE_KEY_INVITATIONS) this.notifyLocally('invitations', getStored(STORAGE_KEY_INVITATIONS, []));
        if (e.key === STORAGE_KEY_GUESTS) this.notifyLocally('guests', getStored(STORAGE_KEY_GUESTS, []));
        if (e.key === STORAGE_KEY_ORDERS) this.notifyLocally('orders', getStored(STORAGE_KEY_ORDERS, mockOrders));
        if (e.key === STORAGE_KEY_TEMPLATES) this.notifyLocally('templates', getStored(STORAGE_KEY_TEMPLATES, mockTemplates));
        if (e.key === STORAGE_KEY_MESSAGES) this.notifyLocally('messages', getStored(STORAGE_KEY_MESSAGES, initialMessages));
      });
    }
  }

  public subscribe<T = any>(type: EventType, listener: Listener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  public emit(type: EventType, payload: any): void {
    this.notifyLocally(type, payload);
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload });
      } catch (err) {
        // ignore
      }
    }
  }

  private notifyLocally(type: EventType, payload: any): void {
    const list = this.listeners.get(type);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error('Error in realtime listener:', err);
        }
      });
    }
  }
}

export const realtimeHub = new RealtimeHub();

// UNIFIED API IMPLEMENTATION WITH FIREBASE REALTIME DATABASE + FIRESTORE
export const api = {
  // Realtime subscription helper across Realtime Database & Firestore
  subscribe<T = any>(type: EventType, callback: (data: T) => void): () => void {
    const unsubs: (() => void)[] = [];

    // 1. Firebase Realtime Database Listener (Only public templates root; guests/invitations/orders use scoped queries)
    const allowGlobalRtdb = type === 'templates';
    if (allowGlobalRtdb && isFirebaseConfigured() && rtdb) {
      try {
        const dbNode = rtdbRef(rtdb, type);
        const unsubRtdb = rtdbOnValue(
          dbNode,
          (snapshot) => {
            if (snapshot.exists()) {
              const val = snapshot.val();
              const list: any[] = Array.isArray(val)
                ? val.filter(Boolean)
                : Object.values(val || {});
              callback(list as unknown as T);
            }
          },
          (err) => {
            console.warn(`RTDB onValue [${type}] note:`, err.message);
          }
        );
        unsubs.push(unsubRtdb);
      } catch (err) {
        console.warn(`RTDB subscription failed for [${type}]:`, err);
      }
    }

    // 2. Firestore Snapshot Listener (Backup)
    if (allowGlobalRtdb && isFirebaseConfigured() && db) {
      try {
        const q = collection(db, type);
        const unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const list: any[] = [];
              snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
              });
              callback(list as unknown as T);
            }
          },
          (err) => {
            console.warn(`Firestore subscription [${type}] note:`, err.message);
          }
        );
        unsubs.push(unsubFirestore);
      } catch (err) {
        console.warn(`Firestore subscription failed for [${type}]:`, err);
      }
    }

    // 3. In-browser Event Hub (Cross-tab broadcast channel)
    const unsubHub = realtimeHub.subscribe<T>(type, callback);
    unsubs.push(unsubHub);

    return () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };
  },

  // -------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------
  async getTemplates(): Promise<Template[]> {
    // 1. Check Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, 'templates'));
        if (snap.exists()) {
          const val = snap.val();
          const list: Template[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val);
          if (list.length > 0) return list;
        }
      } catch {}
    }

    // 2. Check Firestore
    if (isFirebaseConfigured() && db) {
      const snap = await safeFirestore(getDocs(collection(db, 'templates')), 1500);
      if (snap && !snap.empty) {
        const list: Template[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Template));
        return list;
      }
    }

    return getStored<Template[]>(STORAGE_KEY_TEMPLATES, mockTemplates);
  },

  async getTemplateBySlug(slug: string): Promise<Template | null> {
    const list = await this.getTemplates();
    return list.find((t) => t.slug === slug) || null;
  },

  async addTemplate(template: Template): Promise<Template> {
    const templates = await this.getTemplates();
    const updated = [template, ...templates.filter((t) => t.id !== template.id)];
    setStored(STORAGE_KEY_TEMPLATES, updated);
    realtimeHub.emit('templates', updated);

    const sanitized = sanitizeForFirestore(template);
    // Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      rtdbSet(rtdbRef(rtdb, `templates/${template.id}`), sanitized).catch(() => {});
    }
    // Firestore
    if (isFirebaseConfigured() && db) {
      safeFirestore(setDoc(doc(db, 'templates', template.id), sanitized), 2000);
    }
    return template;
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const templates = await this.getTemplates();
    const updated = templates.filter((t) => t.id !== id);
    setStored(STORAGE_KEY_TEMPLATES, updated);
    realtimeHub.emit('templates', updated);

    if (isFirebaseConfigured() && rtdb) {
      rtdbRemove(rtdbRef(rtdb, `templates/${id}`)).catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      safeFirestore(deleteDoc(doc(db, 'templates', id)), 2000);
    }
    return true;
  },

  // -------------------------------------------------------------
  // INVITATIONS (REAL-TIME DATABASE & FIRESTORE)
  // -------------------------------------------------------------
  async getInvitations(userId?: string): Promise<InvitationData[]> {
    const authUid = await ensureFirebaseAuthReady();

    // Never run protected /invitations queries when Firebase is configured without a verified Firebase Auth user
    if (isFirebaseConfigured() && auth) {
      if (!auth.currentUser || !authUid) {
        return [];
      }

      if (rtdb) {
        try {
          const [snapById, snapByUid] = await Promise.all([
            rtdbGet(rtdbQuery(rtdbRef(rtdb, 'invitations'), orderByChild('ownerId'), equalTo(authUid))),
            rtdbGet(rtdbQuery(rtdbRef(rtdb, 'invitations'), orderByChild('ownerUid'), equalTo(authUid))),
          ]);

          const merged = new Map<string, InvitationData>();
          [snapById, snapByUid].forEach((snap) => {
            if (snap.exists()) {
              const val = snap.val();
              const entries: InvitationData[] = Array.isArray(val)
                ? val.filter(Boolean)
                : Object.values(val || {});
              entries.forEach((inv) => {
                if (inv?.id) merged.set(inv.id, inv);
              });
            }
          });

          const sorted = Array.from(merged.values()).sort((a, b) =>
            String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
          );
          mergeLocalInvitations(authUid, sorted);
          return sorted;
        } catch (err) {
          console.warn('RTDB getInvitations note:', err);
        }
      }

      if (db) {
        try {
          const col = collection(db, 'invitations');
          const q = query(col, where('ownerId', '==', authUid));
          const snap = await safeFirestore(getDocs(q as any), 1500);
          if (snap) {
            const list: InvitationData[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Record<string, any>) } as InvitationData));
            mergeLocalInvitations(authUid, list);
            return list;
          }
        } catch (err) {
          console.warn('Firestore getInvitations error:', err);
        }
      }

      const cached = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
      return cached.filter((inv) => inv.ownerId === authUid || inv.ownerUid === authUid);
    }

    // Offline / non-Firebase demo fallback
    const effectiveUid = userId || undefined;
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    if (effectiveUid) {
      return list.filter((inv) => inv.ownerId === effectiveUid || inv.ownerUid === effectiveUid);
    }
    return list;
  },

  async getInvitationById(id: string): Promise<InvitationData | null> {
    if (!id) return null;

    await ensureFirebaseAuthReady();

    if (isFirebaseConfigured() && rtdb && (!auth || auth.currentUser)) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, `invitations/${id}`));
        if (snap.exists()) {
          const found = snap.val() as InvitationData;
          const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
          setStored(STORAGE_KEY_INVITATIONS, [found, ...list.filter((i) => i.id !== found.id)]);
          return found;
        }
      } catch (err) {
        console.warn('RTDB getInvitationById note:', err);
      }
    }

    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    return list.find((inv) => inv.id === id) || null;
  },

  subscribeUserInvitations(
    uid: string,
    onData: (list: InvitationData[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const authUid = getAuthenticatedUid();
    const effectiveUid = authUid || uid;

    if (!effectiveUid) {
      onData([]);
      return () => {};
    }

    const emitLocal = () => {
      const local = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []).filter(
        (inv) =>
          inv.ownerId === effectiveUid ||
          inv.ownerUid === effectiveUid ||
          (uid && (inv.ownerId === uid || inv.ownerUid === uid))
      );
      onData(local);
    };

    if (!isFirebaseConfigured() || !rtdb || !auth?.currentUser || !authUid) {
      emitLocal();
      const unsubHub = realtimeHub.subscribe<InvitationData[]>('invitations', () => emitLocal());
      return unsubHub;
    }

    const byOwnerId = new Map<string, InvitationData>();
    const byOwnerUid = new Map<string, InvitationData>();
    let hasOwnerIdData = false;
    let hasOwnerUidData = false;

    const flush = () => {
      if (!hasOwnerIdData && !hasOwnerUidData) return;
      const combined = new Map<string, InvitationData>();
      byOwnerId.forEach((v, k) => combined.set(k, v));
      byOwnerUid.forEach((v, k) => combined.set(k, v));
      const sorted = Array.from(combined.values()).sort((a, b) =>
        String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))
      );
      mergeLocalInvitations(effectiveUid, sorted);
      onData(sorted);
    };

    const qId = rtdbQuery(rtdbRef(rtdb, 'invitations'), orderByChild('ownerId'), equalTo(effectiveUid));
    const qUid = rtdbQuery(rtdbRef(rtdb, 'invitations'), orderByChild('ownerUid'), equalTo(effectiveUid));

    const unsubId = rtdbOnValue(
      qId,
      (snap) => {
        byOwnerId.clear();
        if (snap.exists()) {
          const val = snap.val();
          const list: InvitationData[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
          list.forEach((inv) => {
            if (inv?.id) byOwnerId.set(inv.id, inv);
          });
        }
        hasOwnerIdData = true;
        flush();
      },
      (err) => {
        console.warn('RTDB subscribeUserInvitations ownerId error:', err.message);
        if (onError) onError(err);
      }
    );

    const unsubUid = rtdbOnValue(
      qUid,
      (snap) => {
        byOwnerUid.clear();
        if (snap.exists()) {
          const val = snap.val();
          const list: InvitationData[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
          list.forEach((inv) => {
            if (inv?.id) byOwnerUid.set(inv.id, inv);
          });
        }
        hasOwnerUidData = true;
        flush();
      },
      (err) => {
        console.warn('RTDB subscribeUserInvitations ownerUid error:', err.message);
      }
    );

    return () => {
      try { unsubId(); } catch {}
      try { unsubUid(); } catch {}
    };
  },

  async isSlugAvailable(slug: string, ignoreInvitationId?: string): Promise<boolean> {
    const clean = slug.toLowerCase().trim();
    if (!clean) return false;

    // 1. RTDB index check (authoritative)
    if (isFirebaseConfigured() && rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, `slugs/${clean}`));
        if (snap.exists()) {
          const boundId = snap.val();
          if (boundId && boundId !== ignoreInvitationId) {
            return false;
          }
        }
      } catch {}
    }

    // 2. Local check
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    const localConflict = list.find((i) => i.slug === clean && i.id !== ignoreInvitationId);
    if (localConflict) return false;

    return true;
  },

  async generateUniqueSlug(groomName?: string, brideName?: string, currentInvitationId?: string): Promise<string> {
    const { groom, bride } = parseHostNames('', groomName, brideName);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateInvitationSlug(groom, bride);
      const available = await this.isSlugAvailable(candidate, currentInvitationId);
      if (available) {
        return candidate;
      }
    }
    return generateInvitationSlug(groom, bride);
  },

  async getInvitationBySlug(slug: string): Promise<InvitationData | null> {
    const cleanSlug = slug.toLowerCase().trim();
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);

    // 1. Live lookup from Firebase Realtime Database first via slugs index (prevents stale local cache)
    if (isFirebaseConfigured() && rtdb) {
      try {
        const slugSnap = await rtdbGet(rtdbRef(rtdb, `slugs/${cleanSlug}`));
        if (slugSnap.exists()) {
          const invId = slugSnap.val();
          if (invId) {
            try {
              const invSnap = await rtdbGet(rtdbRef(rtdb, `invitations/${invId}`));
              if (invSnap.exists()) {
                const found = invSnap.val() as InvitationData;
                const updated = [found, ...list.filter((i) => i.id !== found.id)];
                setStored(STORAGE_KEY_INVITATIONS, updated);
                return found;
              }
            } catch {
              // Locked from anonymous guests when unpaid/pending review — return minimal non-PII pending stub
              return {
                id: String(invId),
                slug: cleanSlug,
                templateId: 'template-1',
                templateSlug: 'template-1',
                language: 'uz',
                status: 'pending_review',
                paymentStatus: 'pending_review',
                createdAt: '',
                updatedAt: '',
                eventType: '',
                eventTitle: 'Taklifnoma',
                hostNames: '',
                eventDate: '',
                startTime: '18:00',
                venueName: '',
                venueAddress: '',
                invitationMessage: '',
                galleryImages: [],
                musicEnabled: false,
                schedule: [],
                dressCodeEnabled: false,
                dressCodeColors: [],
                rsvpEnabled: false,
                rsvpDeadline: '',
                allowCompanion: false,
              };
            }
          }
        }
      } catch (err) {
        console.warn('RTDB getInvitationBySlug note:', err);
      }
    }

    // 2. Local cache fallback (offline / demo)
    const localMatch = list.find((inv) => inv.slug === cleanSlug || inv.id === cleanSlug);
    if (localMatch) {
      return localMatch;
    }

    // 3. Firestore lookup (when enabled)
    if (isFirebaseConfigured() && db) {
      try {
        const col = collection(db, 'invitations');
        const q = query(col, where('slug', '==', cleanSlug));
        const snap = await safeFirestore(getDocs(q as any), 8000);
        if (snap && !snap.empty) {
          const d = snap.docs[0];
          const found = { id: d.id, ...(d.data() as Record<string, any>) } as InvitationData;
          const updated = [found, ...list.filter((i) => i.id !== found.id)];
          setStored(STORAGE_KEY_INVITATIONS, updated);
          return found;
        }
      } catch (err) {
        console.warn('Firestore getInvitationBySlug error:', err);
      }
    }
    return null;
  },

  async saveInvitation(data: InvitationData): Promise<InvitationData> {
    const now = new Date().toISOString();
    const authUid = getAuthenticatedUid();

    // Auto-generate name-based slug if missing or default "toylarimiz-XXXX"
    let finalSlug = data.slug ? data.slug.toLowerCase().trim() : '';
    if (!finalSlug || finalSlug.startsWith('toylarimiz-')) {
      const { groom, bride } = parseHostNames(data.hostNames, data.partner1Name, data.partner2Name);
      finalSlug = await this.generateUniqueSlug(groom, bride, data.id);
    }

    const resolvedOwnerId = authUid
      ? isFallbackLocalId(data.ownerId)
        ? authUid
        : data.ownerId!
      : data.ownerId || 'anonymous';

    const resolvedOwnerUid = authUid
      ? authUid
      : data.ownerUid && !isFallbackLocalId(data.ownerUid)
      ? data.ownerUid
      : resolvedOwnerId !== 'anonymous' && !isFallbackLocalId(resolvedOwnerId)
      ? resolvedOwnerId
      : undefined;

    let preparedData: InvitationData = {
      ...data,
      slug: finalSlug,
      ownerId: resolvedOwnerId,
      ownerUid: resolvedOwnerUid,
      updatedAt: now,
      createdAt: data.createdAt || now,
    };

    // Update local storage immediately for zero latency
    const localList = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    const index = localList.findIndex((inv) => inv.id === preparedData.id || inv.slug === preparedData.slug);
    let updated: InvitationData[];
    if (index >= 0) {
      updated = [...localList];
      updated[index] = preparedData;
    } else {
      updated = [preparedData, ...localList];
    }
    setStored(STORAGE_KEY_INVITATIONS, updated);
    realtimeHub.emit('invitations', updated);

    const sanitized = sanitizeForFirestore(preparedData);

    // Never send private payment fields on public invitation nodes
    delete sanitized.receiptUrl;
    delete sanitized.customerPhone;

    // Client must NEVER write server-controlled statuses (pending_review, paid, rejected) or overwrite existing orderId/timestamps
    const isServerControlledStatus =
      sanitized.status === 'paid' ||
      sanitized.status === 'published' ||
      sanitized.status === 'rejected' ||
      sanitized.status === 'pending_review' ||
      Boolean(sanitized.orderId);

    const remotePayload = { ...sanitized };
    if (isServerControlledStatus) {
      delete remotePayload.status;
      delete remotePayload.paymentStatus;
      delete remotePayload.orderId;
      delete remotePayload.receiptSentAt;
      delete remotePayload.decidedAt;
      delete remotePayload.rejectReason;
    }

    // Sync to Firebase Realtime Database
    if (isFirebaseConfigured() && rtdb && auth?.currentUser && authUid) {
      let targetId = preparedData.id;
      let remoteExists = false;
      let remoteStatus: string | undefined;
      let remoteOrderId: string | undefined;
      let remoteOwnerId: string | undefined;

      try {
        const existingSnap = await rtdbGet(rtdbRef(rtdb, `invitations/${targetId}`));
        if (existingSnap.exists()) {
          remoteExists = true;
          const remoteVal = existingSnap.val() as Record<string, any>;
          remoteStatus = remoteVal?.status;
          remoteOrderId = remoteVal?.orderId;
          remoteOwnerId = remoteVal?.ownerId;
        }
      } catch (readErr: any) {
        const msg = String(readErr?.message || readErr?.code || '').toLowerCase();
        // If an unowned/legacy RTDB record occupies this draft ID, migrate local draft to a fresh owned ID
        if (
          msg.includes('permission') &&
          !data.orderId &&
          (!data.status || data.status === 'draft' || data.status === 'pending_payment')
        ) {
          const oldId = targetId;
          targetId = `inv-${Date.now()}`;
          preparedData = {
            ...preparedData,
            id: targetId,
            ownerId: authUid,
            ownerUid: authUid,
          };
          const latestLocal = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
          const rekeyed = [
            preparedData,
            ...latestLocal.filter((inv) => inv.id !== oldId && inv.id !== targetId),
          ];
          setStored(STORAGE_KEY_INVITATIONS, rekeyed);
          realtimeHub.emit('invitations', rekeyed);
        }
      }

      // Check slug ownership in RTDB before writing so we never violate slugs/$slug .write rule
      try {
        const slugSnap = await rtdbGet(rtdbRef(rtdb, `slugs/${preparedData.slug}`));
        if (slugSnap.exists() && slugSnap.val() && slugSnap.val() !== targetId) {
          const { groom, bride } = parseHostNames(
            preparedData.hostNames,
            preparedData.partner1Name,
            preparedData.partner2Name
          );
          const freshSlug = await this.generateUniqueSlug(groom, bride, targetId);
          preparedData = { ...preparedData, slug: freshSlug };
          remotePayload.slug = freshSlug;
        }
      } catch {}

      remotePayload.id = targetId;
      remotePayload.ownerUid = authUid;
      remotePayload.ownerId =
        remoteExists && remoteOwnerId && remoteOwnerId !== 'anonymous' && !isFallbackLocalId(remoteOwnerId)
          ? remoteOwnerId
          : authUid;

      const remoteIsServerControlled =
        remoteStatus === 'paid' ||
        remoteStatus === 'published' ||
        remoteStatus === 'rejected' ||
        remoteStatus === 'pending_review' ||
        Boolean(remoteOrderId);

      if (isServerControlledStatus || remoteIsServerControlled) {
        delete remotePayload.status;
        delete remotePayload.paymentStatus;
        delete remotePayload.orderId;
        delete remotePayload.receiptSentAt;
        delete remotePayload.decidedAt;
        delete remotePayload.rejectReason;
      }

      try {
        await rtdbUpdate(rtdbRef(rtdb, `invitations/${targetId}`), remotePayload);
        try {
          const slugSnapAfter = await rtdbGet(rtdbRef(rtdb, `slugs/${preparedData.slug}`));
          if (!slugSnapAfter.exists() || slugSnapAfter.val() === targetId) {
            await rtdbSet(rtdbRef(rtdb, `slugs/${preparedData.slug}`), targetId);
          }
        } catch (slugErr) {
          console.warn('RTDB slug write note:', slugErr);
        }
      } catch (err) {
        console.warn('RTDB saveInvitation error:', err);
      }
    }

    // Sync to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        if (isServerControlledStatus) {
          await safeFirestore(
            updateDoc(doc(db, 'invitations', preparedData.id), remotePayload),
            8000
          );
        } else {
          await safeFirestore(setDoc(doc(db, 'invitations', preparedData.id), remotePayload), 8000);
        }
      } catch (err) {
        console.warn('Firestore saveInvitation error:', err);
      }
    }

    return preparedData;
  },

  async incrementViews(slug: string): Promise<void> {
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    const target = list.find((inv) => inv.slug === slug);
    if (target) {
      target.viewsCount = (target.viewsCount || 0) + 1;
      setStored(STORAGE_KEY_INVITATIONS, list.map((inv) => (inv.id === target.id ? target : inv)));
    }
  },

  async deleteInvitation(id: string): Promise<boolean> {
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    const updated = list.filter((inv) => inv.id !== id);
    setStored(STORAGE_KEY_INVITATIONS, updated);
    realtimeHub.emit('invitations', updated);

    if (isFirebaseConfigured() && rtdb && auth?.currentUser) {
      rtdbRemove(rtdbRef(rtdb, `invitations/${id}`)).catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      safeFirestore(deleteDoc(doc(db, 'invitations', id)), 2000);
    }
    return true;
  },

  // -------------------------------------------------------------
  // RSVP / GUESTS (REAL-TIME DATABASE & FIRESTORE)
  // -------------------------------------------------------------
  async getGuests(invitationSlug?: string, ownerId?: string): Promise<GuestRSVP[]> {
    let all: GuestRSVP[] = [];
    const authUid = ownerId ? await ensureFirebaseAuthReady() : null;
    const effectiveOwner = ownerId ? authUid || undefined : undefined;

    if (ownerId && isFirebaseConfigured() && auth && (!auth.currentUser || !effectiveOwner)) {
      return [];
    }

    // 1. Try Realtime Database using indexed queries when scoped
    if (isFirebaseConfigured() && rtdb && (effectiveOwner || invitationSlug)) {
      try {
        let snap;
        if (effectiveOwner) {
          snap = await rtdbGet(
            rtdbQuery(rtdbRef(rtdb, 'guests'), orderByChild('invitationOwnerId'), equalTo(effectiveOwner))
          );
        } else if (invitationSlug) {
          snap = await rtdbGet(
            rtdbQuery(rtdbRef(rtdb, 'guests'), orderByChild('invitationSlug'), equalTo(invitationSlug))
          );
        }
        if (snap && snap.exists()) {
          const val = snap.val();
          all = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
          return all;
        }
        return [];
      } catch {}
    }

    // 2. Try Firestore if RTDB had nothing
    if (all.length === 0 && isFirebaseConfigured() && db) {
      const snap = await safeFirestore(getDocs(collection(db, 'guests')), 1500);
      if (snap && !snap.empty) {
        snap.forEach((d) => all.push({ id: d.id, ...d.data() } as GuestRSVP));
      }
    }

    // 3. Fallback to Local Storage
    if (all.length === 0) {
      all = getStored<GuestRSVP[]>(STORAGE_KEY_GUESTS, mockGuests);
    }

    if (invitationSlug) {
      all = all.filter((g) => g.invitationSlug === invitationSlug);
    }

    if (effectiveOwner) {
      all = all.filter((g) => g.invitationOwnerId === effectiveOwner);
    }

    return all;
  },

  subscribeUserGuests(uid: string, onData: (guests: GuestRSVP[]) => void): () => void {
    const authUid = getAuthenticatedUid();
    const effectiveUid = authUid || uid;
    if (!effectiveUid) {
      onData([]);
      return () => {};
    }

    const emitLocal = () => {
      const local = getStored<GuestRSVP[]>(STORAGE_KEY_GUESTS, []).filter(
        (g) => g.invitationOwnerId === effectiveUid || g.invitationOwnerId === uid
      );
      onData(local);
    };

    if (!isFirebaseConfigured() || !rtdb || !auth?.currentUser || !authUid) {
      emitLocal();
      return realtimeHub.subscribe<GuestRSVP[]>('guests', () => emitLocal());
    }

    const q = rtdbQuery(
      rtdbRef(rtdb, 'guests'),
      orderByChild('invitationOwnerId'),
      equalTo(effectiveUid)
    );
    const unsubRtdb = rtdbOnValue(
      q,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const list: GuestRSVP[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val || {});
          onData(list);
        } else {
          onData([]);
        }
      },
      (err) => {
        console.warn('RTDB subscribeUserGuests note:', err.message);
      }
    );

    return () => {
      try { unsubRtdb(); } catch {}
    };
  },

  subscribeInvitationGuests(slug: string, onData: (guests: GuestRSVP[]) => void): () => void {
    const cleanSlug = slug.toLowerCase().trim();
    if (!cleanSlug) {
      onData([]);
      return () => {};
    }

    const emitLocal = () => {
      const local = getStored<GuestRSVP[]>(STORAGE_KEY_GUESTS, []).filter(
        (g) => g.invitationSlug === cleanSlug
      );
      onData(local);
    };

    if (!isFirebaseConfigured() || !rtdb) {
      emitLocal();
      return realtimeHub.subscribe<GuestRSVP[]>('guests', () => emitLocal());
    }

    const q = rtdbQuery(
      rtdbRef(rtdb, 'guests'),
      orderByChild('invitationSlug'),
      equalTo(cleanSlug)
    );
    const unsubRtdb = rtdbOnValue(
      q,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const list: GuestRSVP[] = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val || {});
          onData(list);
        } else {
          onData([]);
        }
      },
      (err) => {
        console.warn('RTDB subscribeInvitationGuests note:', err.message);
      }
    );
    const unsubHub = realtimeHub.subscribe<GuestRSVP[]>('guests', () => emitLocal());

    return () => {
      try { unsubRtdb(); } catch {}
      try { unsubHub(); } catch {}
    };
  },

  async submitRSVP(payload: Omit<GuestRSVP, 'id' | 'submittedAt'>): Promise<GuestRSVP> {
    const safeCount = Number.isFinite(Number(payload.guestCount))
      ? Math.max(0, Math.min(20, Math.round(Number(payload.guestCount))))
      : payload.attending
      ? 1
      : 0;
    const newGuest: GuestRSVP = {
      ...payload,
      invitationSlug: String(payload.invitationSlug || '').toLowerCase().trim().slice(0, 128),
      invitationOwnerId: payload.invitationOwnerId ? String(payload.invitationOwnerId).slice(0, 128) : undefined,
      fullName: String(payload.fullName || 'Mehmon').trim().slice(0, 120) || 'Mehmon',
      phone: String(payload.phone || '').trim().slice(0, 40),
      attending: Boolean(payload.attending),
      guestCount: safeCount,
      mealPreference: payload.mealPreference ? String(payload.mealPreference).trim().slice(0, 100) : undefined,
      message: String(payload.message || '').trim().slice(0, 1000),
      id: `g-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submittedAt: new Date().toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }).slice(0, 64),
    };

    // Save locally first
    const all = getStored<GuestRSVP[]>(STORAGE_KEY_GUESTS, []);
    const updated = [newGuest, ...all];
    setStored(STORAGE_KEY_GUESTS, updated);
    realtimeHub.emit('guests', updated);

    const sanitized = sanitizeForFirestore(newGuest);

    // Sync to Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      rtdbSet(rtdbRef(rtdb, `guests/${newGuest.id}`), sanitized).catch((err) => {
        console.warn('RTDB submitRSVP error:', err);
      });
    }

    // Sync to Firestore
    if (isFirebaseConfigured() && db) {
      safeFirestore(setDoc(doc(db, 'guests', newGuest.id), sanitized), 2000);
    }

    return newGuest;
  },

  async deleteGuest(id: string): Promise<boolean> {
    const all = getStored<GuestRSVP[]>(STORAGE_KEY_GUESTS, []);
    const updated = all.filter((g) => g.id !== id);
    setStored(STORAGE_KEY_GUESTS, updated);
    realtimeHub.emit('guests', updated);

    if (isFirebaseConfigured() && rtdb && auth?.currentUser) {
      rtdbRemove(rtdbRef(rtdb, `guests/${id}`)).catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      safeFirestore(deleteDoc(doc(db, 'guests', id)), 2000);
    }
    return true;
  },

  // -------------------------------------------------------------
  // ORDERS (USER-SCOPED & SERVER-OWNED)
  // -------------------------------------------------------------
  async getOrders(userId?: string): Promise<OrderItem[]> {
    const authUid = await ensureFirebaseAuthReady();
    const uid = authUid || userId || undefined;

    if (isFirebaseConfigured() && auth && (!auth.currentUser || !authUid)) {
      return [];
    }

    if (isFirebaseConfigured() && rtdb && uid && auth?.currentUser && authUid) {
      const rtdbInstance = rtdb;
      try {
        const indexSnap = await rtdbGet(rtdbRef(rtdbInstance, `userOrders/${uid}`));
        if (!indexSnap.exists()) {
          return [];
        }
        const indexMap = (indexSnap.val() || {}) as Record<string, OrderItem['status']>;
        const orderIds = Object.keys(indexMap).filter(Boolean);
        const fetched = await Promise.all(
          orderIds.map(async (orderId) => {
            try {
              const snap = await rtdbGet(rtdbRef(rtdbInstance, `orders/${orderId}`));
              if (snap.exists()) {
                return snap.val() as OrderItem;
              }
            } catch {}
            return null;
          })
        );
        const list = fetched.filter(Boolean) as OrderItem[];
        list.sort((a, b) =>
          String(b.updatedAt || b.createdAt || b.submittedAt || '').localeCompare(
            String(a.updatedAt || a.createdAt || a.submittedAt || '')
          )
        );
        setStored(STORAGE_KEY_ORDERS, list);
        return list;
      } catch (err) {
        console.warn('RTDB getOrders note:', err);
      }
    }

    const stored = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, []);
    if (uid) {
      return stored.filter((o) => !o.ownerUid || o.ownerUid === uid);
    }
    return stored.length > 0 ? stored : mockOrders;
  },

  async getOrderById(orderId: string): Promise<OrderItem | null> {
    if (!orderId) return null;
    await ensureFirebaseAuthReady();
    if (isFirebaseConfigured() && rtdb && auth?.currentUser) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, `orders/${orderId}`));
        if (snap.exists()) {
          return snap.val() as OrderItem;
        }
      } catch {}
    }
    const stored = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, []);
    return stored.find((o) => o.id === orderId) || null;
  },

  subscribeUserOrders(
    uid: string,
    onData: (orders: OrderItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const authUid = getAuthenticatedUid();
    const effectiveUid = authUid || uid;

    if (!effectiveUid) {
      onData([]);
      return () => {};
    }

    if (!isFirebaseConfigured() || !rtdb || !auth?.currentUser || !authUid) {
      const local = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, []).filter(
        (o) => !o.ownerUid || o.ownerUid === effectiveUid || o.ownerUid === uid
      );
      onData(local);
      return realtimeHub.subscribe<OrderItem[]>('orders', (all) => {
        onData((all || []).filter((o) => !o.ownerUid || o.ownerUid === effectiveUid || o.ownerUid === uid));
      });
    }

    const rtdbInstance = rtdb;
    const orderUnsubs = new Map<string, () => void>();
    const orderMap = new Map<string, OrderItem>();

    const emitSorted = () => {
      const sorted = Array.from(orderMap.values()).sort((a, b) =>
        String(b.updatedAt || b.createdAt || b.submittedAt || '').localeCompare(
          String(a.updatedAt || a.createdAt || a.submittedAt || '')
        )
      );
      setStored(STORAGE_KEY_ORDERS, sorted);
      onData(sorted);
    };

    const userOrdersRef = rtdbRef(rtdbInstance, `userOrders/${effectiveUid}`);
    const unsubIndex = rtdbOnValue(
      userOrdersRef,
      (snap) => {
        const indexVal = snap.exists() ? (snap.val() as Record<string, OrderItem['status']>) : {};
        const activeIds = new Set(Object.keys(indexVal || {}).filter(Boolean));

        // Clean up removed order listeners
        for (const [id, unsubFn] of orderUnsubs.entries()) {
          if (!activeIds.has(id)) {
            try { unsubFn(); } catch {}
            orderUnsubs.delete(id);
            orderMap.delete(id);
          }
        }

        if (activeIds.size === 0) {
          emitSorted();
          return;
        }

        activeIds.forEach((orderId) => {
          const indexedStatus = indexVal[orderId];
          if (orderMap.has(orderId) && indexedStatus) {
            const cur = orderMap.get(orderId)!;
            if (cur.status !== indexedStatus) {
              orderMap.set(orderId, { ...cur, status: indexedStatus });
              emitSorted();
            }
          }

          if (!orderUnsubs.has(orderId)) {
            const ordRef = rtdbRef(rtdbInstance, `orders/${orderId}`);
            const unsubOrd = rtdbOnValue(
              ordRef,
              (ordSnap) => {
                if (ordSnap.exists()) {
                  const ord = ordSnap.val() as OrderItem;
                  orderMap.set(orderId, {
                    ...ord,
                    id: ord.id || orderId,
                  });
                  emitSorted();
                }
              },
              (err) => {
                console.warn(`RTDB subscribe order [${orderId}] note:`, err.message);
              }
            );
            orderUnsubs.set(orderId, unsubOrd);
          }
        });
      },
      (err) => {
        console.warn('RTDB subscribeUserOrders error:', err.message);
        if (onError) onError(err);
      }
    );

    return () => {
      try { unsubIndex(); } catch {}
      orderUnsubs.forEach((fn) => {
        try { fn(); } catch {}
      });
      orderUnsubs.clear();
    };
  },

  subscribeOrder(
    orderId: string,
    onData: (order: OrderItem | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!orderId) {
      onData(null);
      return () => {};
    }

    if (!isFirebaseConfigured() || !rtdb || !auth?.currentUser) {
      const local = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, []).find((o) => o.id === orderId) || null;
      onData(local);
      return realtimeHub.subscribe<OrderItem[]>('orders', (all) => {
        const found = (all || []).find((o) => o.id === orderId) || null;
        if (found) onData(found);
      });
    }

    const ordRef = rtdbRef(rtdb, `orders/${orderId}`);
    const unsub = rtdbOnValue(
      ordRef,
      (snap) => {
        if (snap.exists()) {
          const val = snap.val() as OrderItem;
          onData({ ...val, id: val.id || orderId });
        } else {
          onData(null);
        }
      },
      (err) => {
        console.warn(`RTDB subscribeOrder [${orderId}] note:`, err.message);
        if (onError) onError(err);
      }
    );

    return () => {
      try { unsub(); } catch {}
    };
  },

  async createOrder(payload: Partial<OrderItem>): Promise<OrderItem> {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const orderId = payload.id || `ORD-${randomCode}`;
    const newOrder: OrderItem = {
      id: orderId,
      orderNumber: payload.orderNumber || `TK-${randomCode}`,
      serviceType: payload.serviceType || 'website_invitation',
      serviceName: payload.serviceName || 'Taklifnoma Xizmati',
      planName: payload.planName || 'Standard Plan',
      customerName: payload.customerName || 'Hurmatli Mijoz',
      customerPhone: payload.customerPhone || '',
      customerEmail: payload.customerEmail || '',
      ownerUid: payload.ownerUid || getAuthenticatedUid() || undefined,
      date: new Date().toISOString().split('T')[0],
      price: payload.price !== undefined ? payload.price : 150000,
      status: payload.status || (payload.price === 0 ? 'paid' : 'pending_payment'),
      notes: payload.notes || '',
      invitationId: payload.invitationId,
      invitationSlug: payload.invitationSlug,
      templateName: payload.templateName,
      weddingDate: payload.weddingDate,
      venueName: payload.venueName,
      submittedAt: new Date().toISOString(),
    };

    // Local cache only — orders node in Firebase RTDB is strictly server-owned
    const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, []);
    const updated = [newOrder, ...all.filter((o) => o.id !== newOrder.id)];
    setStored(STORAGE_KEY_ORDERS, updated);
    realtimeHub.emit('orders', updated);

    return newOrder;
  },

  async uploadReceipt(
    payload: UploadReceiptPayload,
    options?: { onAttempt?: (attempt: number, maxAttempts: number) => void }
  ): Promise<UploadReceiptResult> {
    const result = await uploadReceiptWithRetry(payload, getAuthHeaders, {
      onAttempt: options?.onAttempt,
    });

    if (result.success && result.status === 'pending_review') {
      await this.updateOrderStatus(payload.orderId, 'pending_review', { syncRemote: false });
    }

    return result;
  },

  async getOrderStatus(orderId: string): Promise<{
    success: boolean;
    statusCode?: number;
    orderId?: string;
    status?: OrderItem['status'];
    invitationId?: string;
    invitationSlug?: string;
    customerName?: string;
    templateName?: string;
    weddingDate?: string;
    venueName?: string;
    price?: number;
    receiptSentAt?: string;
    decidedAt?: string;
    rejectReason?: string;
    updatedAt?: string;
    error?: string;
  }> {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/payment/status/${encodeURIComponent(orderId)}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          error: data?.error || (res.status === 403 ? "Ruxsat yo'q" : 'Buyurtma topilmadi'),
        };
      }

      if (data?.success && data?.status) {
        await this.updateOrderStatus(orderId, data.status, { syncRemote: false });
      }
      return data;
    } catch {
      const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, []);
      const match = all.find((o) => o.id === orderId);
      if (match) {
        return {
          success: true,
          orderId,
          status: match.status,
          invitationId: match.invitationId,
          invitationSlug: match.invitationSlug,
          receiptSentAt: match.receiptSentAt || match.submittedAt,
          decidedAt: match.decidedAt,
          rejectReason: match.rejectReason,
        };
      }
      return { success: false, error: "Server bilan bog'lanib bo'lmadi" };
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderItem['status'],
    _options?: { syncRemote?: boolean }
  ): Promise<boolean> {
    const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, []);
    const updated = all.map((o) => (o.id === orderId ? { ...o, status } : o));
    setStored(STORAGE_KEY_ORDERS, updated);
    realtimeHub.emit('orders', updated);
    return true;
  },

  // -------------------------------------------------------------
  // CONTACT MESSAGES / INQUIRIES
  // -------------------------------------------------------------
  async getContactMessages(): Promise<ContactMessage[]> {
    if (isFirebaseConfigured() && rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, 'messages'));
        if (snap.exists()) {
          const val = snap.val();
          const list: ContactMessage[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
          if (list.length > 0) return list;
        }
      } catch {}
    }

    if (isFirebaseConfigured() && db) {
      const snap = await safeFirestore(getDocs(collection(db, 'messages')), 1500);
      if (snap && !snap.empty) {
        const list: ContactMessage[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ContactMessage));
        return list;
      }
    }
    return getStored<ContactMessage[]>(STORAGE_KEY_MESSAGES, initialMessages);
  },

  async submitContactMessage(payload: Omit<ContactMessage, 'id' | 'createdAt' | 'status'>): Promise<ContactMessage> {
    const randSuffix = Math.random().toString(36).slice(2, 6);
    const newMessage: ContactMessage = {
      name: String(payload.name || '').trim().slice(0, 120),
      contact: String(payload.contact || '').trim().slice(0, 150),
      subject: String(payload.subject || 'Murojaat').trim().slice(0, 200),
      message: String(payload.message || '').trim().slice(0, 2000),
      id: `msg-${Date.now()}-${randSuffix}`,
      status: 'new',
      createdAt: new Date().toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }).slice(0, 64),
    };

    const all = getStored<ContactMessage[]>(STORAGE_KEY_MESSAGES, initialMessages);
    const updated = [newMessage, ...all];
    setStored(STORAGE_KEY_MESSAGES, updated);
    realtimeHub.emit('messages', updated);

    const sanitized = sanitizeForFirestore(newMessage);

    if (isFirebaseConfigured() && rtdb) {
      rtdbSet(rtdbRef(rtdb, `messages/${newMessage.id}`), sanitized).catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      safeFirestore(setDoc(doc(db, 'messages', newMessage.id), sanitized), 2000);
    }

    return newMessage;
  },

  async updateContactMessageStatus(id: string, status: ContactMessage['status']): Promise<boolean> {
    const all = getStored<ContactMessage[]>(STORAGE_KEY_MESSAGES, initialMessages);
    const updated = all.map((m) => (m.id === id ? { ...m, status } : m));
    setStored(STORAGE_KEY_MESSAGES, updated);
    realtimeHub.emit('messages', updated);

    if (isFirebaseConfigured() && rtdb) {
      rtdbUpdate(rtdbRef(rtdb, `messages/${id}`), { status }).catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      safeFirestore(updateDoc(doc(db, 'messages', id), { status }), 2000);
    }
    return true;
  },
};
