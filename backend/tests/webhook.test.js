const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { stubs } = require('./helpers');

const cache = require('../utils/cache');
const { verifyCashfreeWebhook, isFreshWebhookTimestamp } = require('../utils/cashfree');

const s = stubs();
afterEach(() => s.restore());

const sign = (timestamp, body) =>
    crypto.createHmac('sha256', process.env.CASHFREE_SECRET_KEY).update(timestamp + body).digest('base64');

const request = ({ timestamp = String(Date.now()), body = '{"type":"PAYMENT"}', signature } = {}) => ({
    rawBody: body,
    headers: {
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': signature ?? sign(timestamp, body),
    },
});

// In-memory stand-in for Redis SET NX.
function fakeClaimStore() {
    const seen = new Set();
    s.set(cache, 'claimOnce', async key => {
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

test('accepts a fresh, correctly signed webhook once', async () => {
    fakeClaimStore();
    const req = request();
    assert.deepEqual(await verifyCashfreeWebhook(req), { ok: true });
});

test('ignores the same delivery the second time (replay)', async () => {
    fakeClaimStore();
    const req = request();
    await verifyCashfreeWebhook(req);
    const second = await verifyCashfreeWebhook(req);
    assert.equal(second.ok, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.status, 200); // 200 so Cashfree stops retrying
});

test('rejects a bad signature', async () => {
    fakeClaimStore();
    const result = await verifyCashfreeWebhook(request({ signature: 'not-the-signature' }));
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
});

test('rejects an old webhook even with a valid signature', async () => {
    fakeClaimStore();
    const old = String(Date.now() - 10 * 60 * 1000);
    const result = await verifyCashfreeWebhook(request({ timestamp: old }));
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
});

test('timestamp freshness accepts seconds or milliseconds', () => {
    const now = Date.now();
    assert.equal(isFreshWebhookTimestamp(String(now), now), true);
    assert.equal(isFreshWebhookTimestamp(String(Math.floor(now / 1000)), now), true);
    assert.equal(isFreshWebhookTimestamp(String(now - 6 * 60 * 1000), now), false);
    assert.equal(isFreshWebhookTimestamp('abc', now), false);
});
