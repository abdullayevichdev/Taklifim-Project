import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminCode, verifyAdminRequest, isAdminCodeConfigured } from './adminAuth.js';

test('admin code is only accepted when ADMIN_ACCESS_CODE is set and matches exactly', () => {
  const prev = process.env.ADMIN_ACCESS_CODE;
  try {
    delete process.env.ADMIN_ACCESS_CODE;
    assert.equal(isAdminCodeConfigured(), false);
    assert.equal(verifyAdminCode(''), false);
    assert.equal(verifyAdminCode('anything'), false);

    process.env.ADMIN_ACCESS_CODE = 'test-code-123';
    assert.equal(isAdminCodeConfigured(), true);
    assert.equal(verifyAdminCode('test-code-123'), true);
    assert.equal(verifyAdminCode('  test-code-123 '), true);
    assert.equal(verifyAdminCode('test-code-12'), false);
    assert.equal(verifyAdminCode(123 as unknown), false);
    assert.equal(verifyAdminCode(undefined), false);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_ACCESS_CODE;
    else process.env.ADMIN_ACCESS_CODE = prev;
  }
});

test('admin API requests without a valid admin ID token are rejected', async () => {
  assert.equal(await verifyAdminRequest(undefined), false);
  assert.equal(await verifyAdminRequest('Bearer not-a-token'), false);
  assert.equal(await verifyAdminRequest('Basic abc'), false);
});
