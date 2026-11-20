import crypto from 'node:crypto';
import {
  getBrandName,
  getPublicSiteUrl,
  getTelegramBotUsername,
  getTelegramConfig,
} from './env.js';
import {
  getAdminAuth,
  getFirebaseAdminDiagnosticError,
  getRtdb,
  hasFirebaseAdmin,
  stripUndefined,
  type ServerUserRecord,
} from './firebaseAdmin.js';
import { normalizePhoneE164 } from './phone.js';
import {
  checkExternalRateLimit,
  cleanupExpiredRateLimits,
} from './rateLimit.js';

export type SupportedLang = 'uz' | 'ru' | 'en';
export type LoginSessionStatus = 'pending' | 'awaiting_contact' | 'verified';

export interface LoginSessionRecord {
  sessionId: string;
  claimSecretHash: string;
  verificationCode: string;
  status: LoginSessionStatus;
  lang: SupportedLang;
  createdAt: number;
  expiresAt: number;
  failedClaimAttempts?: number;
  telegramUserId?: string;
  telegramChatId?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  verifiedAt?: number;
}

export interface PendingTelegramSessionRef {
  sessionId: string;
  expiresAt: number;
}

export interface TelegramAuthDeps {
  hasFirebaseAdmin: typeof hasFirebaseAdmin;
  getRtdb: typeof getRtdb;
  getAdminAuth: typeof getAdminAuth;
  getBrandName?: typeof getBrandName;
  getTelegramBotUsername: typeof getTelegramBotUsername;
  getTelegramConfig: typeof getTelegramConfig;
  getPublicSiteUrl: typeof getPublicSiteUrl;
  checkExternalRateLimit: typeof checkExternalRateLimit;
  sendTelegramMessage: (payload: Record<string, unknown>) => Promise<any>;
  now?: () => number;
}

const SESSION_TTL_MS = 5 * 60 * 1000;
const MAX_FAILED_CLAIM_ATTEMPTS = 5;

function normalizeLang(raw?: unknown, fallback: SupportedLang = 'uz'): SupportedLang {
  const val = String(raw || '').trim().toLowerCase();
  if (val.startsWith('ru') || val.startsWith('uk') || val.startsWith('be')) return 'ru';
  if (val.startsWith('en')) return 'en';
  if (val.startsWith('uz')) return 'uz';
  return fallback;
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function timingSafeHexEqual(expectedHex: string, providedHex: string): boolean {
  if (!expectedHex || !providedHex || expectedHex.length !== providedHex.length) {
    return false;
  }
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(providedHex, 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function validateClaimSecret(claimSecret: unknown): claimSecret is string {
  if (typeof claimSecret !== 'string') return false;
  if (claimSecret.length < 32 || claimSecret.length > 256) return false;
  if (/\s/.test(claimSecret)) return false;
  return true;
}

function validateSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(sessionId);
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const BOT_MESSAGES: Record<
  SupportedLang,
  {
    sharePhoneBtn: string;
    sharePhonePrompt: (params: {
      brandName: string;
      verificationCode: string;
      privacyLine: string;
    }) => string;
    privacyLinkLine: (url: string) => string;
    privacyFallbackLine: string;
    verifiedSuccess: string;
    expiredLink: string;
    ownContactOnly: string;
    useButtonNotText: string;
    invalidPhoneError: string;
    plainStartGreeting: (siteUrl: string) => string;
    openSiteBtn: string;
  }
> = {
  uz: {
    sharePhoneBtn: '📱 Telefon raqamni ulashish',
    sharePhonePrompt: ({ brandName, verificationCode, privacyLine }) =>
      `⚠️ Siz <b>${escapeHtml(brandName)}</b> saytiga kirish so‘rovini tasdiqlayapsiz.\n` +
      `Saytda ko‘rsatilgan kod: <b>${escapeHtml(verificationCode)}</b>\n\n` +
      `Agar siz o‘zingiz saytdan kirishni boshlamagan bo‘lsangiz, bu xabarni e’tiborsiz qoldiring va raqamingizni ulashmang.\n\n` +
      `Kod mos kelsa, pastdagi tugma orqali raqamingizni ulashing.\n` +
      `Raqam faqat kirish va buyurtmalar uchun ishlatiladi.\n${escapeHtml(privacyLine)}`,
    privacyLinkLine: (url) => `Maxfiylik siyosati: ${url}/privacy`,
    privacyFallbackLine: 'Maxfiylik siyosati saytimizda mavjud.',
    verifiedSuccess:
      '✅ Tayyor! Telefon raqamingiz tasdiqlandi.\n\nEndi saytga qayting — tizimga avtomatik kirasiz.',
    expiredLink:
      '⏳ Kirish havolasi eskirgan yoki noto‘g‘ri.\n\nIltimos, saytdan «Telegram orqali kirish» tugmasini qayta bosing.',
    ownContactOnly:
      '⛔ Xavfsizlik sababli boshqa odamning kontaktini yuborish mumkin emas.\n\nIltimos, pastdagi «📱 Telefon raqamni ulashish» tugmasi orqali faqat o‘z raqamingizni yuboring.',
    useButtonNotText:
      'ℹ️ Iltimos, telefon raqamingizni qo‘lda yozmang — pastdagi «📱 Telefon raqamni ulashish» tugmasini bosing.',
    invalidPhoneError:
      '❌ Telefon raqami formati noto‘g‘ri aniqlandi. Iltimos, saytdan qayta urinib ko‘ring.',
    plainStartGreeting: (siteUrl) =>
      siteUrl
        ? `👋 Assalomu alaykum!\n\nSaytga kirish uchun brauzerdagi «Telegram orqali kirish» tugmasidan foydalaning:\n${siteUrl}/login`
        : '👋 Assalomu alaykum!\n\nKirish uchun saytdagi «Telegram orqali kirish» tugmasidan foydalaning.',
    openSiteBtn: '🌐 Saytga o‘tish',
  },
  ru: {
    sharePhoneBtn: '📱 Поделиться номером телефона',
    sharePhonePrompt: ({ brandName, verificationCode, privacyLine }) =>
      `⚠️ Вы подтверждаете запрос на вход на сайт <b>${escapeHtml(brandName)}</b>.\n` +
      `Код на сайте: <b>${escapeHtml(verificationCode)}</b>\n\n` +
      `Если вы сами не начинали вход на сайте, проигнорируйте это сообщение и не делитесь своим номером.\n\n` +
      `Если код совпадает, поделитесь номером по кнопке ниже.\n` +
      `Номер используется только для входа и заказов.\n${escapeHtml(privacyLine)}`,
    privacyLinkLine: (url) => `Политика конфиденциальности: ${url}/privacy`,
    privacyFallbackLine: 'Политика конфиденциальности доступна на сайте.',
    verifiedSuccess:
      '✅ Готово! Ваш номер телефона подтверждён.\n\nТеперь вернитесь на сайт — вход выполнится автоматически.',
    expiredLink:
      '⏳ Ссылка для входа устарела или недействительна.\n\nПожалуйста, нажмите «Войти через Telegram» на сайте заново.',
    ownContactOnly:
      '⛔ В целях безопасности нельзя отправлять чужой контакт.\n\nНажмите кнопку «📱 Поделиться номером телефона» ниже, чтобы отправить только свой номер.',
    useButtonNotText:
      'ℹ️ Пожалуйста, не вводите номер вручную — нажмите кнопку «📱 Поделиться номером телефона» ниже.',
    invalidPhoneError:
      '❌ Некорректный формат номера телефона. Пожалуйста, попробуйте снова через сайт.',
    plainStartGreeting: (siteUrl) =>
      siteUrl
        ? `👋 Здравствуйте!\n\nДля входа используйте кнопку «Войти через Telegram» на сайте:\n${siteUrl}/login`
        : '👋 Здравствуйте!\n\nДля входа используйте кнопку «Войти через Telegram» на сайте.',
    openSiteBtn: '🌐 Перейти на сайт',
  },
  en: {
    sharePhoneBtn: '📱 Share phone number',
    sharePhonePrompt: ({ brandName, verificationCode, privacyLine }) =>
      `⚠️ You are confirming a sign-in request for <b>${escapeHtml(brandName)}</b>.\n` +
      `Code shown on website: <b>${escapeHtml(verificationCode)}</b>\n\n` +
      `If you did not initiate this sign-in on the website yourself, ignore this message and do NOT share your phone number.\n\n` +
      `If the code matches, tap the button below to share your phone number.\n` +
      `Your number is used only for sign-in and your orders.\n${escapeHtml(privacyLine)}`,
    privacyLinkLine: (url) => `Privacy Policy: ${url}/privacy`,
    privacyFallbackLine: 'Our Privacy Policy is available on our website.',
    verifiedSuccess:
      '✅ Done! Your phone number is verified.\n\nPlease return to the website — you will be signed in automatically.',
    expiredLink:
      '⏳ This sign-in link has expired or is invalid.\n\nPlease go back to the website and tap "Continue with Telegram" again.',
    ownContactOnly:
      '⛔ For security reasons, you cannot forward someone else’s contact.\n\nPlease tap the "📱 Share phone number" button below to share your own number.',
    useButtonNotText:
      'ℹ️ Please do not type your phone number manually — tap the "📱 Share phone number" button below.',
    invalidPhoneError:
      '❌ Invalid phone number format. Please try again from the website.',
    plainStartGreeting: (siteUrl) =>
      siteUrl
        ? `👋 Hello!\n\nTo sign in, please use the "Continue with Telegram" button on the website:\n${siteUrl}/login`
        : '👋 Hello!\n\nTo sign in, please use the "Continue with Telegram" button on the website.',
    openSiteBtn: '🌐 Open Website',
  },
};

async function cleanupExpiredSessions(rtdb: ReturnType<typeof getRtdb>, now: number): Promise<void> {
  try {
    const [sessionsSnap, pendingSnap] = await Promise.all([
      rtdb.ref('loginSessions').limitToFirst(100).get(),
      rtdb.ref('telegramPendingSessions').limitToFirst(100).get(),
      cleanupExpiredRateLimits(rtdb, now),
    ]);

    const removals: Record<string, null> = {};

    if (sessionsSnap.exists()) {
      const val = sessionsSnap.val() as Record<string, Partial<LoginSessionRecord>>;
      for (const [key, item] of Object.entries(val || {})) {
        if (!item || typeof item.expiresAt !== 'number' || item.expiresAt <= now) {
          removals[`loginSessions/${key}`] = null;
        }
      }
    }

    if (pendingSnap.exists()) {
      const val = pendingSnap.val() as Record<string, Partial<PendingTelegramSessionRef>>;
      for (const [key, item] of Object.entries(val || {})) {
        if (!item || typeof item.expiresAt !== 'number' || item.expiresAt <= now) {
          removals[`telegramPendingSessions/${key}`] = null;
        }
      }
    }

    if (Object.keys(removals).length > 0) {
      await rtdb.ref().update(removals);
    }
  } catch {
    // Non-fatal background cleanup
  }
}

export async function startTelegramLogin(
  params: {
    claimSecret?: unknown;
    lang?: unknown;
    clientIp?: string;
  },
  deps: TelegramAuthDeps
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const now = deps.now ? deps.now() : Date.now();
  const lang = normalizeLang(params.lang, 'uz');

  if (!validateClaimSecret(params.claimSecret)) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Invalid claimSecret (must be 32+ non-whitespace characters).',
      },
    };
  }

  if (!deps.hasFirebaseAdmin()) {
    return {
      statusCode: 500,
      body: {
        success: false,
        error:
          getFirebaseAdminDiagnosticError() ||
          'Server Firebase Admin configuration is incomplete.',
      },
    };
  }

  const runtimeEnv = process.env.VERCEL_ENV === 'preview' ? 'preview' : 'default';
  const authConfig = deps.getTelegramConfig();
  const botUsername = deps.getTelegramBotUsername();

  if (!botUsername) {
    const varHint =
      runtimeEnv === 'preview' ? 'TELEGRAM_TEST_BOT_USERNAME' : 'TELEGRAM_BOT_USERNAME';
    return {
      statusCode: 500,
      body: {
        success: false,
        error: `Telegram bot username (${varHint}) is not configured.`,
      },
    };
  }

  if (!authConfig?.botToken || authConfig.botToken === 'MOCK_BOT_TOKEN') {
    const tokenHint =
      runtimeEnv === 'preview' ? 'TELEGRAM_TEST_BOT_TOKEN' : 'TELEGRAM_BOT_TOKEN';
    return {
      statusCode: 500,
      body: {
        success: false,
        error: `Telegram bot token (${tokenHint}) is not configured.`,
      },
    };
  }

  const rtdb = deps.getRtdb();
  const rateLimit = await deps.checkExternalRateLimit({
    key: `tg_auth_start:${params.clientIp || 'unknown'}`,
    limit: 10,
    windowMs: 60_000,
    rtdb,
  });

  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      body: {
        success: false,
        error: "Juda ko'p kirish urinishi. Bir daqiqadan so'ng qayta urinib ko'ring.",
      },
    };
  }

  // Prune expired sessions opportunistically
  await cleanupExpiredSessions(rtdb, now);

  // 18 random bytes -> 24 base64url chars ([A-Za-z0-9_-]); `login_` + 24 = 30 chars <= Telegram 64-char limit
  const sessionId = crypto.randomBytes(18).toString('base64url');
  const claimSecretHash = sha256Hex(params.claimSecret);
  const verificationCode = String(crypto.randomInt(10, 100));
  const expiresAt = now + SESSION_TTL_MS;

  const sessionRecord: LoginSessionRecord = {
    sessionId,
    claimSecretHash,
    verificationCode,
    status: 'pending',
    lang,
    createdAt: now,
    expiresAt,
    failedClaimAttempts: 0,
  };

  await rtdb.ref(`loginSessions/${sessionId}`).set(sessionRecord);

  return {
    statusCode: 200,
    body: {
      success: true,
      sessionId,
      botUsername,
      botUrl: `https://t.me/${botUsername}?start=login_${sessionId}`,
      verificationCode,
      expiresAt,
    },
  };
}

export async function claimTelegramLogin(
  params: {
    sessionId?: unknown;
    claimSecret?: unknown;
    clientIp?: string;
  },
  deps: TelegramAuthDeps
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const now = deps.now ? deps.now() : Date.now();

  if (!validateSessionId(params.sessionId) || !validateClaimSecret(params.claimSecret)) {
    return {
      statusCode: 400,
      body: {
        status: 'error',
        error: 'Invalid sessionId or claimSecret.',
      },
    };
  }

  if (!deps.hasFirebaseAdmin()) {
    return {
      statusCode: 500,
      body: {
        status: 'error',
        error:
          getFirebaseAdminDiagnosticError() ||
          'Server Firebase Admin configuration is incomplete.',
      },
    };
  }

  const rtdb = deps.getRtdb();
  const sessionId = params.sessionId;
  const clientIp = params.clientIp || 'unknown';

  const pollLimit = await deps.checkExternalRateLimit({
    key: `tg_auth_claim_poll:${clientIp}:${sessionId}`,
    limit: 90,
    windowMs: 60_000,
    rtdb,
  });

  if (!pollLimit.allowed) {
    return {
      statusCode: 429,
      body: {
        status: 'error',
        error: "So'rovlar juda ko'p. Biroz kutib qayta urinib ko'ring.",
      },
    };
  }

  const sessionSnap = await rtdb.ref(`loginSessions/${sessionId}`).get();
  if (!sessionSnap.exists()) {
    return {
      statusCode: 200,
      body: { status: 'expired' },
    };
  }

  const session = sessionSnap.val() as LoginSessionRecord;
  const providedHash = sha256Hex(params.claimSecret);

  if (!timingSafeHexEqual(session.claimSecretHash, providedHash)) {
    const failLimit = await deps.checkExternalRateLimit({
      key: `tg_auth_claim_fail:${sessionId}`,
      limit: MAX_FAILED_CLAIM_ATTEMPTS,
      windowMs: SESSION_TTL_MS,
      rtdb,
    });

    const nextFailures = Number(session.failedClaimAttempts || 0) + 1;
    try {
      if (nextFailures >= MAX_FAILED_CLAIM_ATTEMPTS || !failLimit.allowed) {
        const removals: Record<string, null> = {
          [`loginSessions/${sessionId}`]: null,
        };
        if (session.telegramUserId) {
          removals[`telegramPendingSessions/${session.telegramUserId}`] = null;
        }
        await rtdb.ref().update(removals);
      } else {
        await rtdb.ref(`loginSessions/${sessionId}`).update({
          failedClaimAttempts: nextFailures,
        });
      }
    } catch {
      // ignore tracking error
    }

    return {
      statusCode: !failLimit.allowed || nextFailures >= MAX_FAILED_CLAIM_ATTEMPTS ? 429 : 403,
      body: {
        status: 'forbidden',
        error: 'Invalid claimSecret.',
      },
    };
  }

  if (!session.expiresAt || now > session.expiresAt) {
    const removals: Record<string, null> = {
      [`loginSessions/${sessionId}`]: null,
    };
    if (session.telegramUserId) {
      removals[`telegramPendingSessions/${session.telegramUserId}`] = null;
    }
    try {
      await rtdb.ref().update(removals);
    } catch {
      // ignore cleanup error
    }
    return {
      statusCode: 200,
      body: { status: 'expired' },
    };
  }

  if (session.status !== 'verified') {
    return {
      statusCode: 200,
      body: { status: 'pending' },
    };
  }

  const tgUserId = String(session.telegramUserId || '').trim();
  const cleanPhone = normalizePhoneE164(session.phone);
  if (!tgUserId || !cleanPhone) {
    return {
      statusCode: 500,
      body: {
        status: 'error',
        error: 'Verified session is missing Telegram user ID or phone.',
      },
    };
  }

  const adminAuth = deps.getAdminAuth();
  if (!adminAuth) {
    return {
      statusCode: 500,
      body: {
        status: 'error',
        error: 'Firebase Admin Auth is not available.',
      },
    };
  }

  const uid = `tg_${tgUserId}`;
  const { adminChatId } = deps.getTelegramConfig();
  const cleanAdminId = String(adminChatId || '').trim();
  // Admin claim is granted ONLY when TELEGRAM_ADMIN_CHAT_ID is a personal positive numeric Telegram ID (never negative group IDs).
  const isPersonalAdminId = /^[1-9]\d*$/.test(cleanAdminId);
  const isAdmin = isPersonalAdminId && tgUserId === cleanAdminId;

  const customToken = await adminAuth.createCustomToken(
    uid,
    isAdmin ? { admin: true } : undefined
  );

  const nowIso = new Date(now).toISOString();
  const existingUserSnap = await rtdb.ref(`users/${uid}`).get();
  const existingUser = existingUserSnap.exists()
    ? (existingUserSnap.val() as ServerUserRecord)
    : null;

  const tgFullName = [session.firstName, session.lastName]
    .filter((part) => Boolean(part && String(part).trim()))
    .join(' ')
    .trim();
  const telegramDisplayName =
    tgFullName || (session.username ? `@${session.username}` : 'Telegram User');

  const userPatch = stripUndefined({
    id: uid,
    name: existingUser?.name?.trim() ? existingUser.name : telegramDisplayName,
    phone: cleanPhone,
    phoneVerified: true,
    telegramUserId: tgUserId,
    telegramChatId: session.telegramChatId || tgUserId,
    firstName: session.firstName || '',
    lastName: session.lastName || '',
    username: session.username || '',
    lang: session.lang || existingUser?.lang || 'uz',
    notifications: existingUser?.notifications ?? true,
    createdAt: existingUser?.createdAt || nowIso,
    lastLoginAt: nowIso,
  });

  const nextUserData: Record<string, unknown> = {
    ...(existingUser || {}),
    ...userPatch,
  };
  if (isAdmin) {
    nextUserData.isAdmin = true;
  } else {
    delete nextUserData.isAdmin;
  }

  const updates: Record<string, unknown> = {
    [`users/${uid}`]: nextUserData,
    [`loginSessions/${sessionId}`]: null,
    [`telegramPendingSessions/${tgUserId}`]: null,
  };

  await rtdb.ref().update(updates);

  return {
    statusCode: 200,
    body: {
      status: 'ok',
      customToken,
    },
  };
}

export async function handleTelegramCustomerMessage(
  message: any,
  deps: TelegramAuthDeps
): Promise<void> {
  if (!message || message.chat?.type !== 'private') {
    return;
  }
  if (!message.from?.id || message.from?.is_bot) {
    return;
  }

  const tgUserId = String(message.from.id);
  const chatId = String(message.chat.id);
  const now = deps.now ? deps.now() : Date.now();
  const fallbackLang = normalizeLang(message.from?.language_code, 'uz');
  const rtdb = deps.getRtdb();
  const siteUrl = deps.getPublicSiteUrl();

  const replyKeyboardFor = (lang: SupportedLang) => ({
    keyboard: [[{ text: BOT_MESSAGES[lang].sharePhoneBtn, request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  });

  // 1. Handle shared Telegram contact
  if (message.contact) {
    const contactUserId = message.contact.user_id !== undefined ? String(message.contact.user_id) : '';
    const pendingSnap = await rtdb.ref(`telegramPendingSessions/${tgUserId}`).get();
    const pendingRef = pendingSnap.exists()
      ? (pendingSnap.val() as PendingTelegramSessionRef)
      : null;

    let session: LoginSessionRecord | null = null;
    if (pendingRef?.sessionId) {
      const sessSnap = await rtdb.ref(`loginSessions/${pendingRef.sessionId}`).get();
      if (sessSnap.exists()) {
        session = sessSnap.val() as LoginSessionRecord;
      }
    }

    const lang = normalizeLang(session?.lang, fallbackLang);
    const copy = BOT_MESSAGES[lang];

    // Strict check 1: Contact MUST belong to the message sender (reject forwarded contacts)
    if (!contactUserId || contactUserId !== tgUserId) {
      await deps.sendTelegramMessage({
        chat_id: chatId,
        text: copy.ownContactOnly,
        reply_markup: session && session.status === 'awaiting_contact' && now <= session.expiresAt
          ? replyKeyboardFor(lang)
          : { remove_keyboard: true },
      });
      return;
    }

    // Strict check 2: Must have an active, non-expired awaiting_contact session for this Telegram user
    if (
      !session ||
      session.status !== 'awaiting_contact' ||
      String(session.telegramUserId) !== tgUserId ||
      !session.expiresAt ||
      now > session.expiresAt
    ) {
      try {
        await rtdb.ref(`telegramPendingSessions/${tgUserId}`).set(null);
      } catch {}
      await deps.sendTelegramMessage({
        chat_id: chatId,
        text: copy.expiredLink,
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    // Strict check 3: Normalize E.164 international phone number
    const cleanPhone = normalizePhoneE164(message.contact.phone_number);
    if (!cleanPhone) {
      await deps.sendTelegramMessage({
        chat_id: chatId,
        text: copy.invalidPhoneError,
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    await rtdb.ref().update({
      [`loginSessions/${session.sessionId}/status`]: 'verified',
      [`loginSessions/${session.sessionId}/phone`]: cleanPhone,
      [`loginSessions/${session.sessionId}/telegramUserId`]: tgUserId,
      [`loginSessions/${session.sessionId}/telegramChatId`]: chatId,
      [`loginSessions/${session.sessionId}/firstName`]: String(message.from.first_name || ''),
      [`loginSessions/${session.sessionId}/lastName`]: String(message.from.last_name || ''),
      [`loginSessions/${session.sessionId}/username`]: String(message.from.username || ''),
      [`loginSessions/${session.sessionId}/verifiedAt`]: now,
      [`telegramPendingSessions/${tgUserId}`]: null,
    });

    await deps.sendTelegramMessage({
      chat_id: chatId,
      text: copy.verifiedSuccess,
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  // 2. Handle text commands (/start login_<sessionId>, plain /start, or manual text)
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+([^\s]+))?$/i);

  if (startMatch) {
    const startPayload = startMatch[1] || '';

    if (startPayload.startsWith('login_')) {
      const sessionId = startPayload.slice('login_'.length);
      if (!validateSessionId(sessionId)) {
        await deps.sendTelegramMessage({
          chat_id: chatId,
          text: BOT_MESSAGES[fallbackLang].expiredLink,
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      const sessSnap = await rtdb.ref(`loginSessions/${sessionId}`).get();
      const session = sessSnap.exists() ? (sessSnap.val() as LoginSessionRecord) : null;
      const lang = normalizeLang(session?.lang, fallbackLang);
      const copy = BOT_MESSAGES[lang];

      const isSameUserRetrying =
        session?.status === 'awaiting_contact' &&
        String(session.telegramUserId || '') === tgUserId;
      const isPending = session?.status === 'pending';

      if (
        !session ||
        (!isPending && !isSameUserRetrying) ||
        !session.expiresAt ||
        now > session.expiresAt
      ) {
        await deps.sendTelegramMessage({
          chat_id: chatId,
          text: copy.expiredLink,
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      await rtdb.ref().update({
        [`loginSessions/${sessionId}/status`]: 'awaiting_contact',
        [`loginSessions/${sessionId}/telegramUserId`]: tgUserId,
        [`loginSessions/${sessionId}/telegramChatId`]: chatId,
        [`loginSessions/${sessionId}/firstName`]: String(message.from.first_name || ''),
        [`loginSessions/${sessionId}/lastName`]: String(message.from.last_name || ''),
        [`loginSessions/${sessionId}/username`]: String(message.from.username || ''),
        [`telegramPendingSessions/${tgUserId}`]: {
          sessionId,
          expiresAt: session.expiresAt,
        },
      });

      const privacyLine = siteUrl ? copy.privacyLinkLine(siteUrl) : copy.privacyFallbackLine;
      const brandName = deps.getBrandName ? deps.getBrandName() : getBrandName();
      const verificationCode = session.verificationCode || '--';
      await deps.sendTelegramMessage({
        chat_id: chatId,
        text: copy.sharePhonePrompt({ brandName, verificationCode, privacyLine }),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyKeyboardFor(lang),
      });
      return;
    }

    // Plain /start without login_ payload
    const copy = BOT_MESSAGES[fallbackLang];
    await deps.sendTelegramMessage({
      chat_id: chatId,
      text: copy.plainStartGreeting(siteUrl),
      disable_web_page_preview: true,
      reply_markup: siteUrl
        ? {
            inline_keyboard: [[{ text: copy.openSiteBtn, url: `${siteUrl}/login` }]],
          }
        : { remove_keyboard: true },
    });
    return;
  }

  // 3. Any other non-contact text (e.g., manually typed phone number)
  const pendingSnap = await rtdb.ref(`telegramPendingSessions/${tgUserId}`).get();
  if (pendingSnap.exists()) {
    const pendingRef = pendingSnap.val() as PendingTelegramSessionRef;
    const sessSnap = await rtdb.ref(`loginSessions/${pendingRef.sessionId}`).get();
    const session = sessSnap.exists() ? (sessSnap.val() as LoginSessionRecord) : null;

    if (
      session &&
      session.status === 'awaiting_contact' &&
      String(session.telegramUserId) === tgUserId &&
      session.expiresAt > now
    ) {
      const lang = normalizeLang(session.lang, fallbackLang);
      await deps.sendTelegramMessage({
        chat_id: chatId,
        text: BOT_MESSAGES[lang].useButtonNotText,
        reply_markup: replyKeyboardFor(lang),
      });
      return;
    }
  }

  const copy = BOT_MESSAGES[fallbackLang];
  await deps.sendTelegramMessage({
    chat_id: chatId,
    text: copy.plainStartGreeting(siteUrl),
    disable_web_page_preview: true,
    reply_markup: { remove_keyboard: true },
  });
}
