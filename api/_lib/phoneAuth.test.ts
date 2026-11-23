import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  cleanOptionalEmail,
  cleanPersonName,
  generatePin,
  hashPin,
  normalizeUzPhoneDigits,
  phoneFromUid,
  phoneUid,
  validatePin,
  verifyPin,
} from './phoneAuth.js';

test('phone numbers normalize to 998XXXXXXXXX and map to stable uids', () => {
  assert.equal(normalizeUzPhoneDigits('+998 90 123 45 67'), '998901234567');
  assert.equal(normalizeUzPhoneDigits('901234567'), '998901234567');
  assert.equal(normalizeUzPhoneDigits('998901234567'), '998901234567');
  assert.equal(normalizeUzPhoneDigits('+7 999 123 45 67'), null);
  assert.equal(normalizeUzPhoneDigits('12345'), null);
  assert.equal(phoneUid('998901234567'), 'ph_998901234567');
  assert.equal(phoneFromUid('ph_998901234567'), '998901234567');
  assert.equal(phoneFromUid('google-uid-123'), null);
});

test('names and optional email are validated', () => {
  assert.equal(cleanPersonName('  Abdulhay  '), 'Abdulhay');
  assert.equal(cleanPersonName('O‘g‘iloy'), 'O‘g‘iloy');
  assert.equal(cleanPersonName('Аҳмаджон'), 'Аҳмаджон');
  assert.equal(cleanPersonName('A'), null);
  assert.equal(cleanPersonName('<script>'), null);
  assert.equal(cleanOptionalEmail(''), undefined);
  assert.equal(cleanOptionalEmail('Name@iCloud.com'), 'name@icloud.com');
  assert.equal(cleanOptionalEmail('not-an-email'), null);
});

test('PINs: 4 digits, weak codes rejected, scrypt hash verifies only the right PIN', () => {
  assert.equal(validatePin('7391').ok, true);
  assert.equal(validatePin('123').ok, false);
  assert.equal(validatePin('abcd').ok, false);
  assert.equal(validatePin('0000').ok, false);
  assert.equal(validatePin('1234').ok, false);
  const stored = hashPin('7391');
  assert.match(stored, /^scrypt\$/);
  assert.ok(!stored.includes('7391'));
  assert.equal(verifyPin('7391', stored), true);
  assert.equal(verifyPin('7392', stored), false);
  assert.equal(verifyPin('7391', 'garbage'), false);
  assert.notEqual(hashPin('7391'), stored); // salted
  for (let i = 0; i < 50; i++) assert.equal(validatePin(generatePin()).ok, true);
});

test('RTDB rules: phone accounts (PIN hashes) are never client-readable or writable', () => {
  const rules = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'database.rules.json'), 'utf8')).rules;
  assert.equal(rules.phoneAccounts['.write'], false);
  assert.equal(rules.phoneAccounts['.read'], undefined);
});
