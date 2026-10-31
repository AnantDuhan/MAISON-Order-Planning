const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Product = require('../models/product');
const Subscription = require('../models/plusMembership');
const cache = require('../utils/cache');
const { publicProduct, hasBrokenVariants, getProductDetails } = require('../controllers/product');
const subscription = require('../controllers/subscription');

const s = stubs();
afterEach(() => s.restore());

// A real Mongoose document, so the Map in variants[].options is a real Map.
const scarf = () => new Product({
    _id: 'scarf1', name: 'Silk Scarf', description: 'Soft.', price: 2490, category: 'Accessories', Stock: 9,
    images: [{ public_id: 'a', url: 'https://img/a.png' }], user: 'admin1',
    options: [{ name: 'Colour', kind: 'color', values: [{ value: 'Rust' }, { value: 'Ink' }] }],
    variants: [
        { _id: 'v1', options: { Colour: 'Rust' }, Stock: 4, price: 2490 },
        { _id: 'v2', options: { Colour: 'Ink' }, Stock: 0, price: 2490 },
    ],
});

test('variant options survive the trip to JSON (a Map must not become {})', () => {
    const out = JSON.parse(JSON.stringify(publicProduct(scarf())));
    assert.deepEqual(out.variants.map(v => v.options), [{ Colour: 'Rust' }, { Colour: 'Ink' }]);
    assert.deepEqual(out.variants.map(v => v.Stock), [4, 0]);
    assert.equal('user' in out, false);
    assert.equal(hasBrokenVariants(out), false);
});

test('a cached product whose variants lost their options is refetched, not served', async () => {
    const broken = JSON.parse(JSON.stringify(publicProduct(scarf())));
    broken.variants.forEach(v => { v.options = {}; });
    assert.equal(hasBrokenVariants(broken), true);
    // Products without options are never "broken".
    assert.equal(hasBrokenVariants({ options: [], variants: [] }), false);

    let fetched = false; let stored;
    s.set(cache, 'getJSON', async () => broken);
    s.set(cache, 'setJSON', async (k, v) => { stored = v; });
    s.set(Product, 'findById', () => ({ populate: async () => { fetched = true; return scarf(); } }));
    const res = mockRes();
    await getProductDetails({ params: { id: 'scarf1' }, app: { get: () => null } }, res);
    assert.equal(fetched, true);
    assert.deepEqual(res.body.product.variants.map(v => v.options), [{ Colour: 'Rust' }, { Colour: 'Ink' }]);
    assert.deepEqual(JSON.parse(JSON.stringify(stored)).variants[0].options, { Colour: 'Rust' });
});

test('membership reads check Cashfree at most once per 10 minutes, and concurrent reads share one check', async () => {
    process.env.CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'test';
    process.env.CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'test';
    subscription._syncState.lastSynced.clear();
    let cashfreeCalls = 0;
    const realFetch = global.fetch;
    global.fetch = async () => { cashfreeCalls += 1; await new Promise(r => setTimeout(r, 30)); return { ok: true, json: async () => ({ subscription_status: 'ACTIVE' }) }; };
    const doc = { _id: 'm1', subscriptionId: 'sub_1', user: 'u1', status: 'ACTIVE', isActive: true, planId: 'maison-plus-yearly-1799', tier: 'plus', duration: 12, activationEmailSentAt: new Date(), save: async () => {}, toObject() { return { ...this }; } };
    const q = { sort: () => q, then: (r, j) => Promise.resolve(doc).then(r, j) };
    s.set(Subscription, 'findOne', () => q);
    s.set(Subscription, 'findById', async () => doc);
    try {
        const call = () => { const res = mockRes(); return subscription.getCurrentMembership({ user: { _id: 'u1' } }, res).then(() => res); };
        const results = await Promise.all(Array.from({ length: 12 }, call)); // a page of product cards
        assert.equal(cashfreeCalls, 1);
        results.forEach(res => assert.equal(res.statusCode, 200));
        await call(); await call();
        assert.equal(cashfreeCalls, 1, 'within 10 minutes the stored state is used');
        subscription._syncState.lastSynced.set('sub_1', Date.now() - subscription._syncState.SYNC_EVERY_MS - 1);
        await call();
        assert.equal(cashfreeCalls, 2, 'after 10 minutes it checks again');
    } finally {
        global.fetch = realFetch;
    }
});
