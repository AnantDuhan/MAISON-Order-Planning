const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { stubs, mockRes } = require('./helpers');

const User = require('../models/user');
const { isAuthUser, authRoles } = require('../middleware/auth');

const s = stubs();
afterEach(() => s.restore());

const sign = (payload, opts) => jwt.sign(payload, process.env.JWT_SECRET_KEY, opts);

async function runAuth(token, user = { _id: 'u1', role: 'user' }) {
    // findById(...).select(...) chain, like a Mongoose query.
    s.set(User, 'findById', () => ({ select: async () => user }));
    const req = { cookies: token ? { token } : {} };
    const res = mockRes();
    let nextCalled = false;
    await isAuthUser(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
}

test('accepts a valid session', async () => {
    const { req, nextCalled } = await runAuth(sign({ id: 'u1' }));
    assert.equal(nextCalled, true);
    assert.equal(req.user._id, 'u1');
});

test('rejects a missing, malformed or wrongly signed token with 401', async () => {
    for (const token of [undefined, 'garbage', jwt.sign({ id: 'u1' }, 'other-secret')]) {
        const { res, nextCalled } = await runAuth(token);
        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 401);
    }
});

test('rejects the 2FA pending token (2FA bypass)', async () => {
    const { res, nextCalled } = await runAuth(sign({ id: 'u1', twoFactorPending: true }));
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('rejects sessions for deleted users', async () => {
    const { res, nextCalled } = await runAuth(sign({ id: 'gone' }), null);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('rejects sessions issued before the last password change', async () => {
    const token = sign({ id: 'u1', iat: Math.floor(Date.now() / 1000) - 3600 });
    const { res, nextCalled } = await runAuth(token, {
        _id: 'u1',
        role: 'user',
        passwordChangedAt: new Date(),
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('admin routes need an MFA-verified session', () => {
    const guard = authRoles('admin');
    const res = mockRes();
    let nextCalled = false;
    guard({ user: { role: 'admin' }, auth: {}, method: 'GET' }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);

    nextCalled = false;
    guard({ user: { role: 'admin' }, auth: { mfaVerified: true }, method: 'GET' }, mockRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
});

test('demo admin is read-only', () => {
    const guard = authRoles('admin');
    const res = mockRes();
    let nextCalled = false;
    guard({ user: { role: 'admin', isDemo: true }, auth: {}, method: 'DELETE' }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
});
