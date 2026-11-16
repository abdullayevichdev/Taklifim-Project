import { cert, getApps, getApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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
  orderNumber?: string;
  ownerUid?: string;
  invitationId?: string;
  invitationSlug?: string;
  customerName: string;
  customerPhone: string;
  templateName?: string;
  planName?: string;
  weddingDate?: string;
  venueName?: string;
  price: number;
  status: OrderStatus;
  receiptUrl?: string;
  telegramMessageId?: number;
  receiptSentAt?: string;
  decidedAt?: string;
  reviewedAt?: string;
  decidedBy?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface VerifiedAuthUser {
  uid: string;
  email?: string;
}

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

export function getAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    console.warn('[Taklifim] Firebase Admin credentials missing; server-side database sync running in memory/mock fallback mode.');
    return null;
  }

  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL: getFirebaseDatabaseUrl(),
  });
}

export function getRtdb() {
  const app = getAdminApp();
  if (!app) {
    return {
      ref: (_path?: string) => ({
        get: async () => ({ exists: () => false, val: () => null }),
        update: async () => {},
        set: async () => {},
      }),
    } as any;
  }
  return getDatabase(app);
}

/**
 * Verifies a Firebase Auth ID token from Authorization: Bearer <idToken>.
 * Never trusts client-supplied uid fields.
 */
export async function verifyBearerToken(
  authorizationHeader?: string | string[]
): Promise<VerifiedAuthUser | null> {
  const rawHeader = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;
  if (!rawHeader || typeof rawHeader !== 'string') {
    return null;
  }

  const match = rawHeader.match(/^Bearer\s+(.+)$/i);
  const idToken = match?.[1]?.trim();
  if (!idToken) {
    return null;
  }

  const app = getAdminApp();
  if (!app) {
    return null;
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    if (!decoded?.uid) return null;
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (err) {
    console.warn('verifyIdToken failed:', (err as Error)?.message || err);
    return null;
  }
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

export async function getInvitationRecord(
  invitationId: string
): Promise<Record<string, any> | null> {
  if (!invitationId) return null;
  const snap = await getRtdb().ref(`invitations/${invitationId}`).get();
  if (!snap.exists()) return null;
  return snap.val() as Record<string, any>;
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
  const cleanPatch = stripUndefined({
    status,
    paymentStatus: status,
    updatedAt,
  });
  await getRtdb().ref(`invitations/${invitationId}`).update(cleanPatch);
}

/**
 * Atomically saves a newly submitted receipt order as pending_review,
 * indexes it under userOrders/{uid}/{orderId}, and links invitations/{id}.
 */
export async function commitOrderPendingReview(params: {
  verifiedUid: string;
  orderId: string;
  invitationId?: string;
  invitationSlug?: string;
  customerName: string;
  customerPhone: string;
  templateName: string;
  planName?: string;
  weddingDate: string;
  venueName: string;
  price: number;
  receiptUrl?: string;
  receiptType?: 'photo' | 'document';
  nowIso: string;
}): Promise<{ ok: true; orderData: ServerOrder } | { ok: false; statusCode: number; error: string }> {
  const existing = await getOrder(params.orderId);

  if (existing?.ownerUid && existing.ownerUid !== params.verifiedUid) {
    return {
      ok: false,
      statusCode: 403,
      error: "Bu buyurtma boshqa foydalanuvchiga tegishli.",
    };
  }

  if (existing?.status === 'paid') {
    return {
      ok: false,
      statusCode: 400,
      error: "Ushbu buyurtma allaqachon tasdiqlangan.",
    };
  }

  const finalInvId = params.invitationId || existing?.invitationId;
  const finalInvSlug = params.invitationSlug || existing?.invitationSlug;
  const finalReceiptUrl = params.receiptUrl || existing?.receiptUrl;

  let existingInv: Record<string, any> | null = null;
  if (finalInvId) {
    existingInv = await getInvitationRecord(finalInvId);
    const invOwner = existingInv?.ownerUid || existingInv?.ownerId;
    if (invOwner && invOwner !== 'anonymous' && invOwner !== params.verifiedUid) {
      return {
        ok: false,
        statusCode: 403,
        error: "Bu taklifnoma boshqa foydalanuvchiga tegishli.",
      };
    }
  }

  const orderData = stripUndefined({
    ...(existing || {}),
    id: params.orderId,
    orderId: params.orderId,
    orderNumber: existing?.orderNumber || params.orderId.replace(/^ORD-/, 'TK-'),
    ownerUid: params.verifiedUid,
    invitationId: finalInvId,
    invitationSlug: finalInvSlug || existingInv?.slug,
    customerName: params.customerName || existing?.customerName || 'Mijoz',
    customerPhone: params.customerPhone,
    templateName: params.templateName || existing?.templateName || 'Standart Shablon',
    planName: params.planName || existing?.planName,
    weddingDate: params.weddingDate || existing?.weddingDate || '-',
    venueName: params.venueName || existing?.venueName || '-',
    price: Number(params.price) || existing?.price || 180000,
    status: 'pending_review',
    receiptUrl: finalReceiptUrl,
    receiptType: params.receiptType || existing?.receiptType,
    receiptSentAt: params.nowIso,
    submittedAt: params.nowIso,
    createdAt: existing?.createdAt || params.nowIso,
    updatedAt: params.nowIso,
  }) as ServerOrder;

  // Clear previous rejection reason if re-uploading
  delete orderData.rejectReason;

  const updates: Record<string, unknown> = {
    [`orders/${params.orderId}`]: {
      ...orderData,
      rejectReason: null,
    },
    [`userOrders/${params.verifiedUid}/${params.orderId}`]: 'pending_review',
  };

  if (finalInvId) {
    updates[`invitations/${finalInvId}/status`] = 'pending_review';
    updates[`invitations/${finalInvId}/paymentStatus`] = 'pending_review';
    updates[`invitations/${finalInvId}/orderId`] = params.orderId;
    updates[`invitations/${finalInvId}/ownerUid`] = params.verifiedUid;
    if (!existingInv?.ownerId || existingInv.ownerId === 'anonymous') {
      updates[`invitations/${finalInvId}/ownerId`] = params.verifiedUid;
    }
    updates[`invitations/${finalInvId}/receiptSentAt`] = params.nowIso;
    updates[`invitations/${finalInvId}/updatedAt`] = params.nowIso;
    updates[`invitations/${finalInvId}/rejectReason`] = null;

    const cleanSlug = (finalInvSlug || existingInv?.slug || '').toString().toLowerCase().trim();
    if (cleanSlug) {
      updates[`slugs/${cleanSlug}`] = finalInvId;
    }
  }

  await getRtdb().ref().update(updates);

  return { ok: true, orderData };
}

/**
 * Shared atomic approval / rejection function for Telegram webhook.
 * Prevents double-confirmation and updates orders/{id}, userOrders/{uid}/{id},
 * and invitations/{id} in a single multi-path RTDB write.
 */
export async function decideOrderPayment(params: {
  orderId: string;
  decision: 'paid' | 'rejected';
  adminName?: string;
  rejectReason?: string;
}): Promise<{
  alreadyDecided: boolean;
  existingStatus?: OrderStatus;
  order: ServerOrder | null;
}> {
  const order = await getOrder(params.orderId);

  if (order && (order.status === 'paid' || order.status === 'rejected')) {
    return {
      alreadyDecided: true,
      existingStatus: order.status,
      order,
    };
  }

  const nowIso = new Date().toISOString();
  const invitationId = order?.invitationId;
  const invRecord = invitationId ? await getInvitationRecord(invitationId) : null;

  let ownerUid = order?.ownerUid;
  if (!ownerUid && invRecord) {
    const candidate = invRecord.ownerUid || invRecord.ownerId;
    if (candidate && candidate !== 'anonymous') {
      ownerUid = String(candidate);
    }
  }

  const defaultRejectReason = "To'lov cheki tasdiqlanmadi. Iltimos, to'g'ri chekni qayta yuklang.";
  const resolvedReason =
    params.decision === 'rejected'
      ? (params.rejectReason?.trim() || defaultRejectReason)
      : null;

  const updates: Record<string, unknown> = {
    [`orders/${params.orderId}/id`]: params.orderId,
    [`orders/${params.orderId}/orderId`]: params.orderId,
    [`orders/${params.orderId}/status`]: params.decision,
    [`orders/${params.orderId}/updatedAt`]: nowIso,
    [`orders/${params.orderId}/decidedAt`]: nowIso,
    [`orders/${params.orderId}/reviewedAt`]: nowIso,
    [`orders/${params.orderId}/rejectReason`]: resolvedReason,
  };

  if (params.adminName) {
    updates[`orders/${params.orderId}/decidedBy`] = params.adminName;
  }

  if (!order) {
    updates[`orders/${params.orderId}/customerName`] = 'Mijoz';
    updates[`orders/${params.orderId}/customerPhone`] = '';
    updates[`orders/${params.orderId}/price`] = 0;
    updates[`orders/${params.orderId}/createdAt`] = nowIso;
  }

  if (ownerUid) {
    updates[`orders/${params.orderId}/ownerUid`] = ownerUid;
    updates[`userOrders/${ownerUid}/${params.orderId}`] = params.decision;
  }

  if (invitationId) {
    updates[`invitations/${invitationId}/status`] = params.decision;
    updates[`invitations/${invitationId}/paymentStatus`] = params.decision;
    updates[`invitations/${invitationId}/orderId`] = params.orderId;
    updates[`invitations/${invitationId}/updatedAt`] = nowIso;
    updates[`invitations/${invitationId}/decidedAt`] = nowIso;
    updates[`invitations/${invitationId}/rejectReason`] = resolvedReason;
    if (ownerUid) {
      updates[`invitations/${invitationId}/ownerUid`] = ownerUid;
      if (!invRecord?.ownerId || invRecord.ownerId === 'anonymous') {
        updates[`invitations/${invitationId}/ownerId`] = ownerUid;
      }
    }
    const cleanSlug = (order?.invitationSlug || invRecord?.slug || '').toString().toLowerCase().trim();
    if (cleanSlug) {
      updates[`slugs/${cleanSlug}`] = invitationId;
    }
  }

  await getRtdb().ref().update(updates);

  const updatedOrder: ServerOrder = {
    ...(order || {
      id: params.orderId,
      orderId: params.orderId,
      customerName: 'Mijoz',
      customerPhone: '',
      price: 0,
      createdAt: nowIso,
    }),
    ownerUid: ownerUid || order?.ownerUid,
    status: params.decision,
    updatedAt: nowIso,
    decidedAt: nowIso,
    reviewedAt: nowIso,
    decidedBy: params.adminName,
    rejectReason: resolvedReason ?? undefined,
  };

  return {
    alreadyDecided: false,
    order: updatedOrder,
  };
}

/**
 * Verifies that the authenticated user owns the requested order.
 * Supports legacy orders missing ownerUid by falling back to invitations/{id}.ownerId
 * and lazily backfilling ownerUid + userOrders/{uid}/{orderId}.
 */
export async function getAuthorizedOrderForUser(
  orderId: string,
  verifiedUid: string
): Promise<{ statusCode: 200; order: ServerOrder } | { statusCode: 403 | 404; error: string }> {
  const order = await getOrder(orderId);
  if (!order) {
    return { statusCode: 404, error: 'Buyurtma topilmadi.' };
  }

  if (order.ownerUid) {
    if (order.ownerUid !== verifiedUid) {
      return { statusCode: 403, error: "Ushbu buyurtmaga kirish ruxsati yo'q." };
    }
    return { statusCode: 200, order };
  }

  // Legacy order fallback: check linked invitation owner
  if (order.invitationId) {
    const inv = await getInvitationRecord(order.invitationId);
    const invOwner = inv?.ownerUid || inv?.ownerId;
    if (invOwner && invOwner === verifiedUid) {
      // Backfill ownerUid & userOrders index atomically for seamless future realtime listeners
      try {
        await getRtdb().ref().update({
          [`orders/${orderId}/ownerUid`]: verifiedUid,
          [`userOrders/${verifiedUid}/${orderId}`]: order.status || 'pending_review',
          [`invitations/${order.invitationId}/ownerUid`]: verifiedUid,
        });
      } catch {
        // non-fatal backfill
      }
      return {
        statusCode: 200,
        order: { ...order, ownerUid: verifiedUid },
      };
    }
  }

  return { statusCode: 403, error: "Ushbu buyurtmaga kirish ruxsati yo'q." };
}
