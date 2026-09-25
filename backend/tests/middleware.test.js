const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mockRes } = require('./helpers');
const demoGuard = require('../middleware/demoGuard');
const errorMiddleware = require('../middleware/error');
const { contentSecurityPolicy } = require('../middleware/securityHeaders');

test('demoGuard blocks demo users and lets everyone else through', () => {
    const guard = demoGuard('place-order');

    const blocked = mockRes();
    let next = false;
    guard({ user: { isDemo: true } }, blocked, () => { next = true; });
    assert.equal(next, false);
    assert.equal(blocked.statusCode, 403);

    next = false;
    guard({ user: { isDemo: false } }, mockRes(), () => { next = true; });
    assert.equal(next, true);
});

test('error middleware hides internal messages for 5xx errors', () => {
    const res = mockRes();
    const original = console.error;
    console.error = () => {};
    try {
        errorMiddleware(new Error('Mongo exploded at host 10.0.0.3'), {}, res, () => {});
    } finally {
        console.error = original;
    }
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Internal Server Error');
});

test('error middleware maps known errors to 4xx', () => {
    const cases = [
        [{ name: 'CastError', path: '_id' }, 400],
        [{ code: 11000, keyValue: { email: 'x' } }, 409],
        [{ name: 'JsonWebTokenError', message: 'bad' }, 401],
        [{ name: 'MulterError', message: 'File too large' }, 400],
        [{ type: 'entity.parse.failed', message: 'bad json' }, 400],
    ];
    for (const [err, status] of cases) {
        const res = mockRes();
        errorMiddleware(err, {}, res, () => {});
        assert.equal(res.statusCode, status, JSON.stringify(err));
    }
});

test('CSP is report-only unless CSP_ENFORCE=true', () => {
    delete process.env.CSP_ENFORCE;
    assert.equal(contentSecurityPolicy().reportOnly, true);
    process.env.CSP_ENFORCE = 'true';
    assert.equal(contentSecurityPolicy().reportOnly, false);
    delete process.env.CSP_ENFORCE;
});
