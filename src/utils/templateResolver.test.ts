import test from 'node:test';
import assert from 'node:assert/strict';
import { mockTemplates } from '../data/mockTemplates';
import {
  CANONICAL_TEMPLATE_CATALOG,
  normalizeTemplateSlug,
  toTemplateId,
  resolveCanonicalTemplateMeta,
  resolveTemplate,
  resolveLegacyOrderTemplate,
  enrichOrderWithLegacyTemplate,
  normalizeInvitationTemplateOnRead,
  resolveServerOrderTemplate,
} from './templateResolver';

test('normalizeTemplateSlug maps tpl-N, template-N, padded digits, and legacy aliases to canonical template-N', () => {
  assert.equal(normalizeTemplateSlug('template-1'), 'template-1');
  assert.equal(normalizeTemplateSlug('tpl-1'), 'template-1');
  assert.equal(normalizeTemplateSlug('tpl_05'), 'template-5');
  assert.equal(normalizeTemplateSlug('template-014'), 'template-14');
  assert.equal(normalizeTemplateSlug('20'), 'template-20');
  assert.equal(normalizeTemplateSlug('aurelia'), 'template-1');
  assert.equal(normalizeTemplateSlug('velvet'), 'template-3');
  assert.equal(normalizeTemplateSlug('Sapphire Midnight'), 'template-10');

  assert.equal(normalizeTemplateSlug('bad-slug'), null);
  assert.equal(normalizeTemplateSlug('template-99'), null);
  assert.equal(normalizeTemplateSlug('tpl-0'), null);
  assert.equal(normalizeTemplateSlug(''), null);
  assert.equal(normalizeTemplateSlug(undefined), null);
  assert.equal(normalizeTemplateSlug(null), null);
});

test('toTemplateId converts canonical slugs to tpl-N', () => {
  assert.equal(toTemplateId('template-1'), 'tpl-1');
  assert.equal(toTemplateId('template-14'), 'tpl-14');
  assert.equal(toTemplateId('template-20'), 'tpl-20');
});

test('resolveTemplate resolves all 20 canonical templates by templateSlug or templateId and NEVER falls back to mockTemplates[0]', () => {
  assert.equal(CANONICAL_TEMPLATE_CATALOG.length, 20);
  assert.equal(mockTemplates.length, 20);

  for (const tpl of mockTemplates) {
    const bySlug = resolveTemplate({ templateSlug: tpl.slug }, mockTemplates);
    assert.ok(bySlug, `Expected resolveTemplate to resolve ${tpl.slug}`);
    assert.equal(bySlug.template.slug, tpl.slug);
    assert.equal(bySlug.templateSlug, tpl.slug);
    assert.equal(bySlug.templateId, tpl.id);

    const byId = resolveTemplate({ templateId: tpl.id }, mockTemplates);
    assert.ok(byId, `Expected resolveTemplate to resolve ${tpl.id}`);
    assert.equal(byId.template.slug, tpl.slug);
    assert.equal(byId.templateSlug, tpl.slug);
  }

  // Cross-form alias resolution
  const fromTpl14 = resolveTemplate('tpl-14', mockTemplates);
  assert.equal(fromTpl14?.templateSlug, 'template-14');
  assert.equal(fromTpl14?.templateId, 'tpl-14');
  assert.equal(fromTpl14?.template.name, 'Botanical Garden');

  // Strict null on invalid or missing identifiers (must NOT return mockTemplates[0])
  assert.equal(resolveTemplate('bad-slug', mockTemplates), null);
  assert.equal(resolveTemplate({ templateSlug: 'unknown-tpl', templateId: 'tpl-999' }, mockTemplates), null);
  assert.equal(resolveTemplate({ templateSlug: '', templateId: '' }, mockTemplates), null);

  // Must NOT confuse InvitationData.slug / .id with templateSlug / templateId
  assert.equal(
    resolveTemplate(
      {
        id: 'inv-1',
        slug: 'ali-madina-1234',
        templateId: '',
        templateSlug: '',
      } as any,
      mockTemplates
    ),
    null
  );

  // Custom non-1..20 templates in catalog still resolve cleanly by exact slug/id
  const customCatalog = [
    ...mockTemplates,
    { id: 'tpl-custom-1', slug: 'custom-uz-gold', name: 'Custom Gold' },
  ];
  const customRes = resolveTemplate('custom-uz-gold', customCatalog);
  assert.equal(customRes?.template.id, 'tpl-custom-1');
  assert.equal(customRes?.templateSlug, 'custom-uz-gold');
});

test('resolveLegacyOrderTemplate & enrichOrderWithLegacyTemplate recover templateSlug/templateId from legacy names read-only', () => {
  const byTemplateName = resolveLegacyOrderTemplate({ templateName: 'Golden Symphony' });
  assert.equal(byTemplateName?.templateSlug, 'template-4');
  assert.equal(byTemplateName?.templateId, 'tpl-4');
  assert.equal(byTemplateName?.matchedBy, 'templateName');

  const byPlanName = resolveLegacyOrderTemplate({
    planName: 'Emerald Grace (60 000 so‘m)',
  });
  assert.equal(byPlanName?.templateSlug, 'template-5');
  assert.equal(byPlanName?.templateId, 'tpl-5');
  assert.equal(byPlanName?.matchedBy, 'planName');

  const byHistoricalName = resolveLegacyOrderTemplate({
    templateName: 'Royal Monogram',
  });
  assert.equal(byHistoricalName?.templateSlug, 'template-13');
  assert.equal(byHistoricalName?.templateId, 'tpl-13');

  const byHistoricalPlan = resolveLegacyOrderTemplate({
    planName: 'Silk & Pearls (90 000 UZS)',
  });
  assert.equal(byHistoricalPlan?.templateSlug, 'template-15');
  assert.equal(byHistoricalPlan?.templateId, 'tpl-15');

  // Unmatchable generic placeholder must return null
  assert.equal(resolveLegacyOrderTemplate({ planName: 'Standart Shablon' }), null);
  assert.equal(resolveLegacyOrderTemplate({ planName: 'Standard Plan' }), null);

  // Enrich returns new enriched object without mutating original order object
  const originalOrder = { id: 'ORD-1', templateName: 'Botanical Garden' };
  const enriched = enrichOrderWithLegacyTemplate(originalOrder);
  assert.equal(enriched.templateSlug, 'template-14');
  assert.equal(enriched.templateId, 'tpl-14');
  assert.equal((originalOrder as any).templateSlug, undefined);
});

test('normalizeInvitationTemplateOnRead normalizes tpl-N to canonical template-N', () => {
  const normalized = normalizeInvitationTemplateOnRead({
    id: 'inv-1',
    templateId: 'tpl-7',
    templateSlug: 'tpl-7',
  });
  assert.equal(normalized.templateSlug, 'template-7');
  assert.equal(normalized.templateId, 'tpl-7');
});

test('resolveServerOrderTemplate prioritizes request, falls back to existingOrder/existingInv, and rejects missing or bad slugs', () => {
  // Priority: request overrides existingInv
  const fromRequest = resolveServerOrderTemplate({
    templateSlug: 'tpl-14',
    existingOrder: { templateSlug: 'template-2' },
    existingInv: { templateSlug: 'template-3' },
  });
  assert.equal(fromRequest?.templateSlug, 'template-14');
  assert.equal(fromRequest?.templateId, 'tpl-14');

  // Fallback to existingOrder when omitted in request
  const fromOrder = resolveServerOrderTemplate({
    existingOrder: { templateSlug: 'template-9' },
    existingInv: { templateSlug: 'template-3' },
  });
  assert.equal(fromOrder?.templateSlug, 'template-9');

  // Fallback to existingInv when omitted in request and existingOrder
  const fromInv = resolveServerOrderTemplate({
    existingOrder: {},
    existingInv: { templateSlug: 'template-18', templateId: 'tpl-18' },
  });
  assert.equal(fromInv?.templateSlug, 'template-18');
  assert.equal(fromInv?.templateId, 'tpl-18');

  // Explicit invalid request slug is rejected even if existingInv has a template
  const badRequest = resolveServerOrderTemplate({
    templateSlug: 'bad-slug',
    existingInv: { templateSlug: 'template-5' },
  });
  assert.equal(badRequest, null);

  // Completely missing everywhere -> null (never defaults to template-1)
  const allMissing = resolveServerOrderTemplate({
    existingOrder: {},
    existingInv: {},
  });
  assert.equal(allMissing, null);
  assert.equal(resolveCanonicalTemplateMeta('nonexistent'), null);
});
