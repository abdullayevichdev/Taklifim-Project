import { describe, it, expect } from 'vitest';
import { generateInvitationSlug, cleanNameForSlug } from './slug';

describe('Slug Utility Tests', () => {
  it('should clean name with apostrophes correctly', () => {
    expect(cleanNameForSlug("O'ktam")).toBe('oktam');
    expect(cleanNameForSlug("G'ulnora")).toBe('gulnora');
    expect(cleanNameForSlug("O‘ktam")).toBe('oktam');
    expect(cleanNameForSlug("Gʻulnora")).toBe('gulnora');
  });

  it('should transliterate Cyrillic to Latin correctly', () => {
    expect(cleanNameForSlug('Шохрух')).toBe('shohruh');
    expect(cleanNameForSlug('Дилноза')).toBe('dilnoza');
    expect(cleanNameForSlug('Асрорбек')).toBe('asrorbek');
    expect(cleanNameForSlug('Мадина')).toBe('madina');
  });

  it('should generate expected slug for Asrorbek and Madina', () => {
    const slug = generateInvitationSlug('Asrorbek', 'Madina', '4135');
    expect(slug).toBe('asrorbek-madina-4135');
  });

  it('should generate expected slug for O\'ktam and G\'ulnora', () => {
    const slug = generateInvitationSlug("O'ktam", "G'ulnora", '1234');
    expect(slug).toBe('oktam-gulnora-1234');
  });

  it('should generate expected slug for Cyrillic names', () => {
    const slug = generateInvitationSlug('Шохрух', 'Дилноза', '9999');
    expect(slug).toBe('shohruh-dilnoza-9999');
  });

  it('should fallback to taklifnoma when names are empty', () => {
    const slug = generateInvitationSlug('', '', '5555');
    expect(slug).toBe('taklifnoma-5555');
  });
});
