import { cert, getApps, getApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { cleanEnvString, cleanPrivateKey, getFirebaseDatabaseUrl } from './env.js';
import {
  enrichOrderWithLegacyTemplate,
  resolveServerOrderTemplate,
} from '../../src/utils/templateResolver.js';

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
  templateId?: string;
  templateSlug?: string;
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
  lastIdempotencyKey?: string;
  receiptSentAt?: string;
  submittedAt?: string;
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

function sanitizeRtdbKeySegment(raw?: string): string {
  if (!raw) return '';
  return String(raw)
    .trim()
    .replace(/[.#$\[\]/\\]+/g, '-');
}

function parseServiceAccount(): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  const jsonRaw = cleanEnvString(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (jsonRaw) {
    const candidates = [
      jsonRaw,
      // Recover if newlines inside JSON string were pasted literally without escaping
      jsonRaw.replace(/\r?\n/g, '\\n'),
    ];
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as {
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
      } catch {
        // try next candidate
      }
    }
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON parse error: invalid JSON or missing project_id/client_email/private_key');
  }

  const projectId = cleanEnvString(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = cleanEnvString(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function hasFirebaseAdmin(): boolean {
  return getAdminApp() !== null;
}

export function getAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    console.warn('[INVITE] Firebase Admin credentials missing; server-side database sync running in memory/mock fallback mode.');
    return null;
  }

  try {
    return initializeApp({
      credential: cert(serviceAccount),
      databaseURL: getFirebaseDatabaseUrl(),
    });
  } catch (err) {
    console.error('[INVITE] Firebase Admin initializeApp failed:', (err as Error)?.message || err);
    return null;
  }
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

export interface ReceiptAttemptRecord {
  key: string;
  orderId: string;
  ownerUid: string;
  telegramSent: boolean;
  telegramMessageId?: number;
  committed: boolean;
  updatedAt: string;
}

async function retryRtdbOperation<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 180));
      }
    }
  }
  throw lastErr;
}

export async function getOrder(orderId: string): Promise<ServerOrder | null> {
  const snap = await getRtdb().ref(`orders/${orderId}`).get();
  if (!snap.exists()) return null;
  const data = snap.val() as ServerOrder;
  return enrichOrderWithLegacyTemplate({
    ...data,
    id: data.id || orderId,
    orderId: data.orderId || data.id || orderId,
  });
}

export async function getInvitationRecord(
  invitationId: string
): Promise<Record<string, any> | null> {
  if (!invitationId) return null;
  const snap = await getRtdb().ref(`invitations/${invitationId}`).get();
  if (!snap.exists()) return null;
  return snap.val() as Record<string, any>;
}

export async function getReceiptAttempt(
  attemptKey: string
): Promise<ReceiptAttemptRecord | null> {
  const safeKey = sanitizeRtdbKeySegment(attemptKey);
  if (!safeKey) return null;
  const snap = await getRtdb().ref(`receiptAttempts/${safeKey}`).get();
  if (!snap.exists()) return null;
  return snap.val() as ReceiptAttemptRecord;
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
 * Pre-validates order & invitation ownership and paid state BEFORE sending receipt to Telegram,
 * preventing failed uploads or unauthorized callers from triggering admin messages.
 */
export async function validateOrderBeforeReceipt(params: {
  verifiedUid: string;
  orderId: string;
  invitationId?: string;
}): Promise<
  | { ok: true; existingOrder: ServerOrder | null; existingInv: Record<string, any> | null }
  | { ok: false; statusCode: number; error: string }
> {
  const safeOrderId = sanitizeRtdbKeySegment(params.orderId);
  if (!safeOrderId) {
    return { ok: false, statusCode: 400, error: "Buyurtma raqami noto'g'ri." };
  }

  const existingOrder = await getOrder(safeOrderId);

  if (existingOrder?.ownerUid && existingOrder.ownerUid !== params.verifiedUid) {
    return {
      ok: false,
      statusCode: 403,
      error: "Bu buyurtma boshqa foydalanuvchiga tegishli.",
    };
  }

  if (existingOrder?.status === 'paid') {
    return {
      ok: false,
      statusCode: 400,
      error: "Ushbu buyurtma allaqachon tasdiqlangan.",
    };
  }

  const finalInvId = sanitizeRtdbKeySegment(params.invitationId || existingOrder?.invitationId);
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

  return { ok: true, existingOrder, existingInv };
}

/**
 * Seeds pre-flight order & invitation linkage BEFORE calling Telegram so an order
 * is never orphaned if Telegram succeeds and subsequent DB commit retries hit an outage.
 * Never sets pending_review prematurely.
 */
export async function seedPreflightOrderRecord(params: {
  verifiedUid: string;
  orderId: string;
  invitationId?: string;
  invitationSlug?: string;
  templateId?: string;
  templateSlug?: string;
  customerName: string;
  customerPhone: string;
  templateName: string;
  planName?: string;
  weddingDate: string;
  venueName: string;
  price: number;
  receiptUrl?: string;
  existingOrder: ServerOrder | null;
  existingInv: Record<string, any> | null;
  nowIso: string;
}): Promise<void> {
  const safeOrderId = sanitizeRtdbKeySegment(params.orderId);
  const finalInvId = sanitizeRtdbKeySegment(params.invitationId || params.existingOrder?.invitationId);
  const rawSlug = params.invitationSlug || params.existingOrder?.invitationSlug || params.existingInv?.slug || '';
  const cleanSlug = String(rawSlug)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const resolvedTemplate = resolveServerOrderTemplate({
    templateSlug: params.templateSlug,
    templateId: params.templateId,
    existingOrder: params.existingOrder,
    existingInv: params.existingInv,
  });
  if (!resolvedTemplate) {
    throw new Error('TEMPLATE_NOT_RESOLVED: Shablon identifikatori (templateSlug) topilmadi.');
  }

  const preservedStatus: OrderStatus =
    params.existingOrder?.status === 'rejected'
      ? 'rejected'
      : params.existingOrder?.status === 'pending_review'
      ? 'pending_review'
      : 'pending_payment';

  const parsedPrice = Number(params.price);
  const existingPrice = Number(params.existingOrder?.price);
  const safePrice =
    Number.isFinite(parsedPrice) && parsedPrice > 0
      ? parsedPrice
      : Number.isFinite(existingPrice) && existingPrice > 0
      ? existingPrice
      : 180000;

  const updates: Record<string, unknown> = {
    [`orders/${safeOrderId}`]: stripUndefined({
      ...(params.existingOrder || {}),
      id: safeOrderId,
      orderId: safeOrderId,
      orderNumber: params.existingOrder?.orderNumber || safeOrderId.replace(/^ORD-/, 'TK-'),
      ownerUid: params.verifiedUid,
      invitationId: finalInvId || undefined,
      invitationSlug: cleanSlug || undefined,
      templateId: resolvedTemplate.templateId,
      templateSlug: resolvedTemplate.templateSlug,
      customerName: params.customerName || params.existingOrder?.customerName || 'Mijoz',
      customerPhone: params.customerPhone,
      templateName: params.templateName || params.existingOrder?.templateName || resolvedTemplate.templateName,
      planName: params.planName || params.existingOrder?.planName,
      weddingDate: params.weddingDate || params.existingOrder?.weddingDate || '-',
      venueName: params.venueName || params.existingOrder?.venueName || '-',
      price: safePrice,
      status: preservedStatus,
      receiptUrl: params.receiptUrl || params.existingOrder?.receiptUrl,
      createdAt: params.existingOrder?.createdAt || params.nowIso,
      updatedAt: params.nowIso,
    }),
    [`userOrders/${params.verifiedUid}/${safeOrderId}`]: preservedStatus,
  };

  if (finalInvId) {
    if (!params.existingInv) {
      updates[`invitations/${finalInvId}/id`] = finalInvId;
      if (cleanSlug) updates[`invitations/${finalInvId}/slug`] = cleanSlug;
      updates[`invitations/${finalInvId}/hostNames`] = params.customerName || 'Mijoz';
      updates[`invitations/${finalInvId}/eventTitle`] = params.customerName || 'Taklifnoma';
      updates[`invitations/${finalInvId}/eventType`] = 'To‘y va Nikoh Oqshomi';
      updates[`invitations/${finalInvId}/eventDate`] = params.weddingDate || '';
      updates[`invitations/${finalInvId}/venueName`] = params.venueName || '';
      updates[`invitations/${finalInvId}/templateId`] = resolvedTemplate.templateId;
      updates[`invitations/${finalInvId}/templateSlug`] = resolvedTemplate.templateSlug;
      updates[`invitations/${finalInvId}/status`] = preservedStatus;
      updates[`invitations/${finalInvId}/paymentStatus`] = preservedStatus;
      updates[`invitations/${finalInvId}/createdAt`] = params.nowIso;
    } else if (!params.existingInv.templateSlug) {
      updates[`invitations/${finalInvId}/templateId`] = resolvedTemplate.templateId;
      updates[`invitations/${finalInvId}/templateSlug`] = resolvedTemplate.templateSlug;
    }
    updates[`invitations/${finalInvId}/orderId`] = safeOrderId;
    updates[`invitations/${finalInvId}/ownerUid`] = params.verifiedUid;
    if (!params.existingInv?.ownerId || params.existingInv.ownerId === 'anonymous') {
      updates[`invitations/${finalInvId}/ownerId`] = params.verifiedUid;
    }
    updates[`invitations/${finalInvId}/updatedAt`] = params.nowIso;
    if (cleanSlug) {
      updates[`slugs/${cleanSlug}`] = finalInvId;
    }
  }

  await retryRtdbOperation(() => getRtdb().ref().update(updates), 2);
}

export async function markTelegramAttemptDispatched(params: {
  attemptKey: string;
  orderId: string;
  verifiedUid: string;
  telegramMessageId?: number;
  nowIso: string;
}): Promise<void> {
  const safeAttemptKey = sanitizeRtdbKeySegment(params.attemptKey);
  const safeOrderId = sanitizeRtdbKeySegment(params.orderId);
  if (!safeAttemptKey || !safeOrderId) return;

  const updates: Record<string, unknown> = {
    [`receiptAttempts/${safeAttemptKey}`]: stripUndefined({
      key: safeAttemptKey,
      orderId: safeOrderId,
      ownerUid: params.verifiedUid,
      telegramSent: true,
      telegramMessageId: params.telegramMessageId,
      committed: false,
      updatedAt: params.nowIso,
    }),
    [`orders/${safeOrderId}/dispatchedAttempt`]: stripUndefined({
      key: safeAttemptKey,
      telegramSent: true,
      messageId: params.telegramMessageId,
      updatedAt: params.nowIso,
    }),
  };

  await retryRtdbOperation(() => getRtdb().ref().update(updates), 2);
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
  templateId?: string;
  templateSlug?: string;
  customerName: string;
  customerPhone: string;
  templateName: string;
  planName?: string;
  weddingDate: string;
  venueName: string;
  price: number;
  receiptUrl?: string;
  receiptType?: 'photo' | 'document';
  telegramMessageId?: number;
  idempotencyKey?: string;
  nowIso: string;
}): Promise<{ ok: true; orderData: ServerOrder } | { ok: false; statusCode: number; error: string }> {
  const safeOrderId = sanitizeRtdbKeySegment(params.orderId);
  const safeInvIdParam = sanitizeRtdbKeySegment(params.invitationId);
  const safeAttemptKey = sanitizeRtdbKeySegment(params.idempotencyKey);

  const preCheck = await validateOrderBeforeReceipt({
    verifiedUid: params.verifiedUid,
    orderId: safeOrderId,
    invitationId: safeInvIdParam,
  });

  if (preCheck.ok === false) {
    return preCheck;
  }

  const { existingOrder: existing, existingInv } = preCheck;

  const resolvedTemplate = resolveServerOrderTemplate({
    templateSlug: params.templateSlug,
    templateId: params.templateId,
    existingOrder: existing,
    existingInv,
  });
  if (!resolvedTemplate) {
    return {
      ok: false,
      statusCode: 400,
      error: "Shablon identifikatori (templateSlug) topilmadi. Buyurtma to'xtatildi.",
    };
  }

  const finalInvId = sanitizeRtdbKeySegment(safeInvIdParam || existing?.invitationId);
  const rawSlug = params.invitationSlug || existing?.invitationSlug || existingInv?.slug || '';
  const cleanSlug = String(rawSlug)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const finalReceiptUrl = params.receiptUrl || existing?.receiptUrl;

  const parsedPrice = Number(params.price);
  const existingPrice = Number(existing?.price);
  const safePrice =
    Number.isFinite(parsedPrice) && parsedPrice > 0
      ? parsedPrice
      : Number.isFinite(existingPrice) && existingPrice > 0
      ? existingPrice
      : 180000;

  const orderData = stripUndefined({
    ...(existing || {}),
    id: safeOrderId,
    orderId: safeOrderId,
    orderNumber: existing?.orderNumber || safeOrderId.replace(/^ORD-/, 'TK-'),
    ownerUid: params.verifiedUid,
    invitationId: finalInvId || undefined,
    invitationSlug: cleanSlug || undefined,
    templateId: resolvedTemplate.templateId,
    templateSlug: resolvedTemplate.templateSlug,
    customerName: params.customerName || existing?.customerName || 'Mijoz',
    customerPhone: params.customerPhone,
    templateName: params.templateName || existing?.templateName || resolvedTemplate.templateName,
    planName: params.planName || existing?.planName,
    weddingDate: params.weddingDate || existing?.weddingDate || '-',
    venueName: params.venueName || existing?.venueName || '-',
    price: safePrice,
    status: 'pending_review',
    receiptUrl: finalReceiptUrl,
    receiptType: params.receiptType || existing?.receiptType,
    telegramMessageId: params.telegramMessageId || existing?.telegramMessageId,
    lastIdempotencyKey: safeAttemptKey || existing?.lastIdempotencyKey,
    receiptSentAt: params.nowIso,
    submittedAt: params.nowIso,
    createdAt: existing?.createdAt || params.nowIso,
    updatedAt: params.nowIso,
  }) as ServerOrder;

  // Clear previous rejection reason and temporary dispatch lock if re-uploading
  delete orderData.rejectReason;
  delete orderData.dispatchedAttempt;

  const updates: Record<string, unknown> = {
    [`orders/${safeOrderId}`]: {
      ...orderData,
      rejectReason: null,
      dispatchedAttempt: null,
    },
    [`userOrders/${params.verifiedUid}/${safeOrderId}`]: 'pending_review',
  };

  if (safeAttemptKey) {
    updates[`receiptAttempts/${safeAttemptKey}`] = stripUndefined({
      key: safeAttemptKey,
      orderId: safeOrderId,
      ownerUid: params.verifiedUid,
      telegramSent: true,
      telegramMessageId: params.telegramMessageId || existing?.telegramMessageId,
      committed: true,
      updatedAt: params.nowIso,
    });
  }

  if (finalInvId) {
    if (!existingInv) {
      // Seed minimal invitation record if client RTDB save had not happened yet
      updates[`invitations/${finalInvId}/id`] = finalInvId;
      if (cleanSlug) updates[`invitations/${finalInvId}/slug`] = cleanSlug;
      updates[`invitations/${finalInvId}/hostNames`] = params.customerName || 'Mijoz';
      updates[`invitations/${finalInvId}/eventTitle`] = params.customerName || 'Taklifnoma';
      updates[`invitations/${finalInvId}/eventType`] = 'To‘y va Nikoh Oqshomi';
      updates[`invitations/${finalInvId}/eventDate`] = params.weddingDate || '';
      updates[`invitations/${finalInvId}/venueName`] = params.venueName || '';
      updates[`invitations/${finalInvId}/templateId`] = resolvedTemplate.templateId;
      updates[`invitations/${finalInvId}/templateSlug`] = resolvedTemplate.templateSlug;
      updates[`invitations/${finalInvId}/createdAt`] = params.nowIso;
    } else if (!existingInv.templateSlug) {
      updates[`invitations/${finalInvId}/templateId`] = resolvedTemplate.templateId;
      updates[`invitations/${finalInvId}/templateSlug`] = resolvedTemplate.templateSlug;
    }

    updates[`invitations/${finalInvId}/status`] = 'pending_review';
    updates[`invitations/${finalInvId}/paymentStatus`] = 'pending_review';
    updates[`invitations/${finalInvId}/orderId`] = safeOrderId;
    updates[`invitations/${finalInvId}/ownerUid`] = params.verifiedUid;
    if (!existingInv?.ownerId || existingInv.ownerId === 'anonymous') {
      updates[`invitations/${finalInvId}/ownerId`] = params.verifiedUid;
    }
    updates[`invitations/${finalInvId}/receiptSentAt`] = params.nowIso;
    updates[`invitations/${finalInvId}/updatedAt`] = params.nowIso;
    updates[`invitations/${finalInvId}/rejectReason`] = null;

    if (cleanSlug) {
      updates[`slugs/${cleanSlug}`] = finalInvId;
    }
  }

  await retryRtdbOperation(() => getRtdb().ref().update(updates), 3);

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
    [`orders/${params.orderId}/dispatchedAttempt`]: null,
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
