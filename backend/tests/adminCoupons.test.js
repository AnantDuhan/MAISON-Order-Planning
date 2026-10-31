const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Coupon = require('../models/coupon');
const Order = require('../models/order');
const { getAdminCoupons, getAllCoupons } = require('../controllers/coupon');

const s = stubs();
afterEach(() => s.restore());

const admin = { _id: 'a1', role: 'admin' };
const findReturning = (rows, seen) => filter => {
    seen.push(filter);
    const q = { sort: () => q, select: () => q, lean: async () => rows, then: (r, j) => Promise.resolve(rows).then(r, j) };
    return q;
};

test('admin coupons come with their usage and whether they are still active', async () => {
    const seen = []; let pipeline;
    const future = new Date(Date.now() + 86400000), past = new Date(Date.now() - 86400000);
    s.set(Coupon, 'find', findReturning([
        { _id: 'c1', code: 'WELCOME10', discount: 10, expiresAt: future, createdAt: past, membersOnly: false },
        { _id: 'c2', code: 'OLD5', discount: 5, expiresAt: past, createdAt: past },
    ], seen));
    s.set(Order, 'aggregate', async p => { pipeline = p; return [{ _id: 'WELCOME10', orders: 3, revenue: 9450.4, discountGiven: 1050, lastUsedAt: past }]; });

    const res = mockRes();
    await getAdminCoupons({ user: admin }, res);

    assert.equal(res.statusCode, 200);
    const [welcome, old] = res.body.coupons;
    assert.deepEqual([welcome.active, welcome.orders, welcome.revenue, welcome.discountGiven], [true, 3, 9450, 1050]);
    assert.deepEqual([old.active, old.orders, old.lastUsedAt], [false, 0, null]);
    // Real admin: demo coupons and demo orders are left out.
    assert.deepEqual(seen[0].isDemo, { $ne: true });
    assert.deepEqual(pipeline[0].$match.isDemo, { $ne: true });
    assert.deepEqual(pipeline[0].$match.couponCode, { $in: ['WELCOME10', 'OLD5'] });
});

test('the demo admin sees only demo coupons', async () => {
    const seen = [];
    s.set(Coupon, 'find', findReturning([], seen));
    await getAdminCoupons({ user: { ...admin, isDemo: true } }, mockRes());
    assert.deepEqual(seen[0], { isDemo: true });
});

test('checkout coupons for the real admin leave out demo coupons', async () => {
    const seen = [];
    s.set(Coupon, 'find', findReturning([], seen));
    await getAllCoupons({ user: admin, auth: { mfaVerified: true } }, mockRes());
    assert.deepEqual(seen[0].isDemo, { $ne: true });
});
