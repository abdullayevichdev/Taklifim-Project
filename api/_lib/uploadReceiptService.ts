import crypto from 'node:crypto';
import {
  commitOrderPendingReview,
  getReceiptAttempt,
  hasFirebaseAdmin,
  markTelegramAttemptDispatched,
  seedPreflightOrderRecord,
  validateOrderBeforeReceipt,
  type ReceiptAttemptRecord,
  type ServerOrder,
} from './firebaseAdmin.js';
import { sendReceiptToTelegram } from './telegram.js';
import { checkRateLimit } from './rateLimit.js';

export interface UploadReceiptCommand {
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
  isPdf: boolean;
  fileName?: string;
  fileType?: string;
  fileBuffer?: Buffer;
  fileUrl?: string;
  clientIp?: string;
  idempotencyKey?: string;
}

export interface UploadReceiptResponse {
  statusCode: number;
  body: {
    success: boolean;
    orderId?: string;
    status?: string;
    receiptSentAt?: string;
    updatedAt?: string;
    deduplicated?: boolean;
    recovered?: boolean;
    retryable?: boolean;
    message?: string;
    error?: string;
  };
}

export interface UploadReceiptDeps {
  hasFirebaseAdmin: typeof hasFirebaseAdmin;
  validateOrderBeforeReceipt: typeof validateOrderBeforeReceipt;
  getReceiptAttempt: typeof getReceiptAttempt;
  seedPreflightOrderRecord: typeof seedPreflightOrderRecord;
  sendReceiptToTelegram: typeof sendReceiptToTelegram;
  markTelegramAttemptDispatched: typeof markTelegramAttemptDispatched;
  commitOrderPendingReview: typeof commitOrderPendingReview;
  checkRateLimit: typeof checkRateLimit;
  now?: () => Date;
}

const defaultDeps: UploadReceiptDeps = {
  hasFirebaseAdmin,
  validateOrderBeforeReceipt,
  getReceiptAttempt,
  seedPreflightOrderRecord,
  sendReceiptToTelegram,
  markTelegramAttemptDispatched,
  commitOrderPendingReview,
  checkRateLimit,
};

const inFlightSubmissions = new Map<string, Promise<UploadReceiptResponse>>();
const dispatchedMemoryFallback = new Map<
  string,
  { messageId?: number; dispatchedAt: number }
>();

export function computeReceiptIdempotencyKey(params: {
  verifiedUid: string;
  orderId: string;
  customerPhone: string;
  isPdf: boolean;
  fileBuffer?: Buffer;
  fileUrl?: string;
  existingOrder?: ServerOrder | null;
  clientIdempotencyKey?: string;
}): string {
  const cleanClientKey = params.clientIdempotencyKey
    ? String(params.clientIdempotencyKey).trim().replace(/[^a-zA-Z0-9_-]/g, '')
    : '';
  if (cleanClientKey.length >= 8 && cleanClientKey.length <= 64) {
    return crypto
      .createHash('sha256')
      .update(`${params.verifiedUid}|${params.orderId}|${cleanClientKey}`)
      .digest('hex')
      .slice(0, 40);
  }

  const fileFingerprint = params.fileBuffer
    ? crypto.createHash('sha256').update(params.fileBuffer).digest('hex')
    : String(params.fileUrl || '');

  // If the order was previously rejected, epoch includes rejection timestamp so the user
  // can legitimately re-upload even if they pick the same file again.
  const epoch =
    params.existingOrder?.status === 'rejected'
      ? String(
          params.existingOrder.decidedAt ||
            params.existingOrder.reviewedAt ||
            params.existingOrder.updatedAt ||
            'rejected'
        )
      : 'active';

  return crypto
    .createHash('sha256')
    .update(
      `${params.verifiedUid}|${params.orderId}|${params.customerPhone}|${
        params.isPdf ? 'pdf' : 'img'
      }|${fileFingerprint}|${epoch}`
    )
    .digest('hex')
    .slice(0, 40);
}

function rememberMemoryDispatch(key: string, messageId?: number): void {
  dispatchedMemoryFallback.set(key, { messageId, dispatchedAt: Date.now() });
  // Bound map size in long-lived instances
  if (dispatchedMemoryFallback.size > 500) {
    const oldestKey = dispatchedMemoryFallback.keys().next().value;
    if (oldestKey) dispatchedMemoryFallback.delete(oldestKey);
  }
}

export async function processUploadReceipt(
  cmd: UploadReceiptCommand,
  deps: UploadReceiptDeps = defaultDeps
): Promise<UploadReceiptResponse> {
  const lockKey = `${cmd.verifiedUid}:${cmd.orderId}`;
  const existingInFlight = inFlightSubmissions.get(lockKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const runPromise = (async (): Promise<UploadReceiptResponse> => {
    try {
      if (!deps.hasFirebaseAdmin()) {
        return {
          statusCode: 500,
          body: {
            success: false,
            error:
              "Server Firebase Admin sozlamalari to'liq emas. Iltimos administratorga murojaat qiling.",
          },
        };
      }

      // 1. Validate order & invitation ownership BEFORE any side effect
      const preCheck = await deps.validateOrderBeforeReceipt({
        verifiedUid: cmd.verifiedUid,
        orderId: cmd.orderId,
        invitationId: cmd.invitationId,
      });

      if (preCheck.ok === false) {
        return {
          statusCode: preCheck.statusCode,
          body: { success: false, error: preCheck.error },
        };
      }

      const { existingOrder, existingInv } = preCheck;
      const attemptKey = computeReceiptIdempotencyKey({
        verifiedUid: cmd.verifiedUid,
        orderId: cmd.orderId,
        customerPhone: cmd.customerPhone,
        isPdf: cmd.isPdf,
        fileBuffer: cmd.fileBuffer,
        fileUrl: cmd.fileUrl,
        existingOrder,
        clientIdempotencyKey: cmd.idempotencyKey,
      });

      let attemptRecord: ReceiptAttemptRecord | null = null;
      try {
        const rawAttempt = await deps.getReceiptAttempt(attemptKey);
        if (rawAttempt && rawAttempt.updatedAt) {
          const ageMs = Date.now() - new Date(rawAttempt.updatedAt).getTime();
          if (ageMs <= 24 * 60 * 60 * 1000) {
            attemptRecord = rawAttempt;
          }
        } else if (rawAttempt) {
          attemptRecord = rawAttempt;
        }
      } catch {
        attemptRecord = null;
      }

      const orderDispatched = (existingOrder as any)?.dispatchedAttempt as
        | { key?: string; telegramSent?: boolean; messageId?: number }
        | undefined;
      const memDispatched = dispatchedMemoryFallback.get(attemptKey);

      // 2a. Idempotent replay when receipt was already committed as pending_review
      if (existingOrder?.status === 'pending_review') {
        const isSameReceipt =
          existingOrder.lastIdempotencyKey === attemptKey ||
          attemptRecord?.committed === true;

        if (isSameReceipt) {
          return {
            statusCode: 200,
            body: {
              success: true,
              deduplicated: true,
              orderId: existingOrder.orderId || existingOrder.id || cmd.orderId,
              status: 'pending_review',
              receiptSentAt:
                existingOrder.receiptSentAt ||
                (existingOrder.submittedAt ? String(existingOrder.submittedAt) : undefined),
              updatedAt: existingOrder.updatedAt,
              message: "Chekingiz adminga yuborildi, tasdiqlanishini kuting.",
            },
          };
        }

        return {
          statusCode: 409,
          body: {
            success: false,
            orderId: existingOrder.orderId || existingOrder.id || cmd.orderId,
            status: 'pending_review',
            error:
              "Chekingiz allaqachon admin tekshiruvida. Javob chiqqach qayta yuborishingiz mumkin.",
          },
        };
      }

      if (
        cmd.idempotencyKey &&
        attemptRecord?.committed === true &&
        attemptRecord.ownerUid === cmd.verifiedUid &&
        attemptRecord.orderId === cmd.orderId
      ) {
        return {
          statusCode: 409,
          body: {
            success: false,
            deduplicated: true,
            orderId: existingOrder?.orderId || existingOrder?.id || cmd.orderId,
            status: existingOrder?.status || 'rejected',
            error: "Ushbu so'rov allaqachon qayta ishlangan.",
          },
        };
      }

      // 2b. Partial-failure recovery check: Telegram already sent on a previous failed DB commit
      const alreadyDispatchedViaDb =
        Boolean(attemptRecord?.telegramSent && !attemptRecord.committed) ||
        Boolean(
          orderDispatched?.key === attemptKey && orderDispatched?.telegramSent
        );
      const alreadyDispatchedViaMem =
        Boolean(memDispatched) &&
        Date.now() - (memDispatched?.dispatchedAt || 0) < 30 * 60 * 1000;

      const telegramAlreadySent =
        alreadyDispatchedViaDb || alreadyDispatchedViaMem;
      let telegramMessageId: number | undefined =
        attemptRecord?.telegramMessageId ||
        orderDispatched?.messageId ||
        memDispatched?.messageId;

      // Rate-limit only fresh submissions (never block recovery retries for already-dispatched receipts)
      if (!telegramAlreadySent) {
        const rateKey = `${cmd.clientIp || 'unknown'}_${cmd.verifiedUid}_${
          cmd.customerPhone
        }`;
        if (!deps.checkRateLimit(rateKey)) {
          return {
            statusCode: 429,
            body: {
              success: false,
              error:
                "Juda ko'p so'rov yuborildi. Iltimos, 10 soniya kutib qayta urinib ko'ring.",
            },
          };
        }
      }

      const nowIso = (deps.now ? deps.now() : new Date()).toISOString();
      const safePrice =
        Number(cmd.price) || Number(existingOrder?.price) || 180000;
      const safeCustomerName = cmd.customerName
        ? String(cmd.customerName)
        : existingOrder?.customerName || 'Mijoz';
      const safeTemplateName = cmd.templateName
        ? String(cmd.templateName)
        : existingOrder?.templateName || 'Standart Shablon';
      const safeWeddingDate = cmd.weddingDate
        ? String(cmd.weddingDate)
        : existingOrder?.weddingDate || '-';
      const safeVenueName = cmd.venueName
        ? String(cmd.venueName)
        : existingOrder?.venueName || '-';
      const resolvedFileUrl = cmd.fileUrl
        ? String(cmd.fileUrl)
        : existingOrder?.receiptUrl;

      // 3. If Telegram wasn't already sent for this receipt attempt:
      //    Seed pre-flight order & invitation linkage BEFORE Telegram so an order is never orphaned.
      if (!telegramAlreadySent) {
        try {
          await deps.seedPreflightOrderRecord({
            verifiedUid: cmd.verifiedUid,
            orderId: cmd.orderId,
            invitationId: cmd.invitationId,
            invitationSlug: cmd.invitationSlug,
            customerName: safeCustomerName,
            customerPhone: cmd.customerPhone,
            templateName: safeTemplateName,
            planName: cmd.planName,
            weddingDate: safeWeddingDate,
            venueName: safeVenueName,
            price: safePrice,
            receiptUrl: resolvedFileUrl,
            existingOrder,
            existingInv,
            nowIso,
          });
        } catch (preflightErr: any) {
          console.error('Upload receipt pre-flight RTDB error:', preflightErr);
          return {
            statusCode: 503,
            body: {
              success: false,
              retryable: true,
              error:
                "Ma'lumotlar bazasiga ulanishda vaqtinchalik xatolik. Iltimos qayta urinib ko'ring.",
            },
          };
        }

        const tgResult = await deps.sendReceiptToTelegram({
          orderId: cmd.orderId,
          customerName: safeCustomerName,
          customerPhone: cmd.customerPhone,
          templateName: safeTemplateName,
          weddingDate: safeWeddingDate,
          venueName: safeVenueName,
          price: safePrice,
          isPdf: cmd.isPdf,
          fileName: cmd.fileName,
          fileType: cmd.fileType,
          fileBuffer: cmd.fileBuffer,
          fileUrl: resolvedFileUrl,
        });

        if (!tgResult.ok) {
          return {
            statusCode: 502,
            body: {
              success: false,
              retryable: true,
              error: tgResult.error || 'Telegram xatosi',
            },
          };
        }

        telegramMessageId = tgResult.messageId;
        rememberMemoryDispatch(attemptKey, telegramMessageId);
      }

      // 4. Atomically commit pending_review across orders, userOrders, invitations, slugs, receiptAttempts
      try {
        const commitRes = await deps.commitOrderPendingReview({
          verifiedUid: cmd.verifiedUid,
          orderId: cmd.orderId,
          invitationId: cmd.invitationId,
          invitationSlug: cmd.invitationSlug,
          customerName: safeCustomerName,
          customerPhone: cmd.customerPhone,
          templateName: safeTemplateName,
          planName: cmd.planName,
          weddingDate: safeWeddingDate,
          venueName: safeVenueName,
          price: safePrice,
          receiptUrl: resolvedFileUrl,
          receiptType: cmd.isPdf ? 'document' : 'photo',
          telegramMessageId,
          idempotencyKey: attemptKey,
          nowIso,
        });

        if (commitRes.ok === false) {
          return {
            statusCode: commitRes.statusCode,
            body: {
              success: false,
              error: commitRes.error,
            },
          };
        }

        const { orderData } = commitRes;
        return {
          statusCode: 200,
          body: {
            success: true,
            recovered: telegramAlreadySent || undefined,
            orderId: orderData.orderId || orderData.id,
            status: orderData.status,
            receiptSentAt: orderData.receiptSentAt,
            updatedAt: orderData.updatedAt,
            message: "Chekingiz adminga yuborildi, tasdiqlanishini kuting.",
          },
        };
      } catch (commitErr: any) {
        console.error('Upload receipt commitOrderPendingReview failed after Telegram:', {
          orderId: cmd.orderId,
          attemptKey,
          telegramMessageId,
          error: commitErr?.message || commitErr,
        });

        // Best-effort durable dispatch record so any subsequent retry skips Telegram
        try {
          await deps.markTelegramAttemptDispatched({
            attemptKey,
            orderId: cmd.orderId,
            verifiedUid: cmd.verifiedUid,
            telegramMessageId,
            nowIso,
          });
        } catch {
          // memory fallback already armed
        }

        return {
          statusCode: 503,
          body: {
            success: false,
            retryable: true,
            error:
              "Chekingiz adminga yuborildi, lekin holatni saqlashda vaqtinchalik uzilish yuz berdi. Iltimos qayta urinib ko'ring — chek qayta yuborilmaydi.",
          },
        };
      }
    } catch (err: any) {
      console.error('Upload receipt service error:', {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
      });
      return {
        statusCode: 500,
        body: {
          success: false,
          error: 'Serverda xatolik yuz berdi: ' + (err?.message || "Noma'lum xatolik"),
        },
      };
    }
  })();

  inFlightSubmissions.set(lockKey, runPromise);
  try {
    return await runPromise;
  } finally {
    if (inFlightSubmissions.get(lockKey) === runPromise) {
      inFlightSubmissions.delete(lockKey);
    }
  }
}
