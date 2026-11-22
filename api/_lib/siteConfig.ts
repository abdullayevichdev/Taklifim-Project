import { getRtdb, hasFirebaseAdmin } from './firebaseAdmin.js';

/** Server-side view of the admin-editable public site settings (cached briefly). */
export interface ServerSiteSettings {
  phone: string;
  ownerName: string;
  cardNumber: string;
  cardHolder: string;
  cardBank: string;
}

export const DEFAULT_SERVER_SETTINGS: ServerSiteSettings = {
  phone: '998933223580',
  ownerName: 'Avazxanov Abdulhay',
  cardNumber: '5614682209202581',
  cardHolder: 'ABDULLA DEDAXANOV',
  cardBank: 'Uzcard / Humo',
};

let cache: { at: number; value: ServerSiteSettings } | null = null;

export async function getServerSiteSettings(): Promise<ServerSiteSettings> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  let value = DEFAULT_SERVER_SETTINGS;
  if (hasFirebaseAdmin()) {
    try {
      const snap = await getRtdb().ref('settings/public').get();
      const raw = snap.val() || {};
      value = {
        phone: String(raw.phone || '').replace(/\D/g, '') || DEFAULT_SERVER_SETTINGS.phone,
        ownerName: String(raw.ownerName || '').trim() || DEFAULT_SERVER_SETTINGS.ownerName,
        cardNumber: String(raw.cardNumber || '').replace(/\D/g, '') || DEFAULT_SERVER_SETTINGS.cardNumber,
        cardHolder: String(raw.cardHolder || '').trim() || DEFAULT_SERVER_SETTINGS.cardHolder,
        cardBank: String(raw.cardBank || '').trim() || DEFAULT_SERVER_SETTINGS.cardBank,
      };
    } catch {
      /* defaults */
    }
  }
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateServerSiteSettings(): void {
  cache = null;
}

/** Admin-set template price (templateOverrides/{slug}.price), if any. */
export async function getTemplatePriceOverride(templateSlug?: string): Promise<number | null> {
  const slug = String(templateSlug || '').replace(/[^a-z0-9_-]/gi, '');
  if (!slug || !hasFirebaseAdmin()) return null;
  try {
    const snap = await getRtdb().ref(`templateOverrides/${slug}/price`).get();
    const v = Number(snap.val());
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Appends an entry to the admin audit log (never throws). */
export async function writeAdminAudit(entry: {
  type: string;
  target?: string;
  detail?: string;
  ip?: string;
}): Promise<void> {
  if (!hasFirebaseAdmin()) return;
  try {
    await getRtdb()
      .ref('adminAudit')
      .push({
        type: entry.type.slice(0, 60),
        target: (entry.target || '').slice(0, 120),
        detail: (entry.detail || '').slice(0, 500),
        ip: (entry.ip || '').slice(0, 64),
        at: new Date().toISOString(),
      });
  } catch {
    /* non-fatal */
  }
}
