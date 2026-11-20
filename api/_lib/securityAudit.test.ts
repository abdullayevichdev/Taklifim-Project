import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { deleteApp, getApps } from 'firebase-admin/app';
import {
  computeReceiptIdempotencyKey,
  processUploadReceipt,
  type UploadReceiptDeps,
} from './uploadReceiptService.js';
import {
  getAdminApp,
  getFirebaseAdminDiagnosticError,
  getRtdb,
  hasFirebaseAdmin,
  verifyBearerToken,
  type ReceiptAttemptRecord,
  type ServerOrder,
} from './firebaseAdmin.js';
import uploadReceiptHandler from '../payment/upload-receipt.js';
import paymentStatusHandler from '../payment/status/[orderId].js';
import telegramWebhookHandler from '../telegram/webhook.js';
import telegramLoginWebhookHandler from '../telegram/login-webhook.js';
import telegramAuthStartHandler from '../auth/telegram/start.js';
import telegramAuthClaimHandler from '../auth/telegram/claim.js';
import healthConfigHandler from '../health/config.js';
import {
  cleanPrivateKey,
  getPaymentTelegramConfig,
  getTelegramAuthBotUsername,
  getTelegramAuthConfig,
  validatePrivateKeyPem,
} from './env.js';
import { formatUzPhoneForDisplay, normalizePhoneE164 } from './phone.js';
import {
  claimTelegramLogin,
  handleTelegramCustomerMessage,
  startTelegramLogin,
  type TelegramAuthDeps,
} from './telegramAuth.js';
import {
  handleLoginTelegramUpdate,
  handlePaymentTelegramUpdate,
  handleTelegramUpdate,
  sanitizeTelegramErrorMessage,
  sendTelegramBotMessage,
} from './telegram.js';
import { checkExternalRateLimit, cleanupExpiredRateLimits } from './rateLimit.js';

// ---------------------------------------------------------------------------
// Minimal RTDB Security Rules Expression Evaluator (tests real database.rules.json)
// ---------------------------------------------------------------------------
class MockSnapshot {
  constructor(private readonly data: any) {}
  exists(): boolean {
    return this.data !== null && this.data !== undefined;
  }
  val(): any {
    return this.exists() ? this.data : null;
  }
  isString(): boolean {
    return typeof this.data === 'string';
  }
  isNumber(): boolean {
    return typeof this.data === 'number' && Number.isFinite(this.data);
  }
  isBoolean(): boolean {
    return typeof this.data === 'boolean';
  }
  child(pathStr: string): MockSnapshot {
    if (!this.exists() || typeof this.data !== 'object') {
      return new MockSnapshot(null);
    }
    const parts = String(pathStr).split('/').filter(Boolean);
    let cur: any = this.data;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return new MockSnapshot(null);
      }
    }
    return new MockSnapshot(cur);
  }
  hasChildren(keys: string[]): boolean {
    if (!this.exists() || typeof this.data !== 'object') return false;
    return keys.every((k) => this.child(k).exists());
  }
  parent(): MockSnapshot {
    throw new Error('parent() handled by PathSnapshot');
  }
}

class PathSnapshot extends MockSnapshot {
  constructor(
    private readonly rootTree: any,
    private readonly pathParts: string[],
    overrideValue?: any
  ) {
    const resolved =
      overrideValue !== undefined
        ? overrideValue
        : PathSnapshot.readAt(rootTree, pathParts);
    super(resolved);
  }
  static readAt(tree: any, parts: string[]): any {
    let cur = tree;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return null;
      }
    }
    return cur;
  }
  override parent(): PathSnapshot {
    if (this.pathParts.length === 0) return new PathSnapshot(this.rootTree, [], null);
    return new PathSnapshot(this.rootTree, this.pathParts.slice(0, -1));
  }
}

function setAtPath(tree: any, parts: string[], value: any): any {
  const clone = structuredClone(tree || {});
  if (parts.length === 0) return value;
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cur[key] || typeof cur[key] !== 'object') {
      cur[key] = {};
    }
    cur = cur[key];
  }
  const leaf = parts[parts.length - 1];
  if (value === null || value === undefined) {
    delete cur[leaf];
  } else {
    cur[leaf] = structuredClone(value);
  }
  return clone;
}

function evalRuleExpr(
  expr: string | boolean,
  ctx: {
    auth: { uid: string; token?: Record<string, any> } | null;
    root: MockSnapshot;
    data: PathSnapshot;
    newData: PathSnapshot;
    params: Record<string, string>;
    query?: { orderByChild?: string; equalTo?: any };
  }
): boolean {
  if (typeof expr === 'boolean') return expr;
  const transformed = expr.replace(/\.matches\(([^)]+)\)/g, (_m, re) => {
    return ` !== null && ${re}.test(String(${''}))`; // replaced per-var below
  });
  void transformed;

  // Bind RTDB RegExp helpers cleanly via String.prototype wrapper? Instead transform $var.matches(/re/)
  const finalExpr = expr.replace(
    /(\$[a-zA-Z0-9_]+)\.matches\(([^)]+)\)/g,
    '($2).test(String($1))'
  );

  const argNames = [
    'auth',
    'root',
    'data',
    'newData',
    'query',
    ...Object.keys(ctx.params),
  ];
  const argVals = [
    ctx.auth,
    ctx.root,
    ctx.data,
    ctx.newData,
    ctx.query || {},
    ...Object.values(ctx.params),
  ];

  try {
    const fn = new Function(...argNames, `return Boolean(${finalExpr});`);
    return Boolean(fn(...argVals));
  } catch {
    return false;
  }
}

function loadRules(): any {
  const raw = fs.readFileSync(path.resolve(process.cwd(), 'database.rules.json'), 'utf-8');
  return JSON.parse(raw);
}

function canRead(
  rulesNode: any,
  dbTree: any,
  pathParts: string[],
  auth: { uid: string } | null,
  query: { orderByChild?: string; equalTo?: any } = {}
): boolean {
  const root = new MockSnapshot(dbTree);
  let node = rulesNode.rules;
  const params: Record<string, string> = {};
  const walked: string[] = [];

  for (let i = 0; i <= pathParts.length; i++) {
    if (node && '.read' in node) {
      const dataSnap = new PathSnapshot(dbTree, walked);
      const allowed = evalRuleExpr(node['.read'], {
        auth,
        root,
        data: dataSnap,
        newData: dataSnap,
        params,
        query: i === pathParts.length ? query : {},
      });
      if (allowed) return true;
    }
    if (i === pathParts.length) break;
    const seg = pathParts[i];
    walked.push(seg);
    if (node && seg in node) {
      node = node[seg];
    } else if (node) {
      const wildcard = Object.keys(node).find((k) => k.startsWith('$'));
      if (!wildcard) return false;
      params[wildcard] = seg;
      node = node[wildcard];
    } else {
      return false;
    }
  }
  return false;
}

function canWrite(
  rulesNode: any,
  dbTree: any,
  pathParts: string[],
  newValue: any,
  auth: { uid: string } | null
): boolean {
  const root = new MockSnapshot(dbTree);
  const nextTree = setAtPath(dbTree, pathParts, newValue);

  let node = rulesNode.rules;
  const params: Record<string, string> = {};
  const walked: string[] = [];
  let writeAllowed = false;

  for (let i = 0; i <= pathParts.length; i++) {
    if (node && '.write' in node) {
      const dataSnap = new PathSnapshot(dbTree, walked);
      const newDataSnap = new PathSnapshot(nextTree, walked);
      if (
        evalRuleExpr(node['.write'], {
          auth,
          root,
          data: dataSnap,
          newData: newDataSnap,
          params,
        })
      ) {
        writeAllowed = true;
      }
    }
    if (i === pathParts.length) break;
    const seg = pathParts[i];
    walked.push(seg);
    if (node && seg in node) {
      node = node[seg];
    } else if (node) {
      const wildcard = Object.keys(node).find((k) => k.startsWith('$'));
      if (!wildcard) return false;
      params[wildcard] = seg;
      node = node[wildcard];
    } else {
      return writeAllowed;
    }
  }

  if (!writeAllowed) return false;

  // Evaluate ancestor .validate rules whenever ancestor exists in nextTree (Firebase RTDB semantics)
  let ancNode = rulesNode.rules;
  const ancParams: Record<string, string> = {};
  const ancWalked: string[] = [];
  for (let i = 0; i < pathParts.length; i++) {
    const seg = pathParts[i];
    ancWalked.push(seg);
    if (ancNode && seg in ancNode) {
      ancNode = ancNode[seg];
    } else if (ancNode) {
      const wildcard = Object.keys(ancNode).find((k) => k.startsWith('$'));
      if (!wildcard) break;
      ancParams[wildcard] = seg;
      ancNode = ancNode[wildcard];
    } else {
      break;
    }
    if (i < pathParts.length - 1 && ancNode && '.validate' in ancNode) {
      const ancOld = new PathSnapshot(dbTree, ancWalked);
      const ancNew = new PathSnapshot(nextTree, ancWalked);
      if (ancNew.exists()) {
        if (
          !evalRuleExpr(ancNode['.validate'], {
            auth,
            root,
            data: ancOld,
            newData: ancNew,
            params: { ...ancParams },
          })
        ) {
          return false;
        }
      }
    }
  }

  // Validate target node + child rules when writing non-null data (Firebase RTDB skips .validate on null deletes)
  const validateSubtree = (
    ruleSubtree: any,
    subParts: string[],
    subParams: Record<string, string>
  ): boolean => {
    const oldSnap = new PathSnapshot(dbTree, subParts);
    const newSnap = new PathSnapshot(nextTree, subParts);
    if (!newSnap.exists()) return true;

    if (ruleSubtree && '.validate' in ruleSubtree) {
      if (
        !evalRuleExpr(ruleSubtree['.validate'], {
          auth,
          root,
          data: oldSnap,
          newData: newSnap,
          params: subParams,
        })
      ) {
        return false;
      }
    }

    if (ruleSubtree && typeof ruleSubtree === 'object') {
      const childKeys = new Set<string>();
      if (typeof newSnap.val() === 'object' && newSnap.val() !== null) {
        Object.keys(newSnap.val()).forEach((k) => childKeys.add(k));
      }
      for (const k of Object.keys(ruleSubtree)) {
        if (!k.startsWith('.') && !k.startsWith('$')) childKeys.add(k);
      }

      const wildcard = Object.keys(ruleSubtree).find((k) => k.startsWith('$'));
      for (const ck of childKeys) {
        if (ck in ruleSubtree) {
          if (!validateSubtree(ruleSubtree[ck], [...subParts, ck], subParams)) {
            return false;
          }
        } else if (wildcard) {
          if (
            !validateSubtree(ruleSubtree[wildcard], [...subParts, ck], {
              ...subParams,
              [wildcard]: ck,
            })
          ) {
            return false;
          }
        }
      }
    }

    return true;
  };

  return validateSubtree(node, pathParts, params);
}

// ---------------------------------------------------------------------------
// 1. Firebase Rules Security & Transition Tests
// ---------------------------------------------------------------------------
test('RTDB Rules: database.rules.json is valid JSON and enforces strict defaults', () => {
  const rules = loadRules();
  assert.equal(rules.rules['.read'], false);
  assert.equal(rules.rules['.write'], false);
  assert.equal(rules.rules.templates['.read'], true);
  assert.equal(rules.rules.templates['.write'], false);
  assert.equal(rules.rules.receiptAttempts['.read'], false);
  assert.equal(rules.rules.receiptAttempts['.write'], false);
  assert.equal(rules.rules.messages['.read'], false);
  assert.equal(rules.rules.messages['.write'], false);
});

test('RTDB Rules: invitations & paymentStatus transitions enforce two-way draft<->pending_payment and block privilege escalation', () => {
  const rules = loadRules();
  const baseDb: any = {
    invitations: {
      'inv-draft': {
        id: 'inv-draft',
        slug: 'ali-vali-1234',
        ownerId: 'uid-alice',
        ownerUid: 'uid-alice',
        status: 'draft',
        paymentStatus: 'draft',
      },
      'inv-paid': {
        id: 'inv-paid',
        slug: 'paid-slug-1111',
        ownerId: 'uid-alice',
        ownerUid: 'uid-alice',
        status: 'paid',
        paymentStatus: 'paid',
        orderId: 'ORD-111',
      },
      'inv-legacy-paid': {
        id: 'inv-legacy-paid',
        slug: 'legacy-paid',
        ownerId: 'uid-alice',
        status: 'paid',
      },
    },
    slugs: {
      'ali-vali-1234': 'inv-draft',
      'paid-slug-1111': 'inv-paid',
    },
  };

  const alice = { uid: 'uid-alice' };
  const bob = { uid: 'uid-bob' };

  // Two-way draft <-> pending_payment allowed for owner
  assert.equal(
    canWrite(rules, baseDb, ['invitations', 'inv-draft', 'paymentStatus'], 'pending_payment', alice),
    true
  );
  const dbPending = setAtPath(baseDb, ['invitations', 'inv-draft', 'paymentStatus'], 'pending_payment');
  assert.equal(
    canWrite(rules, dbPending, ['invitations', 'inv-draft', 'paymentStatus'], 'draft', alice),
    true
  );

  // Client CANNOT escalate paymentStatus to paid, published, pending_review, or rejected
  for (const forbidden of ['paid', 'published', 'pending_review', 'rejected']) {
    assert.equal(
      canWrite(rules, baseDb, ['invitations', 'inv-draft', 'paymentStatus'], forbidden, alice),
      false,
      `Must block client paymentStatus=${forbidden}`
    );
    assert.equal(
      canWrite(rules, baseDb, ['invitations', 'inv-draft', 'status'], forbidden, alice),
      false,
      `Must block client status=${forbidden}`
    );
  }

  // Client CANNOT downgrade paid -> draft or add draft paymentStatus onto legacy paid inv
  assert.equal(
    canWrite(rules, baseDb, ['invitations', 'inv-paid', 'paymentStatus'], 'draft', alice),
    false
  );
  assert.equal(
    canWrite(rules, baseDb, ['invitations', 'inv-legacy-paid', 'paymentStatus'], 'draft', alice),
    false
  );
  // Client CANNOT null out status/paymentStatus on existing invitation
  assert.equal(
    canWrite(rules, baseDb, ['invitations', 'inv-paid', 'status'], null, alice),
    false
  );
  // Owner CAN delete entire invitation
  assert.equal(
    canWrite(rules, baseDb, ['invitations', 'inv-draft'], null, alice),
    true
  );

  // Cross-user isolation: Bob cannot read/write Alice's draft, cannot hijack ownerUid, cannot bind slug to Alice's inv
  assert.equal(canRead(rules, baseDb, ['invitations', 'inv-draft'], bob), false);
  assert.equal(canWrite(rules, baseDb, ['invitations', 'inv-draft', 'hostNames'], 'Hacked', bob), false);
  assert.equal(
    canWrite(
      rules,
      baseDb,
      ['invitations', 'inv-bob-spoof'],
      { id: 'inv-bob-spoof', ownerId: 'uid-bob', ownerUid: 'uid-alice', status: 'draft', paymentStatus: 'draft' },
      bob
    ),
    false
  );
  assert.equal(canWrite(rules, baseDb, ['slugs', 'bob-hijack'], 'inv-draft', bob), false);
  assert.equal(
    canWrite(rules, baseDb, ['invitations', 'inv-draft', 'receiptUrl'], 'https://evil.com/x.jpg', alice),
    false
  );
  assert.equal(
    canWrite(rules, baseDb, ['invitations', 'inv-draft', 'customerPhone'], '+998901234567', alice),
    false
  );
});

test('RTDB Rules: templates, guests, and messages prevent unauthorized reads, spam, overwrites, and cross-user access', () => {
  const rules = loadRules();
  const alice = { uid: 'uid-alice' };
  const bob = { uid: 'uid-bob' };

  const dbTree = {
    templates: {
      'tpl-1': { id: 'tpl-1', name: 'Aurelia' },
    },
    slugs: {
      'paid-wedding': 'inv-paid',
      'draft-wedding': 'inv-draft',
    },
    invitations: {
      'inv-paid': { id: 'inv-paid', slug: 'paid-wedding', ownerId: 'uid-alice', ownerUid: 'uid-alice', status: 'paid' },
      'inv-draft': { id: 'inv-draft', slug: 'draft-wedding', ownerId: 'uid-alice', ownerUid: 'uid-alice', status: 'draft' },
    },
    guests: {
      'g-1700000000000-1': {
        id: 'g-1700000000000-1',
        invitationId: 'inv-paid',
        invitationSlug: 'paid-wedding',
        invitationOwnerId: 'uid-alice',
        fullName: 'Sardor Karimov',
        phone: '+998901112233',
        attending: true,
        guestCount: 2,
        submittedAt: '16.11.2026',
      },
    },
    messages: {
      'msg-1700000000000-ab12': {
        id: 'msg-1700000000000-ab12',
        name: 'Aziz',
        contact: '+998909998877',
        subject: 'Savol',
        message: 'Salom',
        status: 'new',
        createdAt: '16.11.2026',
      },
    },
  };

  // Templates: public read, NO client writes even when logged in
  assert.equal(canRead(rules, dbTree, ['templates'], null), true);
  assert.equal(canWrite(rules, dbTree, ['templates', 'tpl-1', 'name'], 'Defaced', alice), false);
  assert.equal(canWrite(rules, dbTree, ['templates', 'tpl-new'], { id: 'tpl-new' }, alice), false);

  // Messages: private (no read), create-only, no overwrite/delete, no forged status or spam fields
  assert.equal(canRead(rules, dbTree, ['messages'], null), false);
  assert.equal(canRead(rules, dbTree, ['messages', 'msg-1700000000000-ab12'], bob), false);
  assert.equal(
    canWrite(
      rules,
      dbTree,
      ['messages', 'msg-1700000001111-xy99'],
      {
        id: 'msg-1700000001111-xy99',
        name: 'Dilnoza',
        contact: '+998901234567',
        subject: 'Buyurtma',
        message: 'Yordam kerak edi',
        status: 'new',
        createdAt: '16.11.2026',
      },
      null
    ),
    true
  );
  // Overwrite / delete / forged status / extra payload blocked
  assert.equal(
    canWrite(rules, dbTree, ['messages', 'msg-1700000000000-ab12', 'message'], 'Tampered', alice),
    false
  );
  assert.equal(canWrite(rules, dbTree, ['messages', 'msg-1700000000000-ab12'], null, alice), false);
  assert.equal(
    canWrite(
      rules,
      dbTree,
      ['messages', 'msg-1700000002222-aa11'],
      {
        id: 'msg-1700000002222-aa11',
        name: 'Spam',
        contact: '12345',
        subject: 'Sub',
        message: 'Hi',
        status: 'read',
        createdAt: 'today',
      },
      null
    ),
    false
  );
  assert.equal(
    canWrite(
      rules,
      dbTree,
      ['messages', 'msg-1700000003333-bb22'],
      {
        id: 'msg-1700000003333-bb22',
        name: 'Spam',
        contact: '12345',
        subject: 'Sub',
        message: 'Hi',
        status: 'new',
        createdAt: 'today',
        evilExtra: 'payload',
      },
      null
    ),
    false
  );

  // Guests: root unscoped read blocked, cross-user query blocked, draft-slug query blocked
  assert.equal(canRead(rules, dbTree, ['guests'], null), false);
  assert.equal(canRead(rules, dbTree, ['guests'], bob, { orderByChild: 'invitationOwnerId', equalTo: 'uid-alice' }), false);
  assert.equal(canRead(rules, dbTree, ['guests'], null, { orderByChild: 'invitationSlug', equalTo: 'draft-wedding' }), false);
  assert.equal(canRead(rules, dbTree, ['guests', 'g-1700000000000-1'], bob), false);

  // Allowed reads: Alice (owner) query, Alice direct read, Guest query for paid wedding slug
  assert.equal(canRead(rules, dbTree, ['guests'], alice, { orderByChild: 'invitationOwnerId', equalTo: 'uid-alice' }), true);
  assert.equal(canRead(rules, dbTree, ['guests', 'g-1700000000000-1'], alice), true);
  assert.equal(canRead(rules, dbTree, ['guests'], null, { orderByChild: 'invitationSlug', equalTo: 'paid-wedding' }), true);

  // Guests create: allowed for valid RSVP on paid invitation
  assert.equal(
    canWrite(
      rules,
      dbTree,
      ['guests', 'g-1700000005555-77'],
      {
        id: 'g-1700000005555-77',
        invitationId: 'inv-paid',
        invitationSlug: 'paid-wedding',
        invitationOwnerId: 'uid-alice',
        fullName: 'Nodira',
        phone: '+998911234567',
        attending: true,
        guestCount: 3,
        message: 'Baxtli boling!',
        submittedAt: '16.11.2026',
      },
      null
    ),
    true
  );

  // Guests spam/tampering blocked: unpaid inv, wrong ownerId, count > 20, update existing, Bob deleting Alice's guest
  assert.equal(
    canWrite(
      rules,
      dbTree,
      ['guests', 'g-1700000006666-88'],
      {
        id: 'g-1700000006666-88',
        invitationId: 'inv-draft',
        invitationSlug: 'draft-wedding',
        invitationOwnerId: 'uid-alice',
        fullName: 'Test',
        attending: true,
        guestCount: 1,
        submittedAt: '16.11.2026',
      },
      null
    ),
    false
  );
  assert.equal(
    canWrite(
      rules,
      dbTree,
      ['guests', 'g-1700000007777-99'],
      {
        id: 'g-1700000007777-99',
        invitationId: 'inv-paid',
        invitationSlug: 'paid-wedding',
        invitationOwnerId: 'uid-bob',
        fullName: 'SpoofOwner',
        attending: true,
        guestCount: 1,
        submittedAt: '16.11.2026',
      },
      null
    ),
    false
  );
  assert.equal(
    canWrite(
      rules,
      dbTree,
      ['guests', 'g-1700000008888-11'],
      {
        id: 'g-1700000008888-11',
        invitationId: 'inv-paid',
        invitationSlug: 'paid-wedding',
        invitationOwnerId: 'uid-alice',
        fullName: 'Overflow',
        attending: true,
        guestCount: 500,
        submittedAt: '16.11.2026',
      },
      null
    ),
    false
  );
  assert.equal(canWrite(rules, dbTree, ['guests', 'g-1700000000000-1', 'fullName'], 'Edited', alice), false);
  assert.equal(canWrite(rules, dbTree, ['guests', 'g-1700000000000-1'], null, bob), false);
  assert.equal(canWrite(rules, dbTree, ['guests', 'g-1700000000000-1'], null, alice), true);
});

// ---------------------------------------------------------------------------
// 2. Upload Receipt Idempotency & Partial Failure Recovery Tests
// ---------------------------------------------------------------------------
function makeInMemoryDeps(overrides: Partial<UploadReceiptDeps> = {}) {
  const orders = new Map<string, ServerOrder>();
  const attempts = new Map<string, ReceiptAttemptRecord>();
  const invitations = new Map<string, Record<string, any>>();
  let tgSendCount = 0;

  invitations.set('inv-1', {
    id: 'inv-1',
    slug: 'ali-madina-1234',
    templateId: 'tpl-1',
    templateSlug: 'template-1',
    ownerId: 'uid-alice',
    ownerUid: 'uid-alice',
    status: 'pending_payment',
  });

  const deps: UploadReceiptDeps = {
    hasFirebaseAdmin: () => true,
    checkRateLimit: () => true,
    validateOrderBeforeReceipt: async ({ verifiedUid, orderId, invitationId }) => {
      const existingOrder = orders.get(orderId) || null;
      if (existingOrder?.ownerUid && existingOrder.ownerUid !== verifiedUid) {
        return { ok: false, statusCode: 403, error: 'Forbidden' };
      }
      if (existingOrder?.status === 'paid') {
        return { ok: false, statusCode: 400, error: 'Already paid' };
      }
      const invId = invitationId || existingOrder?.invitationId;
      const existingInv = invId ? invitations.get(invId) || null : null;
      const invOwner = existingInv?.ownerUid || existingInv?.ownerId;
      if (invOwner && invOwner !== verifiedUid) {
        return { ok: false, statusCode: 403, error: 'Forbidden inv' };
      }
      return { ok: true, existingOrder, existingInv };
    },
    getReceiptAttempt: async (key) => attempts.get(key) || null,
    seedPreflightOrderRecord: async (p) => {
      const preservedStatus =
        p.existingOrder?.status === 'rejected'
          ? 'rejected'
          : p.existingOrder?.status === 'pending_review'
          ? 'pending_review'
          : 'pending_payment';
      orders.set(p.orderId, {
        ...(p.existingOrder || {}),
        id: p.orderId,
        orderId: p.orderId,
        ownerUid: p.verifiedUid,
        invitationId: p.invitationId,
        invitationSlug: p.invitationSlug,
        templateId: p.templateId,
        templateSlug: p.templateSlug,
        customerName: p.customerName,
        customerPhone: p.customerPhone,
        price: p.price,
        status: preservedStatus,
        createdAt: p.existingOrder?.createdAt || p.nowIso,
        updatedAt: p.nowIso,
      });
    },
    sendReceiptToTelegram: async () => {
      tgSendCount += 1;
      return { ok: true, messageId: 9000 + tgSendCount };
    },
    markTelegramAttemptDispatched: async (p) => {
      attempts.set(p.attemptKey, {
        key: p.attemptKey,
        orderId: p.orderId,
        ownerUid: p.verifiedUid,
        telegramSent: true,
        telegramMessageId: p.telegramMessageId,
        committed: false,
        updatedAt: p.nowIso,
      });
      const ord = orders.get(p.orderId);
      if (ord) {
        (ord as any).dispatchedAttempt = {
          key: p.attemptKey,
          telegramSent: true,
          messageId: p.telegramMessageId,
        };
      }
    },
    commitOrderPendingReview: async (p) => {
      const ord: ServerOrder = {
        ...(orders.get(p.orderId) || {}),
        id: p.orderId,
        orderId: p.orderId,
        ownerUid: p.verifiedUid,
        invitationId: p.invitationId,
        invitationSlug: p.invitationSlug,
        templateId: p.templateId,
        templateSlug: p.templateSlug,
        customerName: p.customerName,
        customerPhone: p.customerPhone,
        price: p.price,
        status: 'pending_review',
        telegramMessageId: p.telegramMessageId,
        lastIdempotencyKey: p.idempotencyKey,
        receiptSentAt: p.nowIso,
        createdAt: orders.get(p.orderId)?.createdAt || p.nowIso,
        updatedAt: p.nowIso,
      };
      delete (ord as any).dispatchedAttempt;
      orders.set(p.orderId, ord);
      if (p.invitationId && invitations.has(p.invitationId)) {
        invitations.set(p.invitationId, {
          ...invitations.get(p.invitationId),
          status: 'pending_review',
          paymentStatus: 'pending_review',
          orderId: p.orderId,
        });
      }
      if (p.idempotencyKey) {
        attempts.set(p.idempotencyKey, {
          key: p.idempotencyKey,
          orderId: p.orderId,
          ownerUid: p.verifiedUid,
          telegramSent: true,
          telegramMessageId: p.telegramMessageId,
          committed: true,
          updatedAt: p.nowIso,
        });
      }
      return { ok: true, orderData: ord };
    },
    ...overrides,
  };

  return {
    deps,
    orders,
    attempts,
    invitations,
    getTgCount: () => tgSendCount,
  };
}

test('upload-receipt: recovers cleanly when Telegram succeeds but Firebase commit fails, without sending duplicate Telegram messages', async () => {
  let failCommit = true;
  const ctx = makeInMemoryDeps({
    commitOrderPendingReview: async (p) => {
      if (failCommit) {
        throw new Error('RTDB temporary outage');
      }
      const ord: ServerOrder = {
        ...(ctx.orders.get(p.orderId) || {}),
        id: p.orderId,
        orderId: p.orderId,
        ownerUid: p.verifiedUid,
        invitationId: p.invitationId,
        invitationSlug: p.invitationSlug,
        customerName: p.customerName,
        customerPhone: p.customerPhone,
        price: p.price,
        status: 'pending_review',
        telegramMessageId: p.telegramMessageId,
        lastIdempotencyKey: p.idempotencyKey,
        receiptSentAt: p.nowIso,
        createdAt: ctx.orders.get(p.orderId)?.createdAt || p.nowIso,
        updatedAt: p.nowIso,
      };
      delete (ord as any).dispatchedAttempt;
      ctx.orders.set(p.orderId, ord);
      if (p.idempotencyKey) {
        ctx.attempts.set(p.idempotencyKey, {
          key: p.idempotencyKey,
          orderId: p.orderId,
          ownerUid: p.verifiedUid,
          telegramSent: true,
          telegramMessageId: p.telegramMessageId,
          committed: true,
          updatedAt: p.nowIso,
        });
      }
      return { ok: true, orderData: ord };
    },
  });

  const baseCmd = {
    verifiedUid: 'uid-alice',
    orderId: 'ORD-500001',
    invitationId: 'inv-1',
    invitationSlug: 'ali-madina-1234',
    templateId: 'tpl-1',
    templateSlug: 'template-1',
    customerName: 'Ali & Madina',
    customerPhone: '+998901234567',
    templateName: 'Aurelia',
    weddingDate: '2026-10-10',
    venueName: 'Versal',
    price: 60000,
    isPdf: false,
    fileBuffer: Buffer.from('same-receipt-bytes-123'),
  };

  // Attempt 1: Telegram succeeds, commit throws -> returns 503 retryable, order preflight saved
  const res1 = await processUploadReceipt(baseCmd, ctx.deps);
  assert.equal(res1.statusCode, 503);
  assert.equal(res1.body.success, false);
  assert.equal(res1.body.retryable, true);
  assert.equal(ctx.getTgCount(), 1);
  assert.equal(ctx.orders.get('ORD-500001')?.invitationId, 'inv-1');

  // Attempt 2 (retry when RTDB recovers): SKIPS Telegram (still 1!) and commits cleanly
  failCommit = false;
  const res2 = await processUploadReceipt(baseCmd, ctx.deps);
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.success, true);
  assert.equal(res2.body.recovered, true);
  assert.equal(res2.body.status, 'pending_review');
  assert.equal(ctx.getTgCount(), 1);

  // Attempt 3 (duplicate retry of already committed receipt): returns deduplicated 200, still 1 Telegram call
  const res3 = await processUploadReceipt(baseCmd, ctx.deps);
  assert.equal(res3.statusCode, 200);
  assert.equal(res3.body.success, true);
  assert.equal(res3.body.deduplicated, true);
  assert.equal(ctx.getTgCount(), 1);

  // Attempt 4 (different file while already pending_review): returns 409, no Telegram spam
  const res4 = await processUploadReceipt(
    { ...baseCmd, fileBuffer: Buffer.from('another-receipt-bytes') },
    ctx.deps
  );
  assert.equal(res4.statusCode, 409);
  assert.equal(res4.body.status, 'pending_review');
  assert.equal(ctx.getTgCount(), 1);
});

test('upload-receipt: blocks cross-user access (403), paid orders (400), handles concurrency lock, and allows re-upload after rejection', async () => {
  let resolveSlowTg!: (val: { ok: boolean; messageId: number }) => void;
  const slowTgPromise = new Promise<{ ok: boolean; messageId: number }>((res) => {
    resolveSlowTg = res;
  });
  let slowCalls = 0;

  const ctx = makeInMemoryDeps({
    sendReceiptToTelegram: async () => {
      slowCalls += 1;
      if (slowCalls === 1) return slowTgPromise;
      return { ok: true, messageId: 9099 };
    },
  });

  const cmd = {
    verifiedUid: 'uid-alice',
    orderId: 'ORD-777001',
    invitationId: 'inv-1',
    invitationSlug: 'ali-madina-1234',
    templateId: 'tpl-1',
    templateSlug: 'template-1',
    customerName: 'Ali & Madina',
    customerPhone: '+998901234567',
    templateName: 'Aurelia',
    weddingDate: '2026-10-10',
    venueName: 'Versal',
    price: 60000,
    isPdf: false,
    fileBuffer: Buffer.from('receipt-bytes-xyz'),
  };

  // Concurrent double-click shares 1 execution and 1 Telegram call
  const p1 = processUploadReceipt(cmd, ctx.deps);
  const p2 = processUploadReceipt(cmd, ctx.deps);
  resolveSlowTg({ ok: true, messageId: 9001 });
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.statusCode, 200);
  assert.equal(r2.statusCode, 200);
  assert.equal(slowCalls, 1);

  // Cross-user (Bob) trying to upload to Alice's order -> 403 before Telegram
  const rBob = await processUploadReceipt({ ...cmd, verifiedUid: 'uid-bob' }, ctx.deps);
  assert.equal(rBob.statusCode, 403);
  assert.equal(slowCalls, 1);

  // Simulate admin rejection -> Alice CAN re-upload even the same file!
  const ord = ctx.orders.get('ORD-777001')!;
  ctx.orders.set('ORD-777001', {
    ...ord,
    status: 'rejected',
    decidedAt: '2026-11-16T08:10:00.000Z',
  });
  const keyAfterReject = computeReceiptIdempotencyKey({
    verifiedUid: cmd.verifiedUid,
    orderId: cmd.orderId,
    customerPhone: cmd.customerPhone,
    isPdf: cmd.isPdf,
    fileBuffer: cmd.fileBuffer,
    existingOrder: ctx.orders.get('ORD-777001'),
  });
  const rReupload = await processUploadReceipt(cmd, ctx.deps);
  assert.equal(rReupload.statusCode, 200);
  assert.equal(rReupload.body.status, 'pending_review');
  assert.equal(slowCalls, 2);
  assert.equal(ctx.attempts.get(keyAfterReject)?.committed, true);

  // Simulate admin approval -> Paid order blocks any further upload (400)
  ctx.orders.set('ORD-777001', {
    ...ctx.orders.get('ORD-777001')!,
    status: 'paid',
  });
  const rPaid = await processUploadReceipt(cmd, ctx.deps);
  assert.equal(rPaid.statusCode, 400);
  assert.equal(slowCalls, 2);
});

// ---------------------------------------------------------------------------
// 3. CJS/ESM Compatibility, Firebase ID Token Verification & Vercel Handler Tests
// ---------------------------------------------------------------------------
function makeMockVercelRes() {
  const headers: Record<string, string> = {};
  const state: { statusCode: number; body: any; headers: Record<string, string> } = {
    statusCode: 200,
    body: undefined,
    headers,
  };
  const res: any = {
    setHeader(name: string, val: string) {
      headers[name] = val;
      return res;
    },
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.body = payload;
      return res;
    },
  };
  return { res, state };
}

test('CJS/ESM compatibility: jwks-rsa require(jose) and firebase-admin/auth load without ERR_REQUIRE_ESM', async () => {
  const req = createRequire(import.meta.url);
  const jwks = req('jwks-rsa');
  const jose = req('jose');
  const adminApp = req('firebase-admin/app');
  const adminAuth = req('firebase-admin/auth');

  assert.equal(typeof jwks, 'function');
  assert.equal(typeof jose.jwtVerify, 'function');
  assert.equal(typeof adminAuth.getAuth, 'function');

  const appName = `cjs-esm-test-${Date.now()}`;
  const app = adminApp.initializeApp({ projectId: 'test-project' }, appName);
  try {
    await assert.rejects(
      () => adminAuth.getAuth(app).verifyIdToken('invalid.jwt.token'),
      (err: any) => err?.code === 'auth/argument-error'
    );
  } finally {
    await adminApp.deleteApp(app);
  }
});

test('verifyBearerToken handles missing/malformed headers and missing credentials cleanly', async () => {
  assert.equal(await verifyBearerToken(undefined), null);
  assert.equal(await verifyBearerToken(''), null);
  assert.equal(await verifyBearerToken('Basic abcdef'), null);
  assert.equal(await verifyBearerToken('Bearer   '), null);
  assert.equal(await verifyBearerToken(['Bearer   ']), null);
  // With a non-JWT token and without real Firebase project/network match, never throws 500
  const result = await verifyBearerToken('Bearer invalid.token.value');
  assert.equal(result, null);
});

test('POST /api/payment/upload-receipt handler rejects non-POST (405) and unauthenticated requests (401) cleanly', async () => {
  const getMock = makeMockVercelRes();
  await uploadReceiptHandler({ method: 'GET', headers: {} } as any, getMock.res);
  assert.equal(getMock.state.statusCode, 405);
  assert.equal(getMock.state.headers.Allow, 'POST');

  const postNoAuth = makeMockVercelRes();
  await uploadReceiptHandler(
    {
      method: 'POST',
      headers: {},
      body: { orderId: 'ORD-1', customerPhone: '+998901234567' },
    } as any,
    postNoAuth.res
  );
  assert.equal(postNoAuth.state.statusCode, 401);
  assert.equal(postNoAuth.state.body.success, false);
});

test('GET /api/payment/status/[orderId] rejects non-GET (405) and unauthenticated requests (401)', async () => {
  const postMock = makeMockVercelRes();
  await paymentStatusHandler({ method: 'POST', headers: {}, query: {} } as any, postMock.res);
  assert.equal(postMock.state.statusCode, 405);

  const getNoAuth = makeMockVercelRes();
  await paymentStatusHandler(
    { method: 'GET', headers: {}, query: { orderId: 'ORD-1' } } as any,
    getNoAuth.res
  );
  assert.equal(getNoAuth.state.statusCode, 401);
  assert.equal(getNoAuth.state.body.success, false);
});

test('POST /api/telegram/webhook validates method (405), constant-time secret token (401), and returns 200 for authenticated updates even on internal failure', async () => {
  const prevSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret-xyz';
  try {
    const getMock = makeMockVercelRes();
    await telegramWebhookHandler({ method: 'GET', headers: {} } as any, getMock.res);
    assert.equal(getMock.state.statusCode, 405);

    const missingSecretMock = makeMockVercelRes();
    await telegramWebhookHandler(
      {
        method: 'POST',
        headers: {},
        body: { update_id: 1 },
      } as any,
      missingSecretMock.res
    );
    assert.equal(missingSecretMock.state.statusCode, 401);

    const badSecretMock = makeMockVercelRes();
    await telegramWebhookHandler(
      {
        method: 'POST',
        headers: { 'x-telegram-bot-api-secret-token': 'wrong-secret' },
        body: { update_id: 1 },
      } as any,
      badSecretMock.res
    );
    assert.equal(badSecretMock.state.statusCode, 401);

    const okMock = makeMockVercelRes();
    await telegramWebhookHandler(
      {
        method: 'POST',
        headers: { 'x-telegram-bot-api-secret-token': 'test-webhook-secret-xyz' },
        body: { update_id: 2 },
      } as any,
      okMock.res
    );
    assert.equal(okMock.state.statusCode, 200);
    assert.deepEqual(okMock.state.body, { status: 'ok' });

    // Even if update has a malformed string body or internal processing error (e.g. missing Firebase), returns 200 to prevent Telegram retry storms
    const malformedBodyMock = makeMockVercelRes();
    await telegramWebhookHandler(
      {
        method: 'POST',
        headers: { 'x-telegram-bot-api-secret-token': 'test-webhook-secret-xyz' },
        body: '{invalid-json',
      } as any,
      malformedBodyMock.res
    );
    assert.equal(malformedBodyMock.state.statusCode, 200);
    assert.deepEqual(malformedBodyMock.state.body, { status: 'ok' });
  } finally {
    if (prevSecret === undefined) {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    } else {
      process.env.TELEGRAM_WEBHOOK_SECRET = prevSecret;
    }
  }
});

test('upload-receipt: client UUID idempotencyKey prevents duplicate Telegram sends across retries and guards stale UUIDs after rejection', async () => {
  const ctx = makeInMemoryDeps();
  const uuid1 = '550e8400-e29b-41d4-a716-446655440001';
  const uuid2 = '550e8400-e29b-41d4-a716-446655440002';

  const cmd1 = {
    verifiedUid: 'uid-alice',
    orderId: 'ORD-IDEM-UUID-1',
    invitationId: 'inv-1',
    invitationSlug: 'ali-madina-1234',
    templateId: 'tpl-1',
    templateSlug: 'template-1',
    customerName: 'Ali & Madina',
    customerPhone: '+998901234567',
    templateName: 'Aurelia',
    weddingDate: '2026-10-10',
    venueName: 'Versal',
    price: 60000,
    isPdf: false,
    fileBuffer: Buffer.from('receipt-bytes-uuid'),
    idempotencyKey: uuid1,
  };

  const first = await processUploadReceipt(cmd1, ctx.deps);
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.success, true);
  assert.equal(ctx.getTgCount(), 1);

  // Duplicate retry with same UUID returns previous result (200 deduplicated), still 1 Telegram message
  const duplicate = await processUploadReceipt(cmd1, ctx.deps);
  assert.equal(duplicate.statusCode, 200);
  assert.equal(duplicate.body.success, true);
  assert.equal(duplicate.body.deduplicated, true);
  assert.equal(ctx.getTgCount(), 1);

  // Simulate admin rejection
  const ord = ctx.orders.get('ORD-IDEM-UUID-1')!;
  ctx.orders.set('ORD-IDEM-UUID-1', { ...ord, status: 'rejected', decidedAt: '2026-11-16T09:00:00.000Z' });

  // Stale retry of uuid1 after rejection is blocked (409), no duplicate Telegram
  const staleRetry = await processUploadReceipt(cmd1, ctx.deps);
  assert.equal(staleRetry.statusCode, 409);
  assert.equal(staleRetry.body.deduplicated, true);
  assert.equal(ctx.getTgCount(), 1);

  // Fresh re-upload with new UUID uuid2 succeeds normally
  const freshReupload = await processUploadReceipt({ ...cmd1, idempotencyKey: uuid2 }, ctx.deps);
  assert.equal(freshReupload.statusCode, 200);
  assert.equal(freshReupload.body.success, true);
  assert.equal(ctx.getTgCount(), 2);
});

test('upload-receipt: inherits templateSlug from invitations/{id} when omitted, and aborts (400) without Telegram if missing everywhere', async () => {
  const ctx = makeInMemoryDeps();

  ctx.invitations.set('inv-14', {
    id: 'inv-14',
    slug: 'botanical-couple-1414',
    templateId: 'tpl-14',
    templateSlug: 'template-14',
    ownerId: 'uid-alice',
    ownerUid: 'uid-alice',
    status: 'pending_payment',
  });

  ctx.invitations.set('inv-no-tpl', {
    id: 'inv-no-tpl',
    slug: 'broken-couple-0000',
    ownerId: 'uid-alice',
    ownerUid: 'uid-alice',
    status: 'pending_payment',
  });

  // 1. Omitted in request -> reads template-14 from invitations/inv-14 (never defaults to template-1)
  const inheritedRes = await processUploadReceipt(
    {
      verifiedUid: 'uid-alice',
      orderId: 'ORD-INHERIT-14',
      invitationId: 'inv-14',
      invitationSlug: 'botanical-couple-1414',
      customerName: 'Botanical Pair',
      customerPhone: '+998901234567',
      templateName: 'Botanical Garden',
      weddingDate: '2026-10-12',
      venueName: 'Yakkasaroy',
      price: 60000,
      isPdf: false,
      fileBuffer: Buffer.from('receipt-inherit-14'),
    },
    ctx.deps
  );

  assert.equal(inheritedRes.statusCode, 200);
  assert.equal(inheritedRes.body.success, true);
  assert.equal(ctx.orders.get('ORD-INHERIT-14')?.templateSlug, 'template-14');
  assert.equal(ctx.orders.get('ORD-INHERIT-14')?.templateId, 'tpl-14');
  assert.equal(ctx.getTgCount(), 1);

  // 2. Omitted in request AND missing in existingOrder AND missing in invitations/inv-no-tpl -> 400 error, 0 Telegram calls
  const missingRes = await processUploadReceipt(
    {
      verifiedUid: 'uid-alice',
      orderId: 'ORD-NO-TPL',
      invitationId: 'inv-no-tpl',
      invitationSlug: 'broken-couple-0000',
      customerName: 'Missing Tpl Pair',
      customerPhone: '+998901234567',
      templateName: 'Unknown',
      weddingDate: '2026-10-12',
      venueName: 'Yakkasaroy',
      price: 60000,
      isPdf: false,
      fileBuffer: Buffer.from('receipt-no-tpl'),
    },
    ctx.deps
  );

  assert.equal(missingRes.statusCode, 400);
  assert.equal(missingRes.body.success, false);
  assert.equal(ctx.orders.has('ORD-NO-TPL'), false);
  assert.equal(ctx.getTgCount(), 1);
});

// ---------------------------------------------------------------------------
// Telegram Auth & International E.164 Phone Tests (BOSQICH 1)
// ---------------------------------------------------------------------------
function makeInMemoryTelegramAuthDeps(options?: {
  botUsername?: string;
  adminChatId?: string;
  now?: () => number;
}) {
  let tree: Record<string, any> = {};
  const sentMessages: Array<Record<string, unknown>> = [];
  const createdCustomTokens: Array<{ uid: string; claims?: Record<string, unknown> }> = [];
  let currentNow = 1_770_000_000_000;

  const getAtPath = (pathStr?: string): any => {
    if (!pathStr) return tree;
    const parts = pathStr.split('/').filter(Boolean);
    let cur: any = tree;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object' || !(p in cur)) return null;
      cur = cur[p];
    }
    return cur === undefined ? null : cur;
  };

  const setAtRtdbPath = (pathStr: string, val: any) => {
    const parts = pathStr.split('/').filter(Boolean);
    if (parts.length === 0) {
      tree = val || {};
      return;
    }
    let cur: any = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!cur[key] || typeof cur[key] !== 'object') {
        cur[key] = {};
      }
      cur = cur[key];
    }
    const last = parts[parts.length - 1];
    if (val === null || val === undefined) {
      delete cur[last];
    } else {
      cur[last] = structuredClone(val);
    }
  };

  const makeRef = (pathStr = '') => ({
    get: async () => {
      const v = getAtPath(pathStr);
      return {
        exists: () => v !== null && v !== undefined,
        val: () => (v === undefined ? null : structuredClone(v)),
      };
    },
    set: async (val: any) => {
      setAtRtdbPath(pathStr, val);
    },
    update: async (updates: Record<string, any>) => {
      if (!pathStr) {
        for (const [k, v] of Object.entries(updates || {})) {
          setAtRtdbPath(k, v);
        }
      } else {
        for (const [k, v] of Object.entries(updates || {})) {
          setAtRtdbPath(`${pathStr}/${k}`, v);
        }
      }
    },
    transaction: async (updater: (cur: any) => any) => {
      const cur = getAtPath(pathStr);
      const next = updater(cur === undefined ? null : structuredClone(cur));
      setAtRtdbPath(pathStr, next);
      return {
        committed: true,
        snapshot: { val: () => structuredClone(next) },
      };
    },
    limitToFirst: (n: number) => ({
      get: async () => {
        const obj = getAtPath(pathStr);
        if (!obj || typeof obj !== 'object') {
          return { exists: () => false, val: () => null };
        }
        const slice: Record<string, any> = {};
        for (const k of Object.keys(obj).slice(0, n)) {
          slice[k] = structuredClone(obj[k]);
        }
        return {
          exists: () => Object.keys(slice).length > 0,
          val: () => slice,
        };
      },
    }),
  });

  const fakeRtdb = { ref: (p = '') => makeRef(p) } as any;

  const deps: TelegramAuthDeps = {
    hasFirebaseAdmin: () => true,
    getRtdb: () => fakeRtdb,
    getAdminAuth: () =>
      ({
        createCustomToken: async (uid: string, claims?: Record<string, unknown>) => {
          createdCustomTokens.push({ uid, claims });
          return `custom-token:${uid}:${claims ? JSON.stringify(claims) : 'no-claims'}`;
        },
      }) as any,
    getBrandName: () => 'Tashrifim',
    getTelegramBotUsername: () => options?.botUsername ?? 'tashrifim_bot',
    getTelegramConfig: () => ({
      botToken: 'TEST_TOKEN',
      adminChatId: options?.adminChatId ?? '999000111',
      webhookSecret: 'TEST_WEBHOOK_SECRET',
    }),
    getPublicSiteUrl: () => 'https://tashrifim.uz',
    checkExternalRateLimit,
    sendTelegramMessage: async (payload) => {
      sentMessages.push(payload);
      return { ok: true, result: { message_id: sentMessages.length } };
    },
    now: options?.now || (() => currentNow),
  };

  return {
    deps,
    fakeRtdb,
    getTree: () => tree,
    setRateLimitEntry: (k: string, val: any) => setAtRtdbPath(`rateLimits/${k}`, val),
    sentMessages,
    createdCustomTokens,
    advanceTime: (ms: number) => {
      currentNow += ms;
    },
  };
}

test('normalizePhoneE164 validates international numbers (8-15 digits) and rejects invalid formats', () => {
  assert.equal(normalizePhoneE164('+998 90 123-45-67'), '+998901234567');
  assert.equal(normalizePhoneE164('79161234567'), '+79161234567');
  assert.equal(normalizePhoneE164('+1 (415) 555-2671'), '+14155552671');
  assert.equal(normalizePhoneE164('+442079460958'), '+442079460958');
  assert.equal(normalizePhoneE164('00123456'), null); // leading zero not valid E.164
  assert.equal(normalizePhoneE164('1234567'), null); // too short (< 8 digits)
  assert.equal(normalizePhoneE164('1234567890123456'), null); // too long (> 15 digits)
  assert.equal(formatUzPhoneForDisplay('998901234567'), '+998901234567');
});

test('Telegram auth handlers return proper JSON on invalid methods and JSON parse errors', async () => {
  const startGet = makeMockVercelRes();
  await telegramAuthStartHandler({ method: 'GET', headers: {} } as any, startGet.res);
  assert.equal(startGet.state.statusCode, 405);
  assert.equal(startGet.state.body.success, false);

  const claimGet = makeMockVercelRes();
  await telegramAuthClaimHandler({ method: 'GET', headers: {} } as any, claimGet.res);
  assert.equal(claimGet.state.statusCode, 405);
  assert.equal(claimGet.state.body.status, 'error');

  const startBadJson = makeMockVercelRes();
  await telegramAuthStartHandler(
    { method: 'POST', headers: {}, body: '{broken-json' } as any,
    startBadJson.res
  );
  assert.equal(startBadJson.state.statusCode, 400);
  assert.equal(startBadJson.state.body.success, false);
});

test('startTelegramLogin + Telegram bot /start confirmation + claimTelegramLogin full lifecycle (user & admin)', async () => {
  const ctx = makeInMemoryTelegramAuthDeps({
    botUsername: 'tashrifim_auth_bot',
    adminChatId: '777888999',
  });

  const claimSecret = 'a'.repeat(48);

  // 1. Start session -> generates 2-digit verificationCode
  const startRes = await startTelegramLogin(
    { claimSecret, lang: 'ru', clientIp: '10.0.0.1' },
    ctx.deps
  );
  assert.equal(startRes.statusCode, 200);
  assert.equal(startRes.body.success, true);
  const sessionId = String(startRes.body.sessionId);
  const botUrl = String(startRes.body.botUrl);
  const verificationCode = String(startRes.body.verificationCode);
  assert.match(verificationCode, /^\d{2}$/);
  assert.ok(botUrl.startsWith('https://t.me/tashrifim_auth_bot?start=login_'));
  const startParam = botUrl.split('?start=')[1];
  assert.ok(startParam.length <= 64, 'Telegram start parameter must stay <= 64 chars');

  // Verify raw claimSecret is NEVER stored in RTDB, while verificationCode IS stored
  const storedSession = ctx.getTree().loginSessions[sessionId];
  assert.ok(storedSession.claimSecretHash);
  assert.equal(storedSession.verificationCode, verificationCode);
  assert.equal(storedSession.claimSecret, undefined);
  assert.notEqual(storedSession.claimSecretHash, claimSecret);

  // 2. Claim while still pending -> returns { status: 'pending' }
  const pendingClaim = await claimTelegramLogin(
    { sessionId, claimSecret, clientIp: '10.0.0.1' },
    ctx.deps
  );
  assert.equal(pendingClaim.statusCode, 200);
  assert.deepEqual(pendingClaim.body, { status: 'pending' });

  // 3. Group chat /start is silently ignored (private-chat only)
  await handleTelegramCustomerMessage(
    {
      chat: { id: -10012345, type: 'supergroup' },
      from: { id: 123456, first_name: 'GroupUser' },
      text: `/start ${startParam}`,
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 0);

  // 4. Customer opens bot in private chat -> immediately marks session confirmed and links Telegram profile
  await handleTelegramCustomerMessage(
    {
      chat: { id: 123456, type: 'private' },
      from: { id: 123456, first_name: 'Alisher', last_name: 'Karimov', username: 'alisher_k' },
      text: `/start ${startParam}`,
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 1);
  assert.match(String(ctx.sentMessages[0].text), /Подтверждено|Tasdiqlandi/i);
  assert.equal(ctx.getTree().loginSessions[sessionId].status, 'confirmed');
  assert.equal(ctx.getTree().loginSessions[sessionId].telegramUserId, '123456');
  assert.equal(ctx.getTree().loginSessions[sessionId].firstName, 'Alisher');
  assert.equal(ctx.getTree().loginSessions[sessionId].username, 'alisher_k');

  // 5. Wrong claimSecret rejected with 403
  const wrongSecretClaim = await claimTelegramLogin(
    { sessionId, claimSecret: 'b'.repeat(48), clientIp: '10.0.0.1' },
    ctx.deps
  );
  assert.equal(wrongSecretClaim.statusCode, 403);

  // 6. Different Telegram user CANNOT overwrite or claim the same session
  await handleTelegramCustomerMessage(
    {
      chat: { id: 999888, type: 'private' },
      from: { id: 999888, first_name: 'Hijacker', username: 'hijacker' },
      text: `/start ${startParam}`,
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 2);
  assert.equal(ctx.getTree().loginSessions[sessionId].telegramUserId, '123456');

  // 7. Claim succeeds with Firebase Custom Token & saves user in RTDB (one-time)
  const okClaim = await claimTelegramLogin(
    { sessionId, claimSecret, clientIp: '10.0.0.1' },
    ctx.deps
  );
  assert.equal(okClaim.statusCode, 200);
  assert.equal(okClaim.body.status, 'ok');
  assert.equal(okClaim.body.confirmed, true);
  assert.ok(typeof okClaim.body.customToken === 'string');
  assert.equal(ctx.createdCustomTokens[0].uid, 'tg_123456');
  assert.equal(ctx.createdCustomTokens[0].claims, undefined);

  const savedUser = ctx.getTree().users['tg_123456'];
  assert.equal(savedUser.id, 'tg_123456');
  assert.equal(savedUser.telegramUserId, '123456');
  assert.equal(savedUser.username, 'alisher_k');
  assert.equal(savedUser.lang, 'ru');
  assert.equal(savedUser.isAdmin, undefined);

  // Second claim attempt fails because session was deleted (one-time)
  const secondClaim = await claimTelegramLogin(
    { sessionId, claimSecret, clientIp: '10.0.0.1' },
    ctx.deps
  );
  assert.deepEqual(secondClaim.body, { status: 'expired' });

  // 8. Admin login assigns { admin: true } custom token claim ONLY for positive personal chat ID
  const adminSecret = 'c'.repeat(48);
  const adminStart = await startTelegramLogin(
    { claimSecret: adminSecret, lang: 'uz', clientIp: '10.0.0.2' },
    ctx.deps
  );
  const adminSid = String(adminStart.body.sessionId);
  await handleTelegramCustomerMessage(
    {
      chat: { id: 777888999, type: 'private' },
      from: { id: 777888999, first_name: 'Admin' },
      text: `/start ${adminSid}`,
    },
    ctx.deps
  );
  const adminClaim = await claimTelegramLogin(
    { sessionId: adminSid, claimSecret: adminSecret, clientIp: '10.0.0.2' },
    ctx.deps
  );
  assert.equal(adminClaim.statusCode, 200);
  assert.equal(ctx.createdCustomTokens[1].uid, 'tg_777888999');
  assert.deepEqual(ctx.createdCustomTokens[1].claims, { admin: true });
  assert.equal(ctx.getTree().users['tg_777888999'].isAdmin, true);
});

test('Telegram auth never grants admin claim when TELEGRAM_ADMIN_CHAT_ID is a negative group ID and cleans expired rateLimits', async () => {
  const ctx = makeInMemoryTelegramAuthDeps({
    botUsername: 'tashrifim_bot',
    adminChatId: '-100123456789',
  });

  // Seed 2 stale rateLimits (> 1h old) and 1 fresh rateLimit (< 1h old)
  const now = ctx.deps.now!();
  ctx.setRateLimitEntry('stale_1', { count: 2, resetAt: now - 4_000_000, updatedAt: now - 3_700_000 });
  ctx.setRateLimitEntry('stale_2', { count: 1, resetAt: now - 3_800_000 });
  ctx.setRateLimitEntry('fresh_1', { count: 1, resetAt: now + 30_000, updatedAt: now - 60_000 });

  const removed = await cleanupExpiredRateLimits(ctx.fakeRtdb, now, 3_600_000);
  assert.equal(removed, 2);
  assert.equal(ctx.getTree().rateLimits.stale_1, undefined);
  assert.equal(ctx.getTree().rateLimits.stale_2, undefined);
  assert.ok(ctx.getTree().rateLimits.fresh_1);

  const secret = 'd'.repeat(48);
  const startRes = await startTelegramLogin({ claimSecret: secret, lang: 'uz', clientIp: '10.0.0.5' }, ctx.deps);
  const sid = String(startRes.body.sessionId);
  await handleTelegramCustomerMessage(
    {
      chat: { id: 555666, type: 'private' },
      from: { id: 555666, first_name: 'User' },
      text: `/start login_${sid}`,
    },
    ctx.deps
  );
  const claimRes = await claimTelegramLogin({ sessionId: sid, claimSecret: secret, clientIp: '10.0.0.5' }, ctx.deps);
  assert.equal(claimRes.statusCode, 200);
  assert.equal(ctx.createdCustomTokens[0].claims, undefined);
  assert.equal(ctx.getTree().users['tg_555666'].isAdmin, undefined);
});

test('Telegram auth claim deletes session after 5 invalid secret attempts and handleTelegramUpdate routes /start without blocking', async () => {
  const ctx = makeInMemoryTelegramAuthDeps({ botUsername: 'tashrifim_bot' });
  const start = await startTelegramLogin(
    { claimSecret: 'x'.repeat(48), lang: 'en', clientIp: '10.0.0.9' },
    ctx.deps
  );
  const sessionId = String(start.body.sessionId);

  // Customer message routed through handleTelegramUpdate (even though sender is NOT admin!)
  await handleTelegramUpdate(
    {
      message: {
        chat: { id: 555666, type: 'private' },
        from: { id: 555666, first_name: 'Bob' },
        text: `/start login_${sessionId}`,
      },
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 1);
  assert.match(String(ctx.sentMessages[0].text), /Confirmed/i);

  // 5 invalid secret attempts wipe out session
  for (let i = 1; i <= 5; i++) {
    const res = await claimTelegramLogin(
      { sessionId, claimSecret: 'z'.repeat(48), clientIp: '10.0.0.9' },
      ctx.deps
    );
    assert.equal(res.statusCode, i < 5 ? 403 : 429);
  }
  assert.equal(ctx.getTree().loginSessions?.[sessionId], undefined);
});

test('Production vs Preview Telegram env selection keeps payment bot strictly on TELEGRAM_BOT_TOKEN and auth bot isolated in Preview', () => {
  const keys = [
    'VERCEL_ENV',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_BOT_USERNAME',
    'VITE_TELEGRAM_BOT_USERNAME',
    'TELEGRAM_TEST_BOT_TOKEN',
    'TELEGRAM_TEST_BOT_USERNAME',
    'TELEGRAM_WEBHOOK_SECRET',
    'TELEGRAM_TEST_WEBHOOK_SECRET',
    'TELEGRAM_LOGIN_WEBHOOK_SECRET',
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) saved[k] = process.env[k];

  try {
    process.env.TELEGRAM_BOT_TOKEN = '111111:PROD_PAY_TOKEN';
    process.env.TELEGRAM_BOT_USERNAME = '@prod_pay_bot';
    process.env.VITE_TELEGRAM_BOT_USERNAME = '@prod_vite_bot';
    process.env.TELEGRAM_TEST_BOT_TOKEN = '222222:PREVIEW_LOGIN_TOKEN';
    process.env.TELEGRAM_TEST_BOT_USERNAME = '@preview_login_bot';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'prod-webhook-secret';
    process.env.TELEGRAM_TEST_WEBHOOK_SECRET = 'preview-login-secret';

    // 1. Production: strictly ignores TELEGRAM_TEST_*
    process.env.VERCEL_ENV = 'production';
    assert.equal(getPaymentTelegramConfig().botToken, '111111:PROD_PAY_TOKEN');
    assert.equal(getPaymentTelegramConfig().webhookSecret, 'prod-webhook-secret');
    assert.equal(getTelegramAuthConfig().botToken, '111111:PROD_PAY_TOKEN');
    assert.equal(getTelegramAuthConfig().webhookSecret, 'prod-webhook-secret');
    assert.equal(getTelegramAuthBotUsername(), 'prod_pay_bot');

    // 2. Preview: payment stays on TELEGRAM_BOT_TOKEN, auth switches strictly to TELEGRAM_TEST_*
    process.env.VERCEL_ENV = 'preview';
    assert.equal(getPaymentTelegramConfig().botToken, '111111:PROD_PAY_TOKEN');
    assert.equal(getPaymentTelegramConfig().webhookSecret, 'prod-webhook-secret');
    assert.equal(getTelegramAuthConfig().botToken, '222222:PREVIEW_LOGIN_TOKEN');
    assert.equal(getTelegramAuthConfig().webhookSecret, 'preview-login-secret');
    assert.equal(getTelegramAuthBotUsername(), 'preview_login_bot');

    // Even if Preview is missing test username, it NEVER falls back to production bot username
    delete process.env.TELEGRAM_TEST_BOT_USERNAME;
    assert.equal(getTelegramAuthBotUsername(), '');
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});

test('POST /api/telegram/login-webhook validates secret & method, isolates login messages from callback_query, and redacts bot tokens in errors', async () => {
  const prevVercelEnv = process.env.VERCEL_ENV;
  const prevWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const prevTestSecret = process.env.TELEGRAM_TEST_WEBHOOK_SECRET;
  process.env.VERCEL_ENV = 'preview';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'payment-secret-123';
  process.env.TELEGRAM_TEST_WEBHOOK_SECRET = 'login-preview-secret-456';

  try {
    const getMock = makeMockVercelRes();
    await telegramLoginWebhookHandler({ method: 'GET', headers: {} } as any, getMock.res);
    assert.equal(getMock.state.statusCode, 405);

    // Payment webhook secret must NOT unlock Preview test login webhook when TELEGRAM_TEST_WEBHOOK_SECRET is set
    const wrongSecretMock = makeMockVercelRes();
    await telegramLoginWebhookHandler(
      {
        method: 'POST',
        headers: { 'x-telegram-bot-api-secret-token': 'payment-secret-123' },
        body: { update_id: 1 },
      } as any,
      wrongSecretMock.res
    );
    assert.equal(wrongSecretMock.state.statusCode, 403);

    // Valid login secret accepts payload and cleanly ignores payment callback_query
    const okMock = makeMockVercelRes();
    await telegramLoginWebhookHandler(
      {
        method: 'POST',
        headers: { 'x-telegram-bot-api-secret-token': 'login-preview-secret-456' },
        body: {
          update_id: 2,
          callback_query: { id: 'cb-1', data: 'confirm_ORD-SHOULD-NOT-RUN' },
        },
      } as any,
      okMock.res
    );
    assert.equal(okMock.state.statusCode, 200);
    assert.deepEqual(okMock.state.body, { status: 'ok' });

    // Separated helpers do not throw on mismatched update types
    await handleLoginTelegramUpdate({ callback_query: { id: 'cb-ignored' } });
    await handlePaymentTelegramUpdate({ message: { chat: { id: 1, type: 'private' }, text: '/start' } });

    // Error sanitizer strips bot tokens
    const leaked = new Error('request to https://api.telegram.org/bot123456:ABCdefSECRET/sendMessage failed');
    const cleanMsg = sanitizeTelegramErrorMessage(leaked);
    assert.equal(cleanMsg.includes('ABCdefSECRET'), false);
    assert.match(cleanMsg, /\/bot\[REDACTED\]\/sendMessage/);
  } finally {
    if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercelEnv;
    if (prevWebhookSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = prevWebhookSecret;
    if (prevTestSecret === undefined) delete process.env.TELEGRAM_TEST_WEBHOOK_SECRET;
    else process.env.TELEGRAM_TEST_WEBHOOK_SECRET = prevTestSecret;
  }
});

test('cleanPrivateKey & validatePrivateKeyPem handle quotes, CRLF, escaped newlines, validate PKCS#8 PEM, and reuse single [DEFAULT] Firebase Admin app', async () => {
  const { privateKey: generatedPem } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  // 1. Escaped \n + outer quotes + trailing comma (common JSON paste mistake)
  const quotedEscaped = `"${generatedPem.replace(/\n/g, '\\n')}",`;
  const cleaned1 = cleanPrivateKey(quotedEscaped);
  assert.ok(cleaned1.trim().startsWith('-----BEGIN PRIVATE KEY-----'));
  assert.ok(cleaned1.trim().endsWith('-----END PRIVATE KEY-----'));
  assert.equal(validatePrivateKeyPem(cleaned1).ok, true);

  // 2. Windows CRLF & double-escaped \\n
  const crlfDoubleEscaped = `'${generatedPem.replace(/\n/g, '\\\\r\\\\n')}'`;
  const cleaned2 = cleanPrivateKey(crlfDoubleEscaped);
  assert.equal(cleaned2.includes('\r'), false);
  assert.equal(validatePrivateKeyPem(cleaned2).ok, true);

  // 3. Rejects invalid PEM formats clearly without exposing key contents
  assert.equal(validatePrivateKeyPem('').ok, false);
  const badHeader = validatePrivateKeyPem('-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----');
  assert.equal(badHeader.ok, false);
  const corruptBody = validatePrivateKeyPem('-----BEGIN PRIVATE KEY-----\nINVALID_KEY_DATA_NOT_BASE64_VALID_PKCS8\n-----END PRIVATE KEY-----');
  assert.equal(corruptBody.ok, false);
  if (!corruptBody.ok) {
    assert.equal(corruptBody.reason.includes('INVALID_KEY_DATA_NOT_BASE64_VALID_PKCS8'), false);
  }

  // 4. Firebase Admin single initialization & no silent mock fallback on invalid key
  const envKeys = [
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_DATABASE_URL',
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const k of envKeys) saved[k] = process.env[k];

  // Ensure clean slate for [DEFAULT] app
  for (const existing of getApps()) {
    if (existing.name === '[DEFAULT]') await deleteApp(existing);
  }

  try {
    // 4a. Invalid key returns null + safe diagnostic and getRtdb throws instead of silent mock
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    process.env.FIREBASE_PROJECT_ID = 'teklifim-9dae7';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@teklifim-9dae7.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = 'corrupt-key-value-never-log-me';

    assert.equal(hasFirebaseAdmin(), false);
    const diag = getFirebaseAdminDiagnosticError() || '';
    assert.match(diag, /BEGIN PRIVATE KEY/);
    assert.equal(diag.includes('corrupt-key-value-never-log-me'), false);
    assert.throws(() => getRtdb(), /BEGIN PRIVATE KEY/);

    // Signed-in API callers receive 500 diagnostic instead of silent 401/mock
    const statusMock = makeMockVercelRes();
    await paymentStatusHandler(
      {
        method: 'GET',
        headers: { authorization: 'Bearer some-id-token' },
        query: { orderId: 'ORD-1' },
      } as any,
      statusMock.res
    );
    assert.equal(statusMock.state.statusCode, 500);
    assert.match(String(statusMock.state.body.error), /BEGIN PRIVATE KEY/);

    // 4b. Valid escaped key initializes [DEFAULT] once and reuses exact same instance
    process.env.FIREBASE_PRIVATE_KEY = quotedEscaped;
    const app1 = getAdminApp();
    const app2 = getAdminApp();
    assert.ok(app1 !== null);
    assert.equal(app1, app2);
    assert.equal(app1?.options.databaseURL, 'https://teklifim-9dae7-default-rtdb.firebaseio.com');
    assert.equal(getFirebaseAdminDiagnosticError(), null);
  } finally {
    for (const existing of getApps()) {
      if (existing.name === '[DEFAULT]') await deleteApp(existing);
    }
    for (const k of envKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});

test('cleanPrivateKey repairs single-line space-collapsed PKCS#8 PEM keys', () => {
  const { privateKey: generatedPem } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const singleLineSpaced = generatedPem.replace(/\r?\n/g, ' ').trim();
  const repaired = cleanPrivateKey(singleLineSpaced);
  assert.equal(validatePrivateKeyPem(repaired).ok, true);
  assert.ok(repaired.split('\n').length > 10);
});

test('startTelegramLogin returns distinct error codes for every failure step and normalizes botUsername', async () => {
  const envKeys = [
    'VERCEL_ENV',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_BOT_USERNAME',
    'VITE_TELEGRAM_BOT_USERNAME',
    'TELEGRAM_TEST_BOT_TOKEN',
    'TELEGRAM_TEST_BOT_USERNAME',
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const k of envKeys) saved[k] = process.env[k];

  for (const existing of getApps()) {
    if (existing.name === '[DEFAULT]') await deleteApp(existing);
  }

  try {
    const ctx = makeInMemoryTelegramAuthDeps({ botUsername: ' @TashrifimBot ' });

    // 1. INVALID_REQUEST on short/whitespace claimSecret
    const invalidRes = await startTelegramLogin(
      { claimSecret: 'too-short', lang: 'uz', clientIp: '10.0.0.1' },
      ctx.deps
    );
    assert.equal(invalidRes.statusCode, 400);
    assert.equal(invalidRes.body.ok, false);
    assert.equal(invalidRes.body.code, 'INVALID_REQUEST');

    // 2. ENV_MISSING when Firebase Admin env vars are absent
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    const envMissingRes = await startTelegramLogin(
      { claimSecret: 'a'.repeat(48), lang: 'uz', clientIp: '10.0.0.1' },
      { ...ctx.deps, hasFirebaseAdmin }
    );
    assert.equal(envMissingRes.statusCode, 500);
    assert.equal(envMissingRes.body.ok, false);
    assert.equal(envMissingRes.body.code, 'ENV_MISSING');
    assert.deepEqual(envMissingRes.body.missingEnv, [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
    ]);

    // 3. FIREBASE_INIT_FAILED when PEM key is malformed
    process.env.FIREBASE_PROJECT_ID = 'teklifim-9dae7';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@teklifim-9dae7.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = 'bad-pem-secret-do-not-expose';

    const fbInitFailRes = await startTelegramLogin(
      { claimSecret: 'a'.repeat(48), lang: 'uz', clientIp: '10.0.0.1' },
      { ...ctx.deps, hasFirebaseAdmin }
    );
    assert.equal(fbInitFailRes.statusCode, 500);
    assert.equal(fbInitFailRes.body.ok, false);
    assert.equal(fbInitFailRes.body.code, 'FIREBASE_INIT_FAILED');
    assert.equal(String(fbInitFailRes.body.message).includes('bad-pem-secret-do-not-expose'), false);

    // 4. TELEGRAM_CONFIG_MISSING when bot username or token is missing
    process.env.VERCEL_ENV = 'production';
    const noBotUserRes = await startTelegramLogin(
      { claimSecret: 'a'.repeat(48), lang: 'uz', clientIp: '10.0.0.1' },
      { ...ctx.deps, getTelegramBotUsername: () => '' }
    );
    assert.equal(noBotUserRes.statusCode, 500);
    assert.equal(noBotUserRes.body.code, 'TELEGRAM_CONFIG_MISSING');
    assert.deepEqual(noBotUserRes.body.missingEnv, ['TELEGRAM_BOT_USERNAME']);

    const noBotTokenRes = await startTelegramLogin(
      { claimSecret: 'a'.repeat(48), lang: 'uz', clientIp: '10.0.0.1' },
      {
        ...ctx.deps,
        getTelegramConfig: () => ({
          botToken: 'MOCK_BOT_TOKEN',
          adminChatId: 'MOCK_ADMIN_CHAT_ID',
          webhookSecret: '',
        }),
      }
    );
    assert.equal(noBotTokenRes.statusCode, 500);
    assert.equal(noBotTokenRes.body.code, 'TELEGRAM_CONFIG_MISSING');
    assert.deepEqual(noBotTokenRes.body.missingEnv, ['TELEGRAM_BOT_TOKEN']);

    // 5. RATE_LIMITED when IP exceeds 10 attempts in 60s
    const rateLimitedRes = await startTelegramLogin(
      { claimSecret: 'a'.repeat(48), lang: 'uz', clientIp: '10.0.0.1' },
      {
        ...ctx.deps,
        checkExternalRateLimit: async () => ({ allowed: false, count: 11, resetAt: Date.now() + 60_000 }),
      }
    );
    assert.equal(rateLimitedRes.statusCode, 429);
    assert.equal(rateLimitedRes.body.code, 'RATE_LIMITED');

    // 6. RTDB_WRITE_FAILED when rtdb set throws
    const failingRtdb = {
      ref: () => ({
        limitToFirst: () => ({ get: async () => ({ exists: () => false, val: () => null }) }),
        set: async () => {
          throw new Error('Permission denied at /loginSessions');
        },
      }),
    } as any;
    const rtdbFailRes = await startTelegramLogin(
      { claimSecret: 'a'.repeat(48), lang: 'uz', clientIp: '10.0.0.1' },
      { ...ctx.deps, getRtdb: () => failingRtdb }
    );
    assert.equal(rtdbFailRes.statusCode, 500);
    assert.equal(rtdbFailRes.body.ok, false);
    assert.equal(rtdbFailRes.body.code, 'RTDB_WRITE_FAILED');

    // 7. Success normalizes botUsername (strips @ and whitespace)
    const okRes = await startTelegramLogin(
      { claimSecret: 'a'.repeat(48), lang: 'uz', clientIp: '10.0.0.1' },
      ctx.deps
    );
    assert.equal(okRes.statusCode, 200);
    assert.equal(okRes.body.ok, true);
    assert.equal(okRes.body.success, true);
    assert.equal(okRes.body.botUsername, 'TashrifimBot');
    assert.ok(String(okRes.body.botUrl).startsWith('https://t.me/TashrifimBot?start=login_'));
  } finally {
    for (const existing of getApps()) {
      if (existing.name === '[DEFAULT]') await deleteApp(existing);
    }
    for (const k of envKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});

test('POST /api/auth/telegram/start lazy handler & GET /api/health/config return structured codes without leaking secrets', async () => {
  const envKeys = [
    'VERCEL_ENV',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_BOT_USERNAME',
    'VITE_TELEGRAM_BOT_USERNAME',
    'TELEGRAM_WEBHOOK_SECRET',
    'TELEGRAM_ADMIN_CHAT_ID',
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const k of envKeys) saved[k] = process.env[k];

  for (const existing of getApps()) {
    if (existing.name === '[DEFAULT]') await deleteApp(existing);
  }

  try {
    const { privateKey: generatedPem } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    const dummyBotToken = '999888777:SUPER_SECRET_BOT_TOKEN_DO_NOT_LEAK';
    const dummyBotUsername = 'super_secret_handle_bot';
    const dummyWebhookSecret = 'ULTRA_SECRET_WEBHOOK_TOKEN';

    // /api/health/config rejects POST with 405
    const postHealthMock = makeMockVercelRes();
    await healthConfigHandler({ method: 'POST', headers: {} } as any, postHealthMock.res);
    assert.equal(postHealthMock.state.statusCode, 405);
    assert.equal(postHealthMock.state.headers.Allow, 'GET');

    // Test start.ts ENV_MISSING end-to-end via lazy handler
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    const startMissingMock = makeMockVercelRes();
    await telegramAuthStartHandler(
      {
        method: 'POST',
        headers: {},
        body: { claimSecret: 's'.repeat(48), lang: 'uz' },
      } as any,
      startMissingMock.res
    );
    assert.equal(startMissingMock.state.statusCode, 500);
    assert.equal(startMissingMock.state.body.code, 'ENV_MISSING');
    assert.equal(startMissingMock.state.body.ok, false);

    // Populate Firebase + Telegram secrets and test /api/health/config zero-secret output
    process.env.VERCEL_ENV = 'production';
    process.env.FIREBASE_PROJECT_ID = 'teklifim-9dae7';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@teklifim-9dae7.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = generatedPem;
    process.env.TELEGRAM_BOT_TOKEN = dummyBotToken;
    process.env.TELEGRAM_BOT_USERNAME = `@${dummyBotUsername}`;
    process.env.TELEGRAM_WEBHOOK_SECRET = dummyWebhookSecret;
    process.env.TELEGRAM_ADMIN_CHAT_ID = '123456789';

    // Verify start.ts rejects TELEGRAM_CONFIG_MISSING cleanly if username cleared
    delete process.env.TELEGRAM_BOT_USERNAME;
    delete process.env.VITE_TELEGRAM_BOT_USERNAME;
    const startNoBotMock = makeMockVercelRes();
    await telegramAuthStartHandler(
      {
        method: 'POST',
        headers: {},
        body: { claimSecret: 's'.repeat(48), lang: 'uz' },
      } as any,
      startNoBotMock.res
    );
    assert.equal(startNoBotMock.state.statusCode, 500);
    assert.equal(startNoBotMock.state.body.code, 'TELEGRAM_CONFIG_MISSING');
    assert.deepEqual(startNoBotMock.state.body.missingEnv, ['TELEGRAM_BOT_USERNAME']);

    process.env.TELEGRAM_BOT_USERNAME = `@${dummyBotUsername}`;

    // Verify /api/health/config returns booleans & safe codes ONLY, never secrets
    const healthMock = makeMockVercelRes();
    await healthConfigHandler({ method: 'GET', headers: {} } as any, healthMock.res);
    assert.equal(healthMock.state.statusCode, 200);
    assert.equal(healthMock.state.body.firebaseAdminInit, 'ok');
    assert.equal(healthMock.state.body.hasFirebaseProjectId, true);
    assert.equal(healthMock.state.body.hasFirebaseClientEmail, true);
    assert.equal(healthMock.state.body.hasFirebasePrivateKey, true);
    assert.equal(healthMock.state.body.hasTelegramBotToken, true);
    assert.equal(healthMock.state.body.hasTelegramBotUsername, true);
    assert.equal(healthMock.state.body.hasActiveAuthBotToken, true);
    assert.equal(healthMock.state.body.hasActiveAuthBotUsername, true);
    assert.equal(healthMock.state.body.vercelEnv, 'production');
    assert.equal(typeof healthMock.state.body.nodeVersion, 'string');

    const serialized = JSON.stringify(healthMock.state.body);
    assert.equal(serialized.includes('BEGIN PRIVATE KEY'), false);
    assert.equal(serialized.includes(dummyBotToken), false);
    assert.equal(serialized.includes(dummyBotUsername), false);
    assert.equal(serialized.includes(dummyWebhookSecret), false);
    assert.equal(serialized.includes('firebase-adminsdk@'), false);
    assert.equal(serialized.includes('teklifim-9dae7'), false);
  } finally {
    for (const existing of getApps()) {
      if (existing.name === '[DEFAULT]') await deleteApp(existing);
    }
    for (const k of envKeys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});

test('Telegram /start webhook flows: no payload, valid session, expired session, duplicate /start idempotency, different user lock, and sendTelegramBotMessage timeout', async () => {
  const ctx = makeInMemoryTelegramAuthDeps({ botUsername: 'tashrifim_bot' });

  // 1. /start without payload replies in Uzbek
  await handleTelegramCustomerMessage(
    {
      chat: { id: 101010, type: 'private' },
      from: { id: 101010, first_name: 'Sardor' },
      text: '/start',
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 1);
  assert.equal(
    ctx.sentMessages[0].text,
    "Salom! Saytga kirish uchun saytdagi 'Telegram orqali kirish' tugmasini bosing."
  );

  // 2. Valid /start <sessionId> links user and marks confirmed with Uzbek reply
  const startOk = await startTelegramLogin(
    { claimSecret: 'k'.repeat(48), lang: 'uz', clientIp: '10.0.0.21' },
    ctx.deps
  );
  const sidOk = String(startOk.body.sessionId);

  await handleTelegramCustomerMessage(
    {
      chat: { id: 202020, type: 'private' },
      from: { id: 202020, first_name: 'Aziza', username: 'aziza_u' },
      text: `/start ${sidOk}`,
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 2);
  assert.match(String(ctx.sentMessages[1].text), /Tasdiqlandi! Saytga qaytishingiz mumkin\./);
  assert.equal(ctx.getTree().loginSessions[sidOk].status, 'confirmed');
  assert.equal(ctx.getTree().loginSessions[sidOk].telegramUserId, '202020');

  // 3. Duplicate /start by SAME user is idempotent
  await handleTelegramCustomerMessage(
    {
      chat: { id: 202020, type: 'private' },
      from: { id: 202020, first_name: 'Aziza', username: 'aziza_u' },
      text: `/start ${sidOk}`,
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 3);
  assert.match(String(ctx.sentMessages[2].text), /Tasdiqlandi! Saytga qaytishingiz mumkin\./);
  assert.equal(ctx.getTree().loginSessions[sidOk].status, 'confirmed');
  assert.equal(ctx.getTree().loginSessions[sidOk].telegramUserId, '202020');

  // 4. Different Telegram user trying to claim the same session is blocked
  await handleTelegramCustomerMessage(
    {
      chat: { id: 303030, type: 'private' },
      from: { id: 303030, first_name: 'Mallory', username: 'mallory_x' },
      text: `/start ${sidOk}`,
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 4);
  assert.match(String(ctx.sentMessages[3].text), /boshqa foydalanuvchi/i);
  assert.equal(ctx.getTree().loginSessions[sidOk].telegramUserId, '202020');

  // 5. Expired session replies clear Uzbek error and does NOT confirm
  const startExp = await startTelegramLogin(
    { claimSecret: 'm'.repeat(48), lang: 'uz', clientIp: '10.0.0.22' },
    ctx.deps
  );
  const sidExp = String(startExp.body.sessionId);
  ctx.advanceTime(6 * 60 * 1000); // > 5 min TTL

  await handleTelegramCustomerMessage(
    {
      chat: { id: 404040, type: 'private' },
      from: { id: 404040, first_name: 'Dilshod' },
      text: `/start ${sidExp}`,
    },
    ctx.deps
  );
  assert.equal(ctx.sentMessages.length, 5);
  assert.match(String(ctx.sentMessages[4].text), /eskirgan/i);
  assert.equal(ctx.getTree().loginSessions[sidExp].status, 'pending');

  // 6. sendTelegramBotMessage returns safe redacted result when fetch aborts/times out
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = ((_url: any, init: any) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('Request to https://api.telegram.org/bot555:SECRET_TOK/sendMessage aborted'));
        });
      })) as any;

    const sendRes = await sendTelegramBotMessage(12345, 'Test', {
      botToken: '555:SECRET_TOK',
      timeoutMs: 20,
    });
    assert.equal(sendRes.ok, false);
    assert.equal(String(sendRes.description).includes('SECRET_TOK'), false);
  } finally {
    globalThis.fetch = origFetch;
  }
});
