const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Return = require('../models/return');
const Refund = require('../models/refund');
const cache = require('../utils/cache');
const { getAllReturns } = require('../controllers/return');
const { getAllRefunds } = require('../controllers/refund');

const s = stubs();
afterEach(() => s.restore());

// Records every populate() and sort() a query chain receives.
const chain = (calls, result = []) => {
    const q = {
        populate: arg => { calls.populate.push(arg); return q; },
        sort: arg => { calls.sort.push(arg); return q; },
        limit: () => q,
        lean: async () => result,
    };
    return q;
};
const admin = { _id: 'a1', role: 'admin' };

test('admin returns include each order line and product photo', async () => {
    const calls = { populate: [], sort: [] };
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(Return, 'find', () => chain(calls));

    const res = mockRes();
    await getAllReturns({ user: admin }, res);

    assert.equal(res.statusCode, 200);
    const order = calls.populate.find(p => p.path === 'order');
    const product = calls.populate.find(p => p.path === 'products.product');
    assert.match(order.select, /\borderItems\b/);
    assert.match(product.select, /\bimages\b/);
});

test('admin refunds include the order lines and are newest first', async () => {
    const calls = { populate: [], sort: [] };
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(Refund, 'find', () => chain(calls));

    const res = mockRes();
    await getAllRefunds({ user: admin }, res);

    assert.equal(res.statusCode, 200);
    assert.match(calls.populate.find(p => p.path === 'order').select, /\borderItems\b/);
    assert.deepEqual(calls.sort, ['-initiatedAt']);
});

test('demo admin returns and refunds load the same item details', async () => {
    for (const [Model, handler] of [[Return, getAllReturns], [Refund, getAllRefunds]]) {
        const calls = { populate: [], sort: [] };
        s.set(Model, 'find', () => chain(calls));
        await handler({ user: { ...admin, isDemo: true } }, mockRes());
        assert.match(calls.populate.find(p => p.path === 'order').select, /\borderItems\b/);
    }
});
