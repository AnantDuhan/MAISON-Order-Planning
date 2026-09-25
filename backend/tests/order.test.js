const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

// controllers/order.js destructures these at load time, so route them
// through swappable functions before requiring it.
const cashfree = require('../utils/cashfree');
const sendEmail = require('../utils/sendEmail');
const push = require('../utils/pushNotifications');
let cashfreeOrder = null;
let emailsSent = [];
cashfree.getCashfreeOrder = async () => cashfreeOrder;
sendEmail.sendEmailInBackground = message => { emailsSent.push(message); };
push.sendPushNotification = async () => {};

const Order = require('../models/order');
const Product = require('../models/product');
const Coupon = require('../models/coupon');
const User = require('../models/user');
const cache = require('../utils/cache');
const { newOrder, getSingleOrder, reorder } = require('../controllers/order');

const s = stubs();
afterEach(() => {
    s.restore();
    cashfreeOrder = null;
    emailsSent = [];
});

const shippingInfo = {
    address: '1 Street', city: 'Chennai', state: 'TN', country: 'IN', pinCode: 600001, phoneNumber: 9999999999,
};

function setupCatalogue() {
    s.set(Product, 'find', async () => [{ _id: 'lamp', name: 'Lamp', price: 400, Stock: 5, images: [] }]);
    s.set(Coupon, 'findOne', async () => null);
    s.set(User, 'findById', async () => ({ _id: 'u1', email: 'u1@example.com', name: 'U', isDemo: false }));
    s.set(cache, 'del', async () => {});
}

const place = async body => {
    const res = mockRes();
    await newOrder({ user: { _id: 'u1' }, body }, res);
    return res;
};

test('refuses an order without a Cashfree payment', async () => {
    setupCatalogue();
    const res = await place({ shippingInfo, orderItems: [{ product: 'lamp', quantity: 1 }], paymentInfo: { id: 'x' } });
    assert.equal(res.statusCode, 400);
});

test('refuses a payment that belongs to another user', async () => {
    setupCatalogue();
    const res = await place({
        shippingInfo,
        orderItems: [{ product: 'lamp', quantity: 1 }],
        paymentInfo: { provider: 'cashfree', id: 'order_someoneelse_abc' },
    });
    assert.equal(res.statusCode, 403);
});

test('refuses when the amount paid is less than the order total', async () => {
    setupCatalogue();
    cashfreeOrder = { order_status: 'PAID', order_amount: 1, cf_order_id: 'cf1' };
    const res = await place({
        shippingInfo,
        orderItems: [{ product: 'lamp', quantity: 1, price: 1 }],
        totalPrice: 1,
        paymentInfo: { provider: 'cashfree', id: 'order_u1_abc' },
    });
    assert.equal(res.statusCode, 409);
});

test('refuses an unpaid Cashfree order', async () => {
    setupCatalogue();
    cashfreeOrder = { order_status: 'ACTIVE', order_amount: 550 };
    const res = await place({
        shippingInfo,
        orderItems: [{ product: 'lamp', quantity: 1 }],
        paymentInfo: { provider: 'cashfree', id: 'order_u1_abc' },
    });
    assert.equal(res.statusCode, 402);
});

test('creates the order at server prices when the payment matches', async () => {
    setupCatalogue();
    cashfreeOrder = { order_status: 'PAID', order_amount: 550, cf_order_id: 'cf1' };
    let created;
    s.set(Order, 'findOne', () => ({ select: async () => null }));
    s.set(Order, 'create', async doc => { created = doc; return doc; });

    const res = await place({
        shippingInfo,
        orderItems: [{ product: 'lamp', quantity: 1, price: 1 }],
        totalPrice: 1,
        paymentInfo: { provider: 'cashfree', id: 'order_u1_abc' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(created.totalPrice, 550);
    assert.equal(created.orderItems[0].price, 400);
    assert.equal(created.couponUsed, false);
    assert.equal(emailsSent.length, 1);
});

test('users cannot read other users\' orders', async () => {
    const order = { _id: 'o1', user: { _id: 'owner' } };
    s.set(cache, 'getJSON', async () => order);
    const res = mockRes();
    await getSingleOrder({ params: { id: 'o1' }, user: { _id: 'intruder', role: 'user' } }, res);
    assert.equal(res.statusCode, 404);

    const ok = mockRes();
    await getSingleOrder({ params: { id: 'o1' }, user: { _id: 'owner', role: 'user' } }, ok);
    assert.equal(ok.statusCode, 200);
});

test('reorder returns in-stock items instead of creating a paid order', async () => {
    let orderCreated = false;
    s.set(Order, 'findById', () => ({
        lean: async () => ({
            _id: 'o1',
            user: 'u1',
            orderItems: [{ product: 'lamp', quantity: 3, name: 'Lamp' }, { product: 'gone', quantity: 1, name: 'Old' }],
        }),
    }));
    s.set(Order, 'create', async () => { orderCreated = true; });
    s.set(Product, 'find', () => ({ select: async () => [{ _id: 'lamp', Stock: 2 }] }));
    const Reorder = require('../models/reorder');
    s.set(Reorder, 'create', async () => {});

    const res = mockRes();
    await reorder({ params: { orderId: 'o1' }, user: { _id: 'u1' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(orderCreated, false);
    assert.deepEqual(res.body.items, [{ product: 'lamp', quantity: 2 }]);
    assert.deepEqual(res.body.unavailable, [{ product: 'gone', name: 'Old' }]);
});
