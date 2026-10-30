const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mockRes } = require('./helpers');

const { logout } = require('../controllers/user');

const original = process.env.NODE_ENV;
afterEach(() => { process.env.NODE_ENV = original; });

// mockRes has no clearCookie; record what Express would be asked to do.
const resWithClear = () => {
    const res = mockRes();
    res.cleared = [];
    res.clearCookie = function (name, options) { this.cleared.push({ name, options }); return this; };
    return res;
};

test('logout clears the session cookie with the attributes it was set with', async () => {
    process.env.NODE_ENV = 'production';
    const res = resWithClear();
    await logout({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.cleared, [{
        name: 'token',
        options: { path: '/', httpOnly: true, secure: true, sameSite: 'none' },
    }]);
});

test('logout is never cacheable, so every click reaches the server', async () => {
    const res = resWithClear();
    await logout({}, res);
    assert.equal(res.headers['cache-control'], 'no-store');
});

test('logout accepts POST (the app) and GET (older clients)', () => {
    const router = require('../routes/user');
    const layer = router.stack.find(l => l.route?.path === '/logout');
    assert.ok(layer, 'logout route exists');
    assert.equal(layer.route.methods.post, true);
    assert.equal(layer.route.methods.get, true);
});
