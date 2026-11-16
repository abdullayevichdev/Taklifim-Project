import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCountdown,
  validateRSVPForm,
  formatPriceUZS,
  filterTemplates,
  calculateRSVPStats,
  normalizeTime24h,
  get24hTimeSlots,
  formatLocalizedFullDate,
  deriveEventTitleFromHosts,
  healStaleBuilderDraft,
  truncateFilenameMiddle,
  formatFileSize,
  resolveInvitationPaymentStatus,
  formatRelativeTimeLocalized,
  isReviewOverdue,
} from './logic';
import { Template, GuestRSVP } from '../types';

test('calculateCountdown returns remaining time accurately', () => {
  const baseNow = new Date('2026-06-01T12:00:00Z');
  const targetDate = '2026-06-02';
  const targetTime = '12:00';
  
  // 24 hours ahead
  const res = calculateCountdown(targetDate, targetTime, baseNow);
  assert.equal(res.isPassed, false);
  assert.equal(res.days >= 0, true);
});

test('calculateCountdown marks past events as isPassed with 0s', () => {
  const baseNow = new Date('2026-06-10T12:00:00Z');
  const targetDate = '2026-06-01';
  const res = calculateCountdown(targetDate, '10:00', baseNow);
  assert.equal(res.isPassed, true);
  assert.equal(res.days, 0);
  assert.equal(res.hours, 0);
});

test('validateRSVPForm validates full name and guest count', () => {
  const invalid = validateRSVPForm({ fullName: '', attending: true, guestCount: 0 });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.guestCount);

  const valid = validateRSVPForm({ fullName: 'Anvar Alimov', attending: true, guestCount: 2 });
  assert.equal(valid.isValid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('formatPriceUZS formats prices with Uzbek So‘m', () => {
  assert.equal(formatPriceUZS(0), '0 so‘m');
  assert.equal(formatPriceUZS(150000).includes('150 000'), true);
  assert.equal(formatPriceUZS(150000).includes('so‘m'), true);
});

test('filterTemplates filters by category and search term', () => {
  const mockList: Template[] = [
    {
      id: '1',
      slug: 'aurelia',
      name: 'Aurelia Royal',
      category: 'weddings',
      price: 150000,
      previewImage: '',
      description: { uz: 'Nafis to‘y taklifnomasi', ru: 'Свадьба', en: 'Wedding' },
      features: { uz: [], ru: [], en: [] },
      colorStyle: { primary: '#000', secondary: '#fff', accent: '#ccc', background: '#eee', text: '#111' },
      typography: { headingFont: 'serif', bodyFont: 'sans' },
      suitableFor: { uz: [], ru: [], en: [] },
      isPopular: true,
    },
    {
      id: '2',
      slug: 'bloom',
      name: 'Bloom Pastel',
      category: 'birthdays',
      price: 90000,
      previewImage: '',
      description: { uz: 'Tug‘ilgan kun bayrami', ru: 'День рождения', en: 'Birthday' },
      features: { uz: [], ru: [], en: [] },
      colorStyle: { primary: '#000', secondary: '#fff', accent: '#ccc', background: '#eee', text: '#111' },
      typography: { headingFont: 'serif', bodyFont: 'sans' },
      suitableFor: { uz: [], ru: [], en: [] },
      isNew: true,
    },
  ];

  const weddings = filterTemplates(mockList, { category: 'weddings' });
  assert.equal(weddings.length, 1);
  assert.equal(weddings[0].slug, 'aurelia');

  const searched = filterTemplates(mockList, { query: 'bloom' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].name, 'Bloom Pastel');
});

test('calculateRSVPStats calculates counts and attendance percentage correctly', () => {
  const sampleRSVPs: GuestRSVP[] = [
    { id: '1', invitationId: 'inv-1', fullName: 'Ali', attending: true, guestCount: 2, submittedAt: '2026-05-01' },
    { id: '2', invitationId: 'inv-1', fullName: 'Vali', attending: true, guestCount: 1, submittedAt: '2026-05-02' },
    { id: '3', invitationId: 'inv-1', fullName: 'Gani', attending: false, guestCount: 0, submittedAt: '2026-05-03' },
  ];

  const stats = calculateRSVPStats(sampleRSVPs);
  assert.equal(stats.total, 3);
  assert.equal(stats.attendingCount, 2);
  assert.equal(stats.declinedCount, 1);
  assert.equal(stats.totalGuests, 3);
  assert.equal(stats.acceptanceRate, 67);
});

test('normalizeTime24h converts 12h AM/PM and unpadded times cleanly to 24h HH:MM', () => {
  assert.equal(normalizeTime24h('6:00PM'), '18:00');
  assert.equal(normalizeTime24h('6:00 PM'), '18:00');
  assert.equal(normalizeTime24h('5:30 PM'), '17:30');
  assert.equal(normalizeTime24h('12:00 AM'), '00:00');
  assert.equal(normalizeTime24h('12:00 PM'), '12:00');
  assert.equal(normalizeTime24h('9:05'), '09:05');
  assert.equal(normalizeTime24h('19:00'), '19:00');
  assert.equal(normalizeTime24h('invalid', '18:00'), '18:00');

  const slots = get24hTimeSlots('18:10');
  assert.ok(slots.includes('18:00'));
  assert.ok(slots.includes('18:10'));
  assert.ok(slots.includes('23:45'));
});

test('formatLocalizedFullDate renders readable Uzbek, Russian, and English dates', () => {
  assert.equal(formatLocalizedFullDate('2026-09-24', 'uz'), '24 sentabr 2026, payshanba');
  const ru = formatLocalizedFullDate('2026-09-24', 'ru');
  assert.ok(ru.includes('24') && ru.includes('2026') && ru.includes('четверг'));
  const en = formatLocalizedFullDate('2026-09-24', 'en');
  assert.equal(en, '24 September 2026, Thursday');
});

test('deriveEventTitleFromHosts keeps default title synced while respecting custom titles', () => {
  const synced = deriveEventTitleFromHosts(
    'Abdulhay & Madina',
    'Asrorbek & Madina',
    'Asrorbek & Madina Nikoh To‘yi'
  );
  assert.equal(synced.wasAutoDerived, true);
  assert.equal(synced.nextTitle, 'Abdulhay & Madina Nikoh To‘yi');

  const custom = deriveEventTitleFromHosts(
    'Abdulhay & Madina',
    'Asrorbek & Madina',
    'Maxsus tantana kechasi'
  );
  assert.equal(custom.wasAutoDerived, false);
  assert.equal(custom.nextTitle, 'Maxsus tantana kechasi');

  const cleared = deriveEventTitleFromHosts('', 'Asrorbek & Madina', 'Asrorbek & Madina Nikoh To‘yi');
  assert.equal(cleared.nextTitle, 'Nikoh To‘yi');
  const retyped = deriveEventTitleFromHosts('Abdulhay & Madina', '', cleared.nextTitle);
  assert.equal(retyped.wasAutoDerived, true);
  assert.equal(retyped.nextTitle, 'Abdulhay & Madina Nikoh To‘yi');
});

test('healStaleBuilderDraft migrates legacy Asrorbek defaults when hostNames already changed', () => {
  const healed = healStaleBuilderDraft({
    status: 'draft',
    slug: 'asrorbek-madina-4135',
    hostNames: 'Abdulhay & Madina',
    eventTitle: 'Asrorbek & Madina Nikoh To‘yi',
    partner1Name: 'Asrorbek',
    partner2Name: 'Madina',
  });
  assert.equal(healed.eventTitle, 'Abdulhay & Madina Nikoh To‘yi');
  assert.equal(healed.partner1Name, 'Abdulhay');
  assert.equal(healed.partner2Name, 'Madina');
  assert.equal(healed.slug, 'abdulhay-madina-4135');
});

test('truncateFilenameMiddle preserves extension and fits within maxLength', () => {
  const longName = 'file_000000008a9882109d0d73368c0a7c3a.jpg';
  const truncated = truncateFilenameMiddle(longName, 20);
  assert.equal(truncated.endsWith('.jpg'), true);
  assert.ok(truncated.includes('…'));
  assert.ok(truncated.length <= 20);
  assert.equal(truncateFilenameMiddle('chek.pdf', 20), 'chek.pdf');
  assert.equal(formatFileSize(1536, 'uz'), '2 KB');
});

test('resolveInvitationPaymentStatus prioritizes live order and paid states over stale draft/pending flags', () => {
  assert.equal(resolveInvitationPaymentStatus({ status: 'draft' }), 'draft');
  assert.equal(resolveInvitationPaymentStatus({ status: 'pending_payment' }), 'pending_payment');
  assert.equal(resolveInvitationPaymentStatus({ status: 'pending_review' }), 'pending_review');
  assert.equal(resolveInvitationPaymentStatus({ status: 'paid' }), 'paid');
  assert.equal(resolveInvitationPaymentStatus({ status: 'published' }), 'paid');
  assert.equal(resolveInvitationPaymentStatus({ status: 'rejected' }), 'rejected');

  // Order status paid overrides stale invitation pending_review
  assert.equal(
    resolveInvitationPaymentStatus({ status: 'pending_review', paymentStatus: 'pending_review' }, { status: 'paid' }),
    'paid'
  );
  // Order status rejected overrides stale invitation pending_review
  assert.equal(
    resolveInvitationPaymentStatus({ status: 'pending_review' }, { status: 'rejected' }),
    'rejected'
  );
  // Re-uploaded receipt on previously rejected invitation moves back to pending_review
  assert.equal(
    resolveInvitationPaymentStatus({ status: 'rejected' }, { status: 'pending_review' }),
    'pending_review'
  );
  // Paid invitation never shows pending_review even if order sync lags
  assert.equal(
    resolveInvitationPaymentStatus({ status: 'paid' }, { status: 'pending_review' }),
    'paid'
  );
});

test('formatRelativeTimeLocalized and isReviewOverdue handle uz/ru/en and 2-hour thresholds', () => {
  const nowMs = Date.parse('2026-09-01T12:00:00.000Z');
  assert.equal(formatRelativeTimeLocalized('2026-09-01T11:59:30.000Z', 'uz', nowMs), 'Hozirgina');
  assert.equal(formatRelativeTimeLocalized('2026-09-01T11:25:00.000Z', 'uz', nowMs), '35 daqiqa oldin');
  assert.equal(formatRelativeTimeLocalized('2026-09-01T10:00:00.000Z', 'ru', nowMs), '2 ч. назад');
  assert.equal(formatRelativeTimeLocalized('2026-08-31T12:00:00.000Z', 'en', nowMs), '1d ago');

  assert.equal(isReviewOverdue('2026-09-01T10:30:00.000Z', 2, nowMs), false);
  assert.equal(isReviewOverdue('2026-09-01T09:59:00.000Z', 2, nowMs), true);
  assert.equal(isReviewOverdue(undefined, 2, nowMs), false);
});
