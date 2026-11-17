export interface TemplateResolutionErrorContext {
  source: 'TemplateRenderer' | 'InvitationGuestPage' | 'BuilderPage';
  templateId?: string;
  templateSlug?: string;
  invitationId?: string;
  invitationSlug?: string;
  routePath?: string;
}

const reportedAlertKeys = new Set<string>();
const SESSION_STORAGE_PREFIX = 'taklifim_tpl_err_';

function makeAlertKey(ctx: TemplateResolutionErrorContext): string {
  return [
    ctx.source,
    ctx.templateSlug || '',
    ctx.templateId || '',
    ctx.invitationId || '',
    ctx.invitationSlug || '',
  ].join('|');
}

function hasAlreadyReportedInSession(key: string): boolean {
  if (reportedAlertKeys.has(key)) return true;
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${key}`) === '1';
    }
  } catch {
    // ignore
  }
  return false;
}

function markReportedInSession(key: string): void {
  reportedAlertKeys.add(key);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${key}`, '1');
    }
  } catch {
    // ignore
  }
}

/**
 * Logs template resolution failure to console.error and sends a deduplicated
 * admin alert to Telegram via `/api/telegram/template-alert`.
 */
export function reportTemplateResolutionError(ctx: TemplateResolutionErrorContext): void {
  const routePath =
    ctx.routePath ||
    (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '');

  console.error('[TemplateResolutionError]', {
    source: ctx.source,
    templateId: ctx.templateId || null,
    templateSlug: ctx.templateSlug || null,
    invitationId: ctx.invitationId || null,
    invitationSlug: ctx.invitationSlug || null,
    routePath: routePath || null,
  });

  if (typeof fetch !== 'function' || typeof window === 'undefined') {
    return;
  }

  const key = makeAlertKey(ctx);
  if (hasAlreadyReportedInSession(key)) {
    return;
  }
  markReportedInSession(key);

  try {
    void fetch('/api/telegram/template-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        source: ctx.source,
        templateId: ctx.templateId || '',
        templateSlug: ctx.templateSlug || '',
        invitationId: ctx.invitationId || '',
        invitationSlug: ctx.invitationSlug || '',
        routePath,
      }),
    }).catch(() => {});
  } catch {
    // non-fatal
  }
}
