const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const { lookupOrder, getTrackedOrder } = require('../controllers/tracking');
const { signOrderViewToken, verifyOrderViewToken, trackingView, orderContact } = require('../utils/orderAccess');

const s = stubs();
afterEach(() => s.restore());

const sampleOrder = (overrides = {}) => ({
    _id: 'kzsmhij4',
    user: { _id: 'u1', name: 'Anu', email: 'Anu@Example.com' },
    createdAt: new Date('2026-11-02T04:54:00Z'),
    paidAt: new Date('2026-11-02T04:54:00Z'),
    orderStatus: 'Shipped',
    shippingInfo: { address: '12 Secret Lane', city: 'Coimbatore', state: 'TN', country: 'IN', pinCode: 641035, phoneNumber: 9876543210 },
    orderItems: [{ product: 'p1', name: 'Studio Headphones', quantity: 1, price: 7999, variantLabel: 'Colour: Black', images: [{ url: 'https://img/1.jpg' }] }],
    itemsPrice: 7999,
    shippingPrice: 0,
    totalPrice: 7999,
    paymentInfo: { id: 'cf_123', status: 'PAID' },
    shipment: {
        courier: 'Delhivery', awb: '149087645321', trackingUrl: 'https://track/1', shippedAt: new Date('2026-11-03T11:15:00Z'),
        lastStatus: 'Shipped', events: [{ status: 'Shipped', at: new Date('2026-11-03T11:15:00Z'), source: 'admin', rawStatus: 'x' }],
    },
    ...overrides,
});

const findReturning = (order, seen = {}) => filter => {
    seen.filter = filter;
    return { populate() { return this; }, lean: async () => order };
};

test('lookup with the right order number and email returns tracking and a view token', async () => {
    const seen = {};
    s.set(Order, 'findOne', findReturning(sampleOrder(), seen));
    const res = mockRes();
    await lookupOrder({ body: { orderId: ' #KZSMHIJ4 ', email: ' anu@example.COM ' } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(seen.filter._id, 'kzsmhij4');
    assert.deepEqual(seen.filter.isDemo, { $ne: true });
    assert.equal(res.body.order._id, 'kzsmhij4');
    assert.ok(verifyOrderViewToken(res.body.token, 'kzsmhij4'));
});

test('lookup with the wrong email gives the same answer as a missing order', async () => {
    s.set(Order, 'findOne', findReturning(sampleOrder()));
    const wrongEmail = mockRes();
    await lookupOrder({ body: { orderId: 'kzsmhij4', email: 'someone@else.com' } }, wrongEmail);

    s.set(Order, 'findOne', findReturning(null));
    const missing = mockRes();
    await lookupOrder({ body: { orderId: 'zzzzzzzz', email: 'anu@example.com' } }, missing);

    assert.equal(wrongEmail.statusCode, 404);
    assert.equal(missing.statusCode, 404);
    assert.equal(wrongEmail.body.message, missing.body.message);
    assert.equal(wrongEmail.body.token, undefined);
});

test('lookup rejects malformed input without touching the database', async () => {
    let called = false;
    s.set(Order, 'findOne', () => { called = true; return findReturning(null)(); });
    const res = mockRes();
    await lookupOrder({ body: { orderId: '{"$ne":null}', email: 'a@b.com' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(called, false);
});

test('a view token opens only the order it was issued for', async () => {
    s.set(Order, 'findOne', findReturning(sampleOrder()));
    const token = signOrderViewToken('kzsmhij4');

    const ok = mockRes();
    await getTrackedOrder({ params: { id: 'kzsmhij4' }, query: { t: token }, get: () => undefined }, ok);
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.order.shipment.awb, '149087645321');

    const other = mockRes();
    await getTrackedOrder({ params: { id: 'aaaaaaaa' }, query: { t: token }, get: () => undefined }, other);
    assert.equal(other.statusCode, 404);

    const header = mockRes();
    await getTrackedOrder({ params: { id: 'kzsmhij4' }, query: {}, get: name => (name === 'x-order-token' ? token : undefined) }, header);
    assert.equal(header.statusCode, 200);
});

test('the tracking view leaves out the street address, phone and payment details', () => {
    const view = trackingView(sampleOrder());
    const json = JSON.stringify(view);
    assert.ok(!json.includes('Secret Lane'));
    assert.ok(!json.includes('9876543210'));
    assert.ok(!json.includes('cf_123'));
    assert.ok(!json.includes('rawStatus'));
    assert.equal(view.shipTo.city, 'Coimbatore');
    assert.equal(view.orderItems[0].image, 'https://img/1.jpg');
});

test('orderContact prefers the account holder and falls back to guest details', () => {
    assert.equal(orderContact(sampleOrder()).email, 'anu@example.com');
    assert.deepEqual(
        orderContact({ user: null, guest: { name: 'Ravi', email: 'RAVI@x.in' } }),
        { name: 'Ravi', email: 'ravi@x.in', isGuest: true }
    );
    assert.equal(orderContact({ user: 'u1' }), null);
});
