const { test, afterEach, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const FeatureFlag = require('../models/featureFlag');
const cache = require('../utils/cache');
const flags = require('../services/featureFlags');
const auth = require('../middleware/auth');
const maintenanceGate = require('../middleware/maintenance');
const { getFeatures } = require('../controllers/features');

const s = stubs();
let stored;
let session;

beforeEach(() => {
    stored = {};
    session = null;
    delete process.env.MAINTENANCE_MODE;
    flags._resetCache();
    flags._allowDisconnectedReads = true;
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(cache, 'del', async () => {});
    s.set(FeatureFlag, 'find', () => ({ lean: async () => Object.entries(stored).map(([k, v]) => ({ _id: k, ...v })) }));
    s.set(FeatureFlag, 'updateOne', async (filter, update) => {
        stored[filter._id] = { ...stored[filter._id], ...update.$set };
        return {};
    });
    s.set(auth, 'resolveSession', async () => session);
});
afterEach(() => {
    s.restore();
    delete process.env.MAINTENANCE_MODE;
    flags._allowDisconnectedReads = false;
});

const closeShop = () => flags.setEnabled('storefront', false, { id: 'a1', name: 'Admin' });

// Runs the gate; returns { passed, res }.
const run = async (path, { method = 'GET' } = {}) => {
    const res = mockRes();
    let passed = false;
    await maintenanceGate({ path, method, cookies: { token: 't' } }, res, () => { passed = true; });
    return { passed, res };
};

test('the storefront is open by default and the gate lets everything through', async () => {
    assert.equal(await flags.isMaintenanceOn(), false);
    const { passed } = await run('/products');
    assert.equal(passed, true);
});

test('switching the storefront off blocks customers with a 503 and Retry-After', async () => {
    await closeShop();
    const { passed, res } = await run('/products');
    assert.equal(passed, false);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'MAINTENANCE');
    assert.match(res.body.message, /closed for maintenance/);
    assert.equal(res.headers['retry-after'], '300');
});

test('payments in progress, gateway callbacks, jobs and sign-in keep working', async () => {
    await closeShop();
    const allowed = [
        '/health', '/features', '/jobs/stock-holds', '/cashfree/webhook', '/membership/webhook',
        '/membership/return', '/cashfree/order/order_u1_abc/verify', '/order/new', '/wallet/me',
        '/me', '/logout', '/login', '/login/2fa', '/login/passkey/verify', '/auth/google',
        '/password/forgot', '/password/reset/tok123',
    ];
    for (const path of allowed) {
        const { passed } = await run(path);
        assert.equal(passed, true, path);
    }
    // Starting a new payment or a demo session is blocked.
    for (const path of ['/cashfree/order', '/demo/quick-login', '/orders/me', '/cart']) {
        const { passed } = await run(path, { method: 'POST' });
        assert.equal(passed, false, path);
    }
});

test('only real admins who passed 2FA get through, not the demo admin', async () => {
    await closeShop();

    session = { decoded: { mfaVerified: true }, user: { role: 'admin', isDemo: false } };
    assert.equal((await run('/admin/orders')).passed, true);

    session = { decoded: { mfaVerified: true }, user: { role: 'admin', isDemo: true } };
    assert.equal((await run('/admin/orders')).passed, false);

    session = { decoded: { mfaVerified: false }, user: { role: 'admin', isDemo: false } };
    assert.equal((await run('/admin/orders')).passed, false);

    session = { decoded: { mfaVerified: true }, user: { role: 'user', isDemo: false } };
    assert.equal((await run('/products')).passed, false);
});

test('a failing session lookup is treated as a customer, not a server error', async () => {
    await closeShop();
    s.set(auth, 'resolveSession', async () => { throw new Error('db down'); });
    const { passed, res } = await run('/products');
    assert.equal(passed, false);
    assert.equal(res.statusCode, 503);
});

test('MAINTENANCE_MODE=true closes the shop even when the switch is on', async () => {
    process.env.MAINTENANCE_MODE = 'true';
    assert.equal(await flags.isEnabled('storefront'), true);
    assert.equal(await flags.isMaintenanceOn(), true);
    assert.equal((await run('/products')).res.statusCode, 503);

    const res = mockRes();
    await getFeatures({}, res);
    assert.equal(res.body.features.storefront, false);
    assert.equal(res.body.features.checkout, true);
});

test('reopening the storefront lets customers back in', async () => {
    await closeShop();
    assert.equal((await run('/products')).passed, false);
    await flags.setEnabled('storefront', true, { id: 'a1', name: 'Admin' });
    assert.equal((await run('/products')).passed, true);
});
