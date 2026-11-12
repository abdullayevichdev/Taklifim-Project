import { cert, getApps, getApp, initializeApp, type App } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { cleanEnvString, cleanPrivateKey, getFirebaseDatabaseUrl } from './env.js';

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_review'
  | 'paid'
  | 'rejected';

export interface ServerOrder {
  id: string;
  orderId?: string;
  invitationId?: string;
  invitationSlug?: string;
  customerName: string;
  customerPhone: string;
  templateName?: string;
  weddingDate?: string;
  venueName?: string;
  price: number;
  status: OrderStatus;
  receiptUrl?: string;
  telegramMessageId?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

let initAttempted = false;

function parseServiceAccount(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const jsonRaw = cleanEnvString(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
        projectId?: string;
        clientEmail?: string;
        privateKey?: string;
      };
      const projectId = cleanEnvString(parsed.project_id || parsed.projectId);
      const clientEmail = cleanEnvString(parsed.client_email || parsed.clientEmail);
      const privateKey = cleanPrivateKey(parsed.private_key || parsed.privateKey);
      if (projectId && clientEmail && privateKey) {
        return { projectId, clientEmail, privateKey };
      }
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON parse error:', e);
    }
  }

  const projectId = cleanEnvString(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = cleanEnvString(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  if (initAttempted) {
    throw new Error('Firebase Admin initialization previously failed');
  }
  initAttempted = true;

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY'
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL: getFirebaseDatabaseUrl(),
  });
}

export function getRtdb() {
  return getDatabase(getAdminApp());
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = stripUndefined(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function getOrder(orderId: string): Promise<ServerOrder | null> {
  const snap = await getRtdb().ref(`orders/${orderId}`).get();
  if (!snap.exists()) return null;
  const data = snap.val() as ServerOrder;
  return {
    ...data,
    id: data.id || orderId,
    orderId: data.orderId || data.id || orderId,
  };
}

export async function upsertOrder(
  orderId: string,
  patch: Partial<ServerOrder> & Record<string, unknown>
): Promise<void> {
  const cleanPatch = stripUndefined(patch);
  if (Object.keys(cleanPatch).length > 0) {
    await getRtdb().ref(`orders/${orderId}`).update(cleanPatch);
  }
}

export async function updateInvitationStatus(
  invitationId: string,
  status: OrderStatus,
  updatedAt: string
): Promise<void> {
  const cleanPatch = stripUndefined({ status, updatedAt });
  await getRtdb().ref(`invitations/${invitationId}`).update(cleanPatch);
}
