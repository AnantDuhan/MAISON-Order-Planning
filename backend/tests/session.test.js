const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test-secret';
const { issueSession, completeLogin, sessionPolicy, wantsToBeRemembered } = require('../utils/session');

const fakeRes = () => {
    const res = { statusCode: 200, cookies: {} };
    res.status = c => { res.statusCode = c; return res; };
    res.cookie = (name, value, options) => { res.cookies[name] = { value, options }; return res; };
    res.json = b => { res.body = b; return res; };
    return res;
};
const lifetimeOf = token => { const d = jwt.decode(token); return (d.exp - d.iat) / 3600; };

test('remember me: customers stay signed in 90 days, cookie survives a browser restart', () => {
    const res = fakeRes();
    issueSession({ _id: 'u1', role: 'user' }, res, 200, false, { remember: true });
    const { value, options } = res.cookies.token;
    assert.equal(lifetimeOf(value), 90 * 24);
    assert.ok(options.expires instanceof Date);
    assert.equal(options.httpOnly, true);
});

test('not remembered: browser-session cookie (no expiry) and a 12h token', () => {
    const res = fakeRes();
    issueSession({ _id: 'u1', role: 'user' }, res, 200, false, { remember: false });
    const { value, options } = res.cookies.token;
    assert.equal(options.expires, undefined);
    assert.equal(lifetimeOf(value), 12);
});

test('admins are capped at 12 hours either way', () => {
    assert.equal(sessionPolicy({ role: 'admin' }, true).lifetimeMs, 12 * 3600 * 1000);
    assert.equal(sessionPolicy({ role: 'admin' }, true).persistent, true);
    assert.equal(sessionPolicy({ role: 'admin' }, false).persistent, false);
});

test('only an explicit false turns remember me off (magic links, old clients)', () => {
    assert.equal(wantsToBeRemembered({ body: {} }), true);
    assert.equal(wantsToBeRemembered(undefined), true);
    assert.equal(wantsToBeRemembered({ body: { rememberMe: true } }), true);
    assert.equal(wantsToBeRemembered({ body: { rememberMe: false } }), false);
});

test('the choice is carried through the 2FA step in the pending token', async () => {
    const res = fakeRes();
    await completeLogin(
        { _id: 'u1', role: 'user', twoFactorAuth: { enabled: true } },
        res,
        { req: { body: { rememberMe: false }, cookies: {} } }
    );
    assert.equal(res.body.twoFactorRequired, true);
    assert.equal(jwt.decode(res.body.twoFactorToken).remember, false);
    assert.equal(res.cookies.token, undefined);
});
