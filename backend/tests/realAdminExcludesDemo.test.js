const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const User = require('../models/user');
const Return = require('../models/return');
const Refund = require('../models/refund');
const Product = require('../models/product');
const Subscription = require('../models/plusMembership');
const cache = require('../utils/cache');
const { planLabel } = require('../utils/membershipPlans');
const { getMembershipAnalytics, getAdminStats } = require('../controllers/analytics');
const { getAllOrders } = require('../controllers/order');
const { getAllReturns } = require('../controllers/return');
const { getAllRefunds } = require('../controllers/refund');
const { getAllUsers } = require('../controllers/user');

const s = stubs();
afterEach(() => s.restore());

const admin = { _id: 'a1', role: 'admin' };
const excludesDemo = filter => assert.deepEqual(filter?.isDemo, { $ne: true }, `filter ${JSON.stringify(filter)} should exclude demo records`);
// A query chain that records the filter it was created with.
const chain = (result = []) => {
    const q = { populate: () => q, sort: () => q, limit: () => q, select: () => q, lean: async () => result, then: (r, j) => Promise.resolve(result).then(r, j) };
    return q;
};

test('real memberships leave out the demo seed\'s made-up plans', async () => {
    const pipelines = []; let findFilter;
    s.set(Subscription, 'aggregate', async pipeline => { pipelines.push(pipeline); return []; });
    s.set(Subscription, 'find', filter => { findFilter = filter; return chain(); });

    await getMembershipAnalytics({ user: admin }, mockRes());

    assert.equal(pipelines.length, 3);
    for (const p of pipelines) excludesDemo(p[0].$match);
    excludesDemo(findFilter);
});

test('real stats count only real orders, users, returns and refunds', async () => {
    const filters = [];
    for (const Model of [Order, User, Return, Refund, Product]) {
        s.set(Model, 'countDocuments', async filter => { filters.push(filter); return 0; });
        s.set(Model, 'estimatedDocumentCount', async () => { throw new Error('estimatedDocumentCount counts demo records'); });
    }
    const res = mockRes();
    await getAdminStats({ user: admin }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(filters.length >= 6);
    filters.forEach(excludesDemo);
});

test('real orders, returns, refunds and users lists leave out demo records', async () => {
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    for (const [Model, handler] of [[Order, getAllOrders], [Return, getAllReturns], [Refund, getAllRefunds], [User, getAllUsers]]) {
        let filter;
        s.set(Model, 'find', f => { filter = f; return chain(); });
        await handler({ user: admin }, mockRes());
        excludesDemo(filter);
    }
});

test('the demo admin still sees only demo users', async () => {
    let filter;
    s.set(User, 'find', f => { filter = f; return chain(); });
    await getAllUsers({ user: { ...admin, isDemo: true } }, mockRes());
    assert.deepEqual(filter, { isDemo: true });
});

test('plans from before tiers read as Maison Plus', () => {
    assert.equal(planLabel('maison-yearly'), 'Maison Plus · Yearly');
    assert.equal(planLabel('maison-monthly'), 'Maison Plus · Monthly');
});
