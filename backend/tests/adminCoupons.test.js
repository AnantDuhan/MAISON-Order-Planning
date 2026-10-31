const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Coupon = require('../models/coupon');
const Order = require('../models/order');
const { getAdminCoupons, getAllCoupons, updateCoupon } = require('../controllers/coupon');

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

test('checkout never lists expired coupons, for shoppers or admins', async () => {
    for (const req of [{}, { user: admin, auth: { mfaVerified: true } }, { user: { ...admin, isDemo: true } }]) {
        const seen = [];
        s.set(Coupon, 'find', findReturning([], seen));
        const res = mockRes();
        await getAllCoupons(req, res);
        assert.equal(res.statusCode, 200);
        assert.ok(seen[0].expiresAt.$gt instanceof Date);
        assert.ok(Math.abs(seen[0].expiresAt.$gt.getTime() - Date.now()) < 5000);
    }
});

const couponDoc = (over = {}) => ({
    _id: 'c1', code: 'WELCOME10', discount: 10, membersOnly: false,
    expiresAt: new Date(Date.now() + 86400000), saved: false,
    async save() { this.saved = true; },
    ...over,
});

test('editing a coupon changes discount, expiry and audience', async () => {
    const doc = couponDoc(); let filter;
    s.set(Coupon, 'findOne', async f => { filter = f; return doc; });
    const res = mockRes();
    const ends = new Date(Date.now() + 3 * 86400000).toISOString();
    await updateCoupon({ params: { id: 'c1' }, body: { discount: 15, expiresAt: ends, membersOnly: true }, user: admin }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual([doc.discount, doc.expiresAt.toISOString(), doc.membersOnly, doc.saved], [15, ends, true, true]);
    assert.deepEqual(filter, { _id: 'c1', isDemo: { $ne: true } });
    assert.equal(res.locals.audit.before.discount, 10);
    assert.equal(res.locals.audit.after.discount, 15);
});

test('an expiry in the past ends the coupon now', async () => {
    const doc = couponDoc();
    s.set(Coupon, 'findOne', async () => doc);
    const res = mockRes();
    const now = new Date().toISOString();
    await updateCoupon({ params: { id: 'c1' }, body: { expiresAt: now }, user: admin }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(doc.expiresAt.getTime() <= Date.now());
});

test('bad discount, bad date and unknown coupons are refused', async () => {
    s.set(Coupon, 'findOne', async () => couponDoc());
    for (const body of [{ discount: 0 }, { discount: 101 }, { discount: 'x' }, { expiresAt: 'soon' }, { expiresAt: '' }, { code: '  ' }]) {
        const res = mockRes();
        await updateCoupon({ params: { id: 'c1' }, body, user: admin }, res);
        assert.equal(res.statusCode, 400, JSON.stringify(body));
    }
    s.set(Coupon, 'findOne', async () => null);
    const res = mockRes();
    await updateCoupon({ params: { id: 'nope' }, body: { discount: 5 }, user: admin }, res);
    assert.equal(res.statusCode, 404);
});

test('a code can be renamed until an order has used it', async () => {
    const unused = couponDoc();
    s.set(Coupon, 'findOne', async () => unused);
    s.set(Order, 'countDocuments', async () => 0);
    let res = mockRes();
    await updateCoupon({ params: { id: 'c1' }, body: { code: ' welcome15 ' }, user: admin }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(unused.code, 'WELCOME15');

    const used = couponDoc();
    let counted;
    s.set(Coupon, 'findOne', async () => used);
    s.set(Order, 'countDocuments', async f => { counted = f; return 4; });
    res = mockRes();
    await updateCoupon({ params: { id: 'c1' }, body: { code: 'NEWCODE' }, user: admin }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /used on 4 orders/);
    assert.equal(used.code, 'WELCOME10');
    assert.deepEqual(counted, { couponUsed: true, couponCode: 'WELCOME10' });

    // Same code (any case) is not a rename.
    res = mockRes();
    await updateCoupon({ params: { id: 'c1' }, body: { code: 'welcome10', discount: 12 }, user: admin }, res);
    assert.equal(res.statusCode, 200);
});

test('a duplicate code is a 409, not a 500', async () => {
    const doc = couponDoc({ async save() { const e = new Error('dup'); e.code = 11000; throw e; } });
    s.set(Coupon, 'findOne', async () => doc);
    s.set(Order, 'countDocuments', async () => 0);
    const res = mockRes();
    await updateCoupon({ params: { id: 'c1' }, body: { code: 'TAKEN' }, user: admin }, res);
    assert.equal(res.statusCode, 409);
});
