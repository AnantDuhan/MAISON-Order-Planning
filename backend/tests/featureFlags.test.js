const { test, afterEach, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const FeatureFlag = require('../models/featureFlag');
const cache = require('../utils/cache');
const flags = require('../services/featureFlags');
const { updateFeature, getFeatures } = require('../controllers/features');
const { loginMethods } = require('../controllers/passwordless');

const s = stubs();
let stored;
beforeEach(() => {
    stored = {};
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
});
afterEach(() => {
    s.restore();
    flags._allowDisconnectedReads = false;
});

test('every feature is on by default', async () => {
    const all = await flags.getAll();
    for (const f of flags.FEATURES) assert.equal(all[f.key], f.default, f.key);
});

test('turning a feature off blocks its endpoint with a friendly 403', async () => {
    await flags.setEnabled('returns', false, { id: 'a1', name: 'Admin' });
    const res = mockRes();
    let reached = false;
    await flags.requireFeature('returns')({}, res, () => { reached = true; });
    assert.equal(reached, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'FEATURE_DISABLED');
    assert.match(res.body.message, /Return requests are paused/);

    await flags.setEnabled('returns', true, { id: 'a1', name: 'Admin' });
    await flags.requireFeature('returns')({}, mockRes(), () => { reached = true; });
    assert.equal(reached, true);
});

test('admin toggle validates input, records who changed it, and is audit-logged', async () => {
    const bad = mockRes();
    await updateFeature({ params: { key: 'reviews' }, body: { enabled: 'no' }, user: { _id: 'a1', name: 'Admin' } }, bad);
    assert.equal(bad.statusCode, 400);

    const unknown = mockRes();
    await updateFeature({ params: { key: 'teleport' }, body: { enabled: false }, user: { _id: 'a1', name: 'Admin' } }, unknown);
    assert.equal(unknown.statusCode, 404);

    const res = mockRes();
    await updateFeature({ params: { key: 'reviews' }, body: { enabled: false }, user: { _id: 'a1', name: 'Asha' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.feature.enabled, false);
    assert.equal(res.body.feature.updatedBy, 'Asha');
    assert.deepEqual([res.locals.audit.before.enabled, res.locals.audit.after.enabled], [true, false]);
});

test('the storefront sees the current switches', async () => {
    await flags.setEnabled('coupons', false, { id: 'a1', name: 'Admin' });
    const res = mockRes();
    await getFeatures({}, res);
    assert.equal(res.body.features.coupons, false);
    assert.equal(res.body.features.checkout, true);
});

test('sign-in methods follow the switches; password always stays', async () => {
    await flags.setEnabled('passkeys', false, { id: 'a1', name: 'Admin' });
    await flags.setEnabled('googleLogin', false, { id: 'a1', name: 'Admin' });
    const res = mockRes();
    await loginMethods({}, res);
    assert.equal(res.body.methods.password, true);
    assert.equal(res.body.methods.passkey, false);
    assert.equal(res.body.methods.google, false);
    assert.equal(res.body.methods.emailCode, true);
});

test('if the database cannot be read, features fall back to their defaults', async () => {
    s.set(FeatureFlag, 'find', () => ({ lean: async () => { throw new Error('db down'); } }));
    assert.equal(await flags.isEnabled('checkout'), true);
});
