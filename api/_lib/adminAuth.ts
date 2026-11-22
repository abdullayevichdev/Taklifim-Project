import crypto from 'node:crypto';
import { cleanEnvString } from './env.js';
import { getAdminApp, getAdminAuth } from './firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';

/** Synthetic Firebase Auth uid used for admin-panel sessions. */
export const ADMIN_UID = 'tashrifim-admin';
/** Admin sessions expire after 12 hours; the code must be entered again. */
export const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;

/**
 * The admin access code lives ONLY in the server environment (ADMIN_ACCESS_CODE on Vercel).
 * It is never part of the repository or the client bundle.
 */
export function getAdminAccessCode(): string {
  return cleanEnvString(process.env.ADMIN_ACCESS_CODE);
}

export function isAdminCodeConfigured(): boolean {
  return getAdminAccessCode().length > 0;
}

/** Constant-time comparison of the submitted code with ADMIN_ACCESS_CODE. */
export function verifyAdminCode(submitted: unknown): boolean {
  const expected = getAdminAccessCode();
  if (!expected || typeof submitted !== 'string') return false;
  const a = crypto.createHash('sha256').update(submitted.trim(), 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

/** Firebase custom token for the admin session (claims: admin=true, adminUntil=<ms epoch>). */
export async function createAdminSessionToken(): Promise<{ token: string; expiresAt: number }> {
  const auth = getAdminAuth();
  if (!auth) throw new Error('Firebase Admin is not configured.');
  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  const token = await auth.createCustomToken(ADMIN_UID, { admin: true, adminUntil: expiresAt });
  return { token, expiresAt };
}

/** Verifies "Authorization: Bearer <idToken>" belongs to a live admin session. */
export async function verifyAdminRequest(authorizationHeader?: string | string[]): Promise<boolean> {
  const raw = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const idToken = typeof raw === 'string' ? raw.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() : '';
  const app = getAdminApp();
  if (!idToken || !app) return false;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    return (
      decoded.uid === ADMIN_UID &&
      decoded.admin === true &&
      typeof decoded.adminUntil === 'number' &&
      decoded.adminUntil > Date.now()
    );
  } catch {
    return false;
  }
}

export function getClientIp(headers: Record<string, string | string[] | undefined>, fallback = 'unknown'): string {
  const fwd = headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
  return first || fallback;
}
