export interface CanonicalTemplateEntry {
  id: string;
  slug: string;
  name: string;
  legacyNames?: readonly string[];
}

export const CANONICAL_TEMPLATE_CATALOG: readonly CanonicalTemplateEntry[] = [
  { id: 'tpl-1', slug: 'template-1', name: 'Aurelia Royal', legacyNames: ['aurelia'] },
  { id: 'tpl-2', slug: 'template-2', name: 'White Serenade', legacyNames: ['white-serenade'] },
  { id: 'tpl-3', slug: 'template-3', name: 'Velvet Sharqona', legacyNames: ['velvet'] },
  { id: 'tpl-4', slug: 'template-4', name: 'Golden Symphony' },
  { id: 'tpl-5', slug: 'template-5', name: 'Emerald Grace' },
  { id: 'tpl-6', slug: 'template-6', name: 'Pastel Romance' },
  { id: 'tpl-7', slug: 'template-7', name: 'Blush Elegance' },
  { id: 'tpl-8', slug: 'template-8', name: 'Floral Harmony', legacyNames: ['minimalist-pure', 'Minimalist Pure'] },
  { id: 'tpl-9', slug: 'template-9', name: 'Crystal Pure', legacyNames: ['lavender-garden', 'Lavender Garden'] },
  {
    id: 'tpl-10',
    slug: 'template-10',
    name: 'Midnight Sapphire',
    legacyNames: ['sapphire-night', 'Sapphire Night', 'Sapphire Midnight'],
  },
  { id: 'tpl-11', slug: 'template-11', name: 'Pearl Minimal', legacyNames: ['vintage-ivory', 'Vintage Ivory'] },
  { id: 'tpl-12', slug: 'template-12', name: 'Vintage Charm', legacyNames: ['modern-calligraphy', 'Modern Calligraphy'] },
  { id: 'tpl-13', slug: 'template-13', name: 'Rose Gold Luxe', legacyNames: ['royal-monogram', 'Royal Monogram'] },
  { id: 'tpl-14', slug: 'template-14', name: 'Botanical Garden' },
  { id: 'tpl-15', slug: 'template-15', name: 'Celestial Dream', legacyNames: ['silk-pearls', 'Silk & Pearls'] },
  { id: 'tpl-16', slug: 'template-16', name: 'Sunlit Terracotta', legacyNames: ['autumn-gold', 'Autumn Gold'] },
  { id: 'tpl-17', slug: 'template-17', name: 'Ivory Blossom', legacyNames: ['rose-gold-velvet', 'Rose Gold Velvet'] },
  { id: 'tpl-18', slug: 'template-18', name: 'Royal Ruby' },
  { id: 'tpl-19', slug: 'template-19', name: 'Modern Noir' },
  { id: 'tpl-20', slug: 'template-20', name: 'Sweet Butterfly' },
] as const;

const ENTRY_BY_SLUG = new Map<string, CanonicalTemplateEntry>();
const ENTRY_BY_LEGACY_KEY = new Map<string, CanonicalTemplateEntry>();

for (const entry of CANONICAL_TEMPLATE_CATALOG) {
  ENTRY_BY_SLUG.set(entry.slug, entry);
  ENTRY_BY_LEGACY_KEY.set(entry.slug.toLowerCase(), entry);
  ENTRY_BY_LEGACY_KEY.set(entry.id.toLowerCase(), entry);
  ENTRY_BY_LEGACY_KEY.set(entry.name.toLowerCase(), entry);
  if (entry.legacyNames) {
    for (const alias of entry.legacyNames) {
      ENTRY_BY_LEGACY_KEY.set(alias.toLowerCase(), entry);
    }
  }
}

export interface TemplateLookupInput {
  templateSlug?: string | null;
  templateId?: string | null;
}

export interface CanonicalTemplateMeta {
  templateId: string;
  templateSlug: string;
  templateName: string;
  matchedBy: 'slug' | 'id' | 'alias';
}

export interface ResolvedTemplateResult<T> {
  template: T;
  templateId: string;
  templateSlug: string;
  matchedBy: 'slug' | 'id' | 'alias' | 'catalog';
}

/**
 * Normalizes any template identifier/alias (`tpl-1`, `template-01`, `tpl_3`, `aurelia`, `3`)
 * into the single canonical key `template-<N>` (`template-1`..`template-20`).
 * Returns `null` if input cannot be mapped to a known template.
 */
export function normalizeTemplateSlug(raw?: string | null): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return null;

  const direct = ENTRY_BY_LEGACY_KEY.get(cleaned);
  if (direct) return direct.slug;

  const numMatch = cleaned.match(/^(?:template|tpl)[-_]?0*(\d{1,3})$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const candidate = `template-${num}`;
    if (ENTRY_BY_SLUG.has(candidate)) {
      return candidate;
    }
    return null;
  }

  if (/^0*(\d{1,2})$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    const candidate = `template-${num}`;
    if (ENTRY_BY_SLUG.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function toTemplateId(canonicalSlug: string): string {
  const entry = ENTRY_BY_SLUG.get(canonicalSlug);
  if (entry) return entry.id;
  const m = canonicalSlug.match(/^template-(\d+)$/);
  if (m) return `tpl-${m[1]}`;
  return canonicalSlug;
}

/**
 * Resolves canonical template metadata (`templateSlug`, `templateId`, `templateName`)
 * from either a raw key string or `{ templateSlug, templateId }`.
 * Strict: never silently defaults to `'template-1'`.
 */
export function resolveCanonicalTemplateMeta(
  input?: string | TemplateLookupInput | null
): CanonicalTemplateMeta | null {
  if (!input) return null;

  if (typeof input === 'string') {
    const raw = input.trim();
    if (!raw) return null;
    const canonicalSlug = normalizeTemplateSlug(raw);
    if (!canonicalSlug) return null;
    const entry = ENTRY_BY_SLUG.get(canonicalSlug);
    if (!entry) return null;

    const lower = raw.toLowerCase();
    const matchedBy: CanonicalTemplateMeta['matchedBy'] =
      lower === entry.slug
        ? 'slug'
        : lower === entry.id
        ? 'id'
        : 'alias';

    return {
      templateId: entry.id,
      templateSlug: entry.slug,
      templateName: entry.name,
      matchedBy,
    };
  }

  const rawSlug = typeof input.templateSlug === 'string' ? input.templateSlug.trim() : '';
  const rawId = typeof input.templateId === 'string' ? input.templateId.trim() : '';

  if (rawSlug) {
    const bySlug = resolveCanonicalTemplateMeta(rawSlug);
    if (bySlug) {
      return bySlug;
    }
    // If explicit templateSlug is invalid, do NOT ignore it silently unless it's empty;
    // however allow recovery only if templateSlug looks empty-ish placeholder
    const lowerSlug = rawSlug.toLowerCase();
    if (lowerSlug !== 'undefined' && lowerSlug !== 'null') {
      return null;
    }
  }

  if (rawId) {
    const byId = resolveCanonicalTemplateMeta(rawId);
    if (byId) {
      return {
        ...byId,
        matchedBy: byId.matchedBy === 'slug' ? 'id' : byId.matchedBy,
      };
    }
  }

  return null;
}

/**
 * Unified single-source template resolver used across TemplateRenderer,
 * InvitationGuestPage, BuilderPage, TemplateDetailPage, and api layers.
 * Strictly returns `null` when unresolved (no silent fallback to mockTemplates[0]).
 */
export function resolveTemplate<T extends { id: string; slug: string; name?: string }>(
  input: string | TemplateLookupInput | null | undefined,
  templates: readonly T[]
): ResolvedTemplateResult<T> | null {
  if (!input || !Array.isArray(templates) || templates.length === 0) {
    return null;
  }

  const meta = resolveCanonicalTemplateMeta(input);
  if (meta) {
    const match = templates.find(
      (tpl) =>
        normalizeTemplateSlug(tpl.slug) === meta.templateSlug ||
        normalizeTemplateSlug(tpl.id) === meta.templateSlug ||
        tpl.slug === meta.templateSlug ||
        tpl.id === meta.templateId
    );
    if (match) {
      return {
        template: match,
        templateId: match.id || meta.templateId,
        templateSlug: normalizeTemplateSlug(match.slug) || match.slug || meta.templateSlug,
        matchedBy: meta.matchedBy,
      };
    }
  }

  // Support custom (non-1..20) templates fetched from database if exact slug/id matches
  const rawSlug =
    typeof input === 'string'
      ? input.trim()
      : typeof input.templateSlug === 'string'
      ? input.templateSlug.trim()
      : '';
  const rawId =
    typeof input === 'string'
      ? input.trim()
      : typeof input.templateId === 'string'
      ? input.templateId.trim()
      : '';

  if (rawSlug) {
    const customMatch = templates.find(
      (tpl) => tpl.slug.toLowerCase() === rawSlug.toLowerCase()
    );
    if (customMatch) {
      return {
        template: customMatch,
        templateId: customMatch.id,
        templateSlug: customMatch.slug,
        matchedBy: 'catalog',
      };
    }
  }

  if (!rawSlug && rawId) {
    const customById = templates.find(
      (tpl) => tpl.id.toLowerCase() === rawId.toLowerCase()
    );
    if (customById) {
      return {
        template: customById,
        templateId: customById.id,
        templateSlug: customById.slug,
        matchedBy: 'catalog',
      };
    }
  }

  return null;
}

export interface LegacyOrderTemplateResolution {
  templateId: string;
  templateSlug: string;
  templateName: string;
  matchedBy: 'slug' | 'id' | 'alias' | 'templateName' | 'planName';
}

function stripPlanPriceSuffix(rawPlanName: string): string {
  return rawPlanName.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function matchEntryByHumanName(rawName: string): CanonicalTemplateEntry | null {
  const cleaned = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleaned || cleaned === 'standart shablon' || cleaned === 'standard plan') {
    return null;
  }

  const exact = ENTRY_BY_LEGACY_KEY.get(cleaned);
  if (exact) return exact;

  // Try normalized slug form if someone saved "template-4" as templateName
  const asSlug = normalizeTemplateSlug(cleaned);
  if (asSlug) {
    return ENTRY_BY_SLUG.get(asSlug) || null;
  }

  // Unambiguous prefix/partial match (requires >= 4 chars and single unique match)
  if (cleaned.length >= 4) {
    const partialMatches = CANONICAL_TEMPLATE_CATALOG.filter((entry) => {
      const n = entry.name.toLowerCase();
      if (n.includes(cleaned) || cleaned.includes(n)) return true;
      return Boolean(
        entry.legacyNames?.some((alias) => {
          const a = alias.toLowerCase();
          return a.length >= 4 && (a.includes(cleaned) || cleaned.includes(a));
        })
      );
    });
    if (partialMatches.length === 1) {
      return partialMatches[0];
    }
  }

  return null;
}

/**
 * Read-only backward-compatibility migration helper for legacy orders
 * that lack `templateSlug`/`templateId` and only stored `templateName` or `planName`.
 * Never mutates the database.
 */
export function resolveLegacyOrderTemplate(order?: {
  templateSlug?: string | null;
  templateId?: string | null;
  templateName?: string | null;
  planName?: string | null;
} | null): LegacyOrderTemplateResolution | null {
  if (!order) return null;

  const direct = resolveCanonicalTemplateMeta({
    templateSlug: order.templateSlug,
    templateId: order.templateId,
  });
  if (direct) {
    return {
      templateId: direct.templateId,
      templateSlug: direct.templateSlug,
      templateName: order.templateName?.trim() || direct.templateName,
      matchedBy: direct.matchedBy,
    };
  }

  if (typeof order.templateName === 'string' && order.templateName.trim()) {
    const byName = matchEntryByHumanName(order.templateName);
    if (byName) {
      return {
        templateId: byName.id,
        templateSlug: byName.slug,
        templateName: byName.name,
        matchedBy: 'templateName',
      };
    }
  }

  if (typeof order.planName === 'string' && order.planName.trim()) {
    const stripped = stripPlanPriceSuffix(order.planName);
    const byPlan = matchEntryByHumanName(stripped);
    if (byPlan) {
      return {
        templateId: byPlan.id,
        templateSlug: byPlan.slug,
        templateName: byPlan.name,
        matchedBy: 'planName',
      };
    }
  }

  return null;
}

/**
 * Enriches an order record in memory (read-only) with resolved `templateSlug` & `templateId`.
 */
export function enrichOrderWithLegacyTemplate<
  T extends {
    templateSlug?: string;
    templateId?: string;
    templateName?: string;
    planName?: string;
  }
>(order: T): T {
  const resolved = resolveLegacyOrderTemplate(order);
  if (!resolved) return order;
  if (order.templateSlug === resolved.templateSlug && order.templateId === resolved.templateId) {
    return order;
  }
  return {
    ...order,
    templateId: resolved.templateId,
    templateSlug: resolved.templateSlug,
    templateName: order.templateName || resolved.templateName,
  };
}

/**
 * Normalizes an invitation record in memory (read-only) so `tpl-N` aliases
 * resolve cleanly to canonical `template-N`.
 */
export function normalizeInvitationTemplateOnRead<
  T extends {
    templateSlug?: string;
    templateId?: string;
  }
>(inv: T): T {
  const resolved = resolveCanonicalTemplateMeta({
    templateSlug: inv.templateSlug,
    templateId: inv.templateId,
  });
  if (!resolved) return inv;
  if (inv.templateSlug === resolved.templateSlug && inv.templateId === resolved.templateId) {
    return inv;
  }
  return {
    ...inv,
    templateId: resolved.templateId,
    templateSlug: resolved.templateSlug,
  };
}

/**
 * Server-side template resolution for receipt/order creation & seeding.
 * Priority: request payload -> existing order -> linked invitations/{id}.
 * Strictly returns `null` if no valid template identifier exists anywhere
 * (never silently falls back to `'template-1'`).
 */
export function resolveServerOrderTemplate(params: {
  templateSlug?: string | null;
  templateId?: string | null;
  existingOrder?: TemplateLookupInput | null;
  existingInv?: TemplateLookupInput | null;
}): CanonicalTemplateMeta | null {
  const rawReqSlug = typeof params.templateSlug === 'string' ? params.templateSlug.trim() : '';
  const rawReqId = typeof params.templateId === 'string' ? params.templateId.trim() : '';

  if (rawReqSlug || rawReqId) {
    return resolveCanonicalTemplateMeta({
      templateSlug: rawReqSlug || undefined,
      templateId: rawReqId || undefined,
    });
  }

  const fromOrder = resolveCanonicalTemplateMeta(params.existingOrder);
  if (fromOrder) return fromOrder;

  const fromInv = resolveCanonicalTemplateMeta(params.existingInv);
  if (fromInv) return fromInv;

  return null;
}
