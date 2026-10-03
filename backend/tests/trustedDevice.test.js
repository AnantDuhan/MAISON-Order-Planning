const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { stubs } = require('./helpers');

const User = require('../models/user');
const trusted = require('../utils/trustedDevice');

const s = stubs();
afterEach(() => s.restore());

const hash = v => crypto.createHash('sha256').update(v).digest('hex');
const DAY = 24 * 3600 * 1000;

const withUser = (doc, writes = []) => {
    s.set(User, 'findById', () => ({ select: () => ({ lean: async () => doc }) }));
    s.set(User, 'updateOne', async (filter, update) => { writes.push(update); return {}; });
    return writes;
};

const req = cookie => ({ cookies: { [trusted.COOKIE]: cookie }, get: () => 'Mozilla/5.0 (Macintosh; Mac OS X 14) Safari/605' });
const device = (overrides = {}) => ({
    _id: 'd1', tokenHash: hash('secret'), createdAt: new Date(Date.now() - DAY),
    lastUsedAt: new Date(), expiresAt: new Date(Date.now() + DAY), ...overrides,
});

test('a matching, unexpired device is trusted', async () => {
    withUser({ twoFactorAuth: { enabled: true, trustedDevices: [device()] } });
    assert.equal(await trusted.isTrustedDevice({ _id: 'u1' }, req('u1.d1.secret')), true);
});

test('wrong secret, other user, expired, or 2FA off: ask for the code', async () => {
    withUser({ twoFactorAuth: { enabled: true, trustedDevices: [device()] } });
    assert.equal(await trusted.isTrustedDevice({ _id: 'u1' }, req('u1.d1.guess')), false);
    assert.equal(await trusted.isTrustedDevice({ _id: 'u2' }, req('u1.d1.secret')), false);
    assert.equal(await trusted.isTrustedDevice({ _id: 'u1' }, req(undefined)), false);

    withUser({ twoFactorAuth: { enabled: true, trustedDevices: [device({ expiresAt: new Date(Date.now() - 1) })] } });
    assert.equal(await trusted.isTrustedDevice({ _id: 'u1' }, req('u1.d1.secret')), false);

    withUser({ twoFactorAuth: { enabled: false, trustedDevices: [device()] } });
    assert.equal(await trusted.isTrustedDevice({ _id: 'u1' }, req('u1.d1.secret')), false);
});

test('a password change after the device was trusted revokes it', async () => {
    withUser({ passwordChangedAt: new Date(), twoFactorAuth: { enabled: true, trustedDevices: [device()] } });
    assert.equal(await trusted.isTrustedDevice({ _id: 'u1' }, req('u1.d1.secret')), false);
});

test('trusting a device stores only a hash, sets an httpOnly cookie, caps the list', async () => {
    const existing = Array.from({ length: 12 }, (_, i) => device({ _id: `old${i}` }));
    const writes = withUser({ twoFactorAuth: { enabled: true, trustedDevices: existing } });
    let cookie;
    const res = { cookie: (name, value, options) => { cookie = { name, value, options }; } };

    const created = await trusted.trustThisDevice({ _id: 'u1' }, req(), res);

    const [userId, deviceId, secret] = cookie.value.split('.');
    assert.equal(userId, 'u1');
    assert.equal(deviceId, created._id);
    assert.equal(cookie.options.httpOnly, true);
    const saved = writes[0].$set['twoFactorAuth.trustedDevices'];
    assert.equal(saved.length, 10);
    assert.equal(saved[0].tokenHash, hash(secret));
    assert.ok(!JSON.stringify(saved).includes(secret));
    assert.equal(saved[0].label, 'Safari on macOS');
});

test('device labels', () => {
    assert.equal(trusted.describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/130.0 Safari/537'), 'Chrome on Windows');
    assert.equal(trusted.describeDevice('Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile'), 'Chrome on Android');
    assert.equal(trusted.describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604'), 'Safari on iOS');
});
