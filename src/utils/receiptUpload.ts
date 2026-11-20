import { OrderItem } from '../types';

export const RECEIPT_UPLOAD_TIMEOUT_MS = 45_000;
export const RECEIPT_RETRY_DELAYS_MS = [2000, 5000] as const;

export interface UploadReceiptPayload {
  orderId: string;
  invitationId?: string;
  invitationSlug?: string;
  customerName: string;
  customerPhone?: string;
  templateId?: string;
  templateSlug?: string;
  templateName?: string;
  planName?: string;
  weddingDate?: string;
  venueName?: string;
  price: number;
  fileName: string;
  fileType: string;
  fileBase64?: string;
  fileUrl?: string;
  idempotencyKey?: string;
}

export interface UploadReceiptResult {
  success: boolean;
  ok?: boolean;
  orderId: string;
  status: OrderItem['status'];
  receiptSentAt?: string;
  updatedAt?: string;
  deduplicated?: boolean;
  recovered?: boolean;
  message?: string;
  error?: string;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  statusCode?: number;
  idempotencyKey?: string;
}

export function generateIdempotencyKey(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    // ignore fallback
  }
  const ts = Date.now().toString(16);
  const rand = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
  return `${ts}-4000-8000-${rand}`.slice(0, 36);
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 502 || status === 503 || status === 504;
}

export function isNetworkOrTimeoutError(err: unknown): {
  isNetwork: boolean;
  isTimeout: boolean;
} {
  if (!err || typeof err !== 'object') {
    return { isNetwork: false, isTimeout: false };
  }
  const e = err as { name?: string; message?: string; code?: string };
  const name = String(e.name || '');
  const msg = String(e.message || '').toLowerCase();
  const code = String(e.code || '').toUpperCase();

  const isTimeout =
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    code === 'ETIMEDOUT' ||
    code === 'ERR_CONNECTION_TIMED_OUT' ||
    msg.includes('aborted') ||
    msg.includes('timeout') ||
    msg.includes('timed out');

  const isNetwork =
    isTimeout ||
    name === 'TypeError' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('connection');

  return { isNetwork, isTimeout };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface UploadTransportDeps {
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  retryDelaysMs?: readonly number[];
  onAttempt?: (attempt: number, maxAttempts: number) => void;
}

export async function uploadReceiptWithRetry(
  payload: UploadReceiptPayload,
  getHeaders: () => Promise<Record<string, string>>,
  deps: UploadTransportDeps = {}
): Promise<UploadReceiptResult> {
  const fetchFn = deps.fetchFn || fetch;
  const sleepFn = deps.sleepFn || defaultSleep;
  const timeoutMs = deps.timeoutMs ?? RECEIPT_UPLOAD_TIMEOUT_MS;
  const retryDelaysMs = deps.retryDelaysMs ?? RECEIPT_RETRY_DELAYS_MS;
  const maxAttempts = 1 + retryDelaysMs.length;

  const idempotencyKey =
    payload.idempotencyKey && payload.idempotencyKey.trim().length >= 8
      ? payload.idempotencyKey.trim()
      : generateIdempotencyKey();

  const bodyWithKey = JSON.stringify({
    ...payload,
    idempotencyKey,
  });

  const authHeaders = await getHeaders();
  if (!authHeaders.Authorization) {
    return {
      success: false,
      orderId: payload.orderId,
      status: 'pending_payment',
      statusCode: 401,
      isNetworkError: false,
      idempotencyKey,
      error:
        "Chek yuborish uchun Telegram orqali hisobingizga kirilgan bo'lishi kerak.",
    };
  }

  let lastWasTimeout = false;
  let lastErrorMsg = '';
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    deps.onAttempt?.(attempt + 1, maxAttempts);

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchFn('/api/payment/upload-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          ...authHeaders,
        },
        body: bodyWithKey,
        signal: controller.signal,
      });

      const data = await res.json().catch(() => null);
      const isOk = Boolean(res.ok && (data?.success === true || data?.ok === true));

      if (isOk) {
        return {
          ...(data || {}),
          success: true,
          orderId: data?.orderId || payload.orderId,
          status: (data?.status as OrderItem['status']) || 'pending_review',
          idempotencyKey,
        };
      }

      lastStatusCode = res.status;
      lastErrorMsg =
        data?.error ||
        (res.status >= 500
          ? `Server xatosi (${res.status})`
          : "Chek yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");

      if (!isRetryableHttpStatus(res.status)) {
        return {
          success: false,
          orderId: payload.orderId,
          status: 'pending_payment',
          statusCode: res.status,
          isNetworkError: false,
          idempotencyKey,
          error: lastErrorMsg,
        };
      }

      if (res.status === 408 || res.status === 504) {
        lastWasTimeout = true;
      }
    } catch (err) {
      const classified = isNetworkOrTimeoutError(err);
      lastWasTimeout = lastWasTimeout || classified.isTimeout;
      lastErrorMsg = err instanceof Error ? err.message : String(err || '');

      // Abort/network error -> retry if attempts remain, otherwise surface network error
      if (!classified.isNetwork && attempt === maxAttempts - 1) {
        return {
          success: false,
          orderId: payload.orderId,
          status: 'pending_payment',
          isNetworkError: false,
          idempotencyKey,
          error: lastErrorMsg || "Chek yuborishda xatolik yuz berdi. Qayta urinib ko'ring.",
        };
      }
    } finally {
      clearTimeout(timerId);
    }

    if (attempt < retryDelaysMs.length) {
      await sleepFn(retryDelaysMs[attempt]);
    }
  }

  return {
    success: false,
    orderId: payload.orderId,
    status: 'pending_payment',
    statusCode: lastStatusCode,
    isNetworkError: true,
    isTimeout: lastWasTimeout,
    idempotencyKey,
    error:
      lastErrorMsg ||
      "Internet aloqasi sekin yoki uzilgan. Chek yuborilmadi. Aloqani tekshirib, qayta urinib ko'ring.",
  };
}
