// TEMPORARY DIAGNOSTIC ENDPOINT — DELETE AFTER DEBUGGING
import type { VercelRequest, VercelResponse } from '@vercel/node';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('RTDB_TIMEOUT')), timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      error: 'Method not allowed',
    });
  }

  try {
    const [envMod, adminMod] = await Promise.all([
      import('../_lib/env.js'),
      import('../_lib/firebaseAdmin.js'),
    ]);

    const runtimeEnv = envMod.getTelegramRuntimeEnv();
    const authConfig = envMod.getTelegramAuthConfig();
    const paymentConfig = envMod.getPaymentTelegramConfig();
    const authBotUsername = envMod.getTelegramAuthBotUsername();
    const fbEnv = adminMod.getFirebaseAdminEnvStatus();

    const adminReady = adminMod.hasFirebaseAdmin();
    const diagInfo = adminMod.getFirebaseAdminDiagnosticInfo();
    const firebaseAdminInit = adminReady
      ? 'ok'
      : `failed:${diagInfo?.code || 'INIT_ERROR'}`;

    let rtdbReachable = false;
    let rtdbCheckCode: 'ok' | 'skipped' | 'timeout' | 'error' = 'skipped';

    if (adminReady) {
      try {
        await withTimeout(adminMod.getRtdb().ref('templates').limitToFirst(1).get(), 2500);
        rtdbReachable = true;
        rtdbCheckCode = 'ok';
      } catch (rtdbErr) {
        const msg = rtdbErr instanceof Error ? rtdbErr.message : '';
        rtdbReachable = false;
        rtdbCheckCode = msg === 'RTDB_TIMEOUT' ? 'timeout' : 'error';
      }
    }

    const hasActiveAuthBotToken = Boolean(
      authConfig.botToken && authConfig.botToken !== 'MOCK_BOT_TOKEN'
    );
    const hasActiveAuthBotUsername = Boolean(
      authBotUsername && authBotUsername.replace(/^@+/, '').trim().length > 0
    );

    const overallOk =
      adminReady && rtdbReachable && hasActiveAuthBotToken && hasActiveAuthBotUsername;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: overallOk,
      nodeVersion: process.version,
      vercelEnv: runtimeEnv,
      hasFirebaseProjectId: fbEnv.hasProjectId,
      hasFirebaseClientEmail: fbEnv.hasClientEmail,
      hasFirebasePrivateKey: fbEnv.hasPrivateKey,
      hasFirebaseServiceAccountJson: fbEnv.hasServiceAccountJson,
      hasFirebaseDatabaseUrl: fbEnv.hasDatabaseUrl,
      hasTelegramBotToken: Boolean(envMod.cleanEnvString(process.env.TELEGRAM_BOT_TOKEN)),
      hasTelegramBotUsername: Boolean(envMod.cleanEnvString(process.env.TELEGRAM_BOT_USERNAME)),
      hasTelegramTestBotToken: Boolean(envMod.cleanEnvString(process.env.TELEGRAM_TEST_BOT_TOKEN)),
      hasTelegramTestBotUsername: Boolean(
        envMod.cleanEnvString(process.env.TELEGRAM_TEST_BOT_USERNAME)
      ),
      hasViteTelegramBotUsername: Boolean(
        envMod.cleanEnvString(process.env.VITE_TELEGRAM_BOT_USERNAME)
      ),
      hasActiveAuthBotToken,
      hasActiveAuthBotUsername,
      hasPaymentBotToken: Boolean(
        paymentConfig.botToken && paymentConfig.botToken !== 'MOCK_BOT_TOKEN'
      ),
      hasTelegramAdminChatId: Boolean(
        paymentConfig.adminChatId && paymentConfig.adminChatId !== 'MOCK_ADMIN_CHAT_ID'
      ),
      firebaseAdminInit,
      rtdbReachable,
      rtdbCheckCode,
    });
  } catch {
    return res.status(500).json({
      ok: false,
      code: 'HEALTH_CHECK_FAILED',
      nodeVersion: process.version,
      firebaseAdminInit: 'failed:MODULE_LOAD_FAILED',
      rtdbReachable: false,
      rtdbCheckCode: 'error',
    });
  }
}
