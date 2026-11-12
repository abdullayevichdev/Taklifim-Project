import {
  Template,
  InvitationData,
  GuestRSVP,
  OrderItem,
  ContactMessage,
} from '../types';
import { mockTemplates } from '../data/mockTemplates';
import { mockGuests } from '../data/mockGuests';
import { mockOrders } from '../data/mockOrders';
import { isFirebaseConfigured, db, rtdb } from './firebase';
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
} from 'firebase/database';

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

    // 1. Firebase Realtime Database Listener (Instant WebSockets)
    if (isFirebaseConfigured() && rtdb) {
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
    if (isFirebaseConfigured() && db) {
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
    // 1. Try Firebase Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, 'invitations'));
        if (snap.exists()) {
          const val = snap.val();
          let list: InvitationData[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
          if (userId) {
            list = list.filter((inv) => inv.ownerId === userId);
          }
          if (list.length > 0) {
            return list;
          }
        }
      } catch (err) {
        console.warn('RTDB getInvitations note:', err);
      }
    }

    // 2. Try Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const col = collection(db, 'invitations');
        const q = userId ? query(col, where('ownerId', '==', userId)) : col;
        const snap = await safeFirestore(getDocs(q as any), 1500);
        if (snap && !snap.empty) {
          const list: InvitationData[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Record<string, any>) } as InvitationData));
          return list;
        }
      } catch (err) {
        console.warn('Firestore getInvitations error:', err);
      }
    }

    // 3. Local storage fallback
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    if (userId) {
      return list.filter((inv) => inv.ownerId === userId);
    }
    return list;
  },

  async getInvitationBySlug(slug: string): Promise<InvitationData | null> {
    // 1. First check local storage for instantaneous load
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    const localMatch = list.find((inv) => inv.slug === slug || inv.id === slug);
    if (localMatch) {
      return localMatch;
    }

    // 2. Public lookup from Firebase Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, 'invitations'));
        if (snap.exists()) {
          const val = snap.val();
          const all: InvitationData[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
          const found = all.find((inv) => inv.slug === slug || inv.id === slug);
          if (found) {
            const updated = [found, ...list.filter((i) => i.id !== found.id)];
            setStored(STORAGE_KEY_INVITATIONS, updated);
            return found;
          }
        }
      } catch (err) {
        console.warn('RTDB getInvitationBySlug note:', err);
      }
    }

    // 3. Public lookup from Firestore
    if (isFirebaseConfigured() && db) {
      try {
        const col = collection(db, 'invitations');
        const q = query(col, where('slug', '==', slug));
        const snap = await safeFirestore(getDocs(q as any), 8000);
        if (snap && !snap.empty) {
          const d = snap.docs[0];
          const found = { id: d.id, ...(d.data() as Record<string, any>) } as InvitationData;
          const updated = [found, ...list.filter((i) => i.id !== found.id)];
          setStored(STORAGE_KEY_INVITATIONS, updated);
          return found;
        }

        const docSnap = await safeFirestore(getDocs(query(col, where('id', '==', slug))), 4000);
        if (docSnap && !docSnap.empty) {
          const d = docSnap.docs[0];
          const found = { id: d.id, ...(d.data() as Record<string, any>) } as InvitationData;
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
    const preparedData: InvitationData = {
      ...data,
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

    // Sync to Firebase Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      try {
        await rtdbSet(rtdbRef(rtdb, `invitations/${preparedData.id}`), sanitized);
      } catch (err) {
        console.warn('RTDB saveInvitation error:', err);
      }
    }

    // Sync to Firestore
    if (isFirebaseConfigured() && db) {
      try {
        await safeFirestore(setDoc(doc(db, 'invitations', preparedData.id), sanitized), 8000);
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
      await this.saveInvitation(target);
    }
  },

  async deleteInvitation(id: string): Promise<boolean> {
    const list = getStored<InvitationData[]>(STORAGE_KEY_INVITATIONS, []);
    const updated = list.filter((inv) => inv.id !== id);
    setStored(STORAGE_KEY_INVITATIONS, updated);
    realtimeHub.emit('invitations', updated);

    if (isFirebaseConfigured() && rtdb) {
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

    // 1. Try Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, 'guests'));
        if (snap.exists()) {
          const val = snap.val();
          all = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
        }
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

    if (ownerId) {
      all = all.filter((g) => g.invitationOwnerId === ownerId);
    }

    return all;
  },

  async submitRSVP(payload: Omit<GuestRSVP, 'id' | 'submittedAt'>): Promise<GuestRSVP> {
    const newGuest: GuestRSVP = {
      ...payload,
      id: `g-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submittedAt: new Date().toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }),
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

    if (isFirebaseConfigured() && rtdb) {
      rtdbRemove(rtdbRef(rtdb, `guests/${id}`)).catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      safeFirestore(deleteDoc(doc(db, 'guests', id)), 2000);
    }
    return true;
  },

  // -------------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------------
  async getOrders(): Promise<OrderItem[]> {
    if (isFirebaseConfigured() && rtdb) {
      try {
        const snap = await rtdbGet(rtdbRef(rtdb, 'orders'));
        if (snap.exists()) {
          const val = snap.val();
          const list: OrderItem[] = Array.isArray(val) ? val.filter(Boolean) : Object.values(val || {});
          if (list.length > 0) return list;
        }
      } catch {}
    }

    if (isFirebaseConfigured() && db) {
      const snap = await safeFirestore(getDocs(collection(db, 'orders')), 1500);
      if (snap && !snap.empty) {
        const list: OrderItem[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as OrderItem));
        return list;
      }
    }
    return getStored<OrderItem[]>(STORAGE_KEY_ORDERS, mockOrders);
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
      customerPhone: payload.customerPhone || '+998 90 000 00 00',
      customerEmail: payload.customerEmail || 'mijoz@taklifim.uz',
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

    // Save locally first
    const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, mockOrders);
    const updated = [newOrder, ...all.filter(o => o.id !== newOrder.id)];
    setStored(STORAGE_KEY_ORDERS, updated);
    realtimeHub.emit('orders', updated);

    const sanitized = sanitizeForFirestore(newOrder);

    // Sync to Realtime Database
    if (isFirebaseConfigured() && rtdb) {
      rtdbSet(rtdbRef(rtdb, `orders/${newOrder.id}`), sanitized).catch(() => {});
    }

    // Sync to Firestore
    if (isFirebaseConfigured() && db) {
      safeFirestore(setDoc(doc(db, 'orders', newOrder.id), sanitized), 2000);
    }

    return newOrder;
  },

  async uploadReceipt(payload: {
    orderId: string;
    invitationId?: string;
    invitationSlug?: string;
    customerName: string;
    customerPhone: string;
    templateName?: string;
    weddingDate?: string;
    venueName?: string;
    price: number;
    fileName: string;
    fileType: string;
    fileBase64: string;
  }): Promise<{ success: boolean; orderId: string; status: OrderItem['status']; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/payment/upload-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.status) {
        // Update local state
        await this.updateOrderStatus(payload.orderId, data.status);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        orderId: payload.orderId,
        status: 'pending_payment',
        error: err.message || "Chek yuborishda xatolik yuz berdi. Qayta urinib ko'ring.",
      };
    }
  },

  async getOrderStatus(orderId: string): Promise<{ success: boolean; status?: OrderItem['status']; error?: string }> {
    try {
      const res = await fetch(`/api/payment/status/${orderId}`);
      if (!res.ok) {
        // Fallback to local store
        const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, mockOrders);
        const match = all.find(o => o.id === orderId);
        if (match) {
          return { success: true, status: match.status };
        }
        return { success: false, error: 'Buyurtma topilmadi' };
      }
      const data = await res.json();
      if (data.success && data.status) {
        // Keep local store updated
        const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, mockOrders);
        const match = all.find(o => o.id === orderId);
        if (match && match.status !== data.status) {
          await this.updateOrderStatus(orderId, data.status);
        }
      }
      return data;
    } catch {
      const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, mockOrders);
      const match = all.find(o => o.id === orderId);
      return { success: true, status: match?.status || 'pending_payment' };
    }
  },

  async updateOrderStatus(orderId: string, status: OrderItem['status']): Promise<boolean> {
    const all = getStored<OrderItem[]>(STORAGE_KEY_ORDERS, mockOrders);
    const updated = all.map((o) => (o.id === orderId ? { ...o, status } : o));
    setStored(STORAGE_KEY_ORDERS, updated);
    realtimeHub.emit('orders', updated);

    if (isFirebaseConfigured() && rtdb) {
      rtdbUpdate(rtdbRef(rtdb, `orders/${orderId}`), { status }).catch(() => {});
    }
    if (isFirebaseConfigured() && db) {
      safeFirestore(updateDoc(doc(db, 'orders', orderId), { status }), 2000);
    }
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
    const newMessage: ContactMessage = {
      ...payload,
      id: `msg-${Date.now()}`,
      status: 'new',
      createdAt: new Date().toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }),
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
