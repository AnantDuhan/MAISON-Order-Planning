const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

// Controllers destructure these at load time, so swap them before requiring.
const cashfree = require('../utils/cashfree');
const sendEmail = require('../utils/sendEmail');
let cashfreeOrder = null;
let cashfreeCreated = null;
let emailsSent = [];
cashfree.getCashfreeOrder = async () => cashfreeOrder;
cashfree.cashfreeRequest = async (url, init) => {
    cashfreeCreated = JSON.parse(init.body);
    return { order_id: cashfreeCreated.order_id, payment_session_id: 'sess_1' };
};
sendEmail.sendEmailInBackground = message => { emailsSent.push(message); };
const invoiceService = require('../services/invoiceService');
invoiceService.sendOrderConfirmationWithInvoice = message => { emailsSent.push(message); };

const Order = require('../models/order');
const Product = require('../models/product');
const Coupon = require('../models/coupon');
const StockAlert = require('../models/stockAlert');
const cache = require('../utils/cache');
const inventory = require('../services/inventoryService');
const featureFlags = require('../services/featureFlags');
const guestOrders = require('../services/guestOrders');
const { newGuestOrder, getSingleOrder } = require('../controllers/order');
const { createGuestCashfreeOrder, verifyGuestCashfreePayment } = require('../controllers/payment');
const { verifyOrderViewToken } = require('../utils/orderAccess');

const s = stubs();
afterEach(() => {
    s.restore();
    cashfreeOrder = null;
    cashfreeCreated = null;
    emailsSent = [];
});

const guest = { email: ' Ravi@Example.com ', name: 'Ravi Kumar', phone: '+91 98765 43210' };
const shippingInfo = { address: '1 Street', city: 'Chennai', state: 'TN', country: 'IN', pinCode: 600001, phoneNumber: 9876543210 };

const setupCatalogue = () => {
    s.set(Product, 'find', async () => [{ _id: 'lamp', name: 'Lamp', price: 400, Stock: 5, images: [] }]);
    s.set(Coupon, 'findOne', async () => null);
    s.set(cache, 'del', async () => {});
    s.set(featureFlags, 'isEnabled', async () => true);
};

const withToken = (token, body) => ({ body, get: name => (name === 'x-guest-token' ? token : undefined) });

const startCheckout = async () => {
    let held;
    s.set(inventory, 'reserveForCheckout', async args => { held = args; });
    s.set(inventory, 'releaseExpiredHolds', async () => {});
    const res = mockRes();
    await createGuestCashfreeOrder({ body: { orderItems: [{ product: 'lamp', quantity: 1 }], guest } }, res);
    return { res, held };
};

test('guest details are validated and tidied', () => {
    assert.deepEqual(guestOrders.cleanGuestDetails(guest), { email: 'ravi@example.com', name: 'Ravi Kumar', phone: '9876543210' });
    assert.throws(() => guestOrders.cleanGuestDetails({ ...guest, email: 'nope' }), /valid email/);
    assert.throws(() => guestOrders.cleanGuestDetails({ ...guest, name: 'R' }), /full name/);
    assert.throws(() => guestOrders.cleanGuestDetails({ ...guest, phone: '12345' }), /10-digit/);
});

test('guest checkout charges standard shipping and holds stock under the checkout, not a user', async () => {
    setupCatalogue();
    const { res, held } = await startCheckout();

    assert.equal(res.statusCode, 200);
    // 400 + ₹150 shipping: guests are never members.
    assert.equal(cashfreeCreated.order_amount, 550);
    assert.match(res.body.orderId, /^order_guest_[a-z0-9]{16}$/);
    assert.equal(held.userId, `guest:${res.body.orderId}`);
    assert.equal(cashfreeCreated.customer_details.customer_email, 'ravi@example.com');
    assert.equal(cashfreeCreated.customer_details.customer_phone, '9876543210');

    const checkout = guestOrders.readGuestCheckoutToken(res.body.guestToken);
    assert.equal(checkout.cashfreeOrderId, res.body.orderId);
    assert.equal(checkout.guest.email, 'ravi@example.com');
});

test('guest checkout refuses bad contact details before taking stock', async () => {
    setupCatalogue();
    let reserved = false;
    s.set(inventory, 'reserveForCheckout', async () => { reserved = true; });
    const res = mockRes();
    await createGuestCashfreeOrder({ body: { orderItems: [{ product: 'lamp', quantity: 1 }], guest: { ...guest, email: 'x' } } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(reserved, false);
});

test('a guest can only verify the payment its token was issued for', async () => {
    const token = guestOrders.signGuestCheckoutToken({ cashfreeOrderId: 'order_guest_aaaa', guest: { email: 'a@b.co', name: 'A B', phone: '9876543210' } });
    cashfreeOrder = { order_status: 'PAID', cf_order_id: 'cf9' };

    const ok = mockRes();
    await verifyGuestCashfreePayment({ params: { orderId: 'order_guest_aaaa' }, get: () => token }, ok);
    assert.equal(ok.body.status, 'PAID');

    const other = mockRes();
    await verifyGuestCashfreePayment({ params: { orderId: 'order_guest_bbbb' }, get: () => token }, other);
    assert.equal(other.statusCode, 403);
});

test('a paid guest checkout becomes an order with guest details from the token', async () => {
    setupCatalogue();
    const { res: started } = await startCheckout();
    cashfreeOrder = { order_status: 'PAID', order_amount: 550, cf_order_id: 'cf1' };
    let created;
    s.set(Order, 'findOne', () => ({ select: async () => null }));
    s.set(Order, 'create', async doc => { created = doc; return doc; });
    s.set(inventory, 'getHold', async () => ({ user: `guest:${started.body.orderId}` }));
    s.set(inventory, 'commitForOrder', async () => ({ committed: true, shortfall: false, source: 'hold' }));

    const res = mockRes();
    await newGuestOrder(withToken(started.body.guestToken, {
        shippingInfo,
        orderItems: [{ product: 'lamp', quantity: 1 }],
        // Whatever the body says about who is buying is ignored.
        guest: { email: 'attacker@evil.com' },
        paymentInfo: { provider: 'cashfree', id: started.body.orderId },
    }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(created.user, null);
    assert.deepEqual(created.guest, { email: 'ravi@example.com', name: 'Ravi Kumar', phone: '9876543210' });
    assert.equal(created.shippingPrice, 150);
    assert.equal(created.memberTier, null);
    assert.ok(verifyOrderViewToken(res.body.trackingToken, created._id));
    assert.equal(emailsSent.length, 1);
    assert.equal(emailsSent[0].user.email, 'ravi@example.com');
    assert.match(emailsSent[0].html, /\/track\//);
});

test('a guest order needs the matching token and payment id', async () => {
    setupCatalogue();
    let created = false;
    s.set(Order, 'create', async () => { created = true; });
    const token = guestOrders.signGuestCheckoutToken({ cashfreeOrderId: 'order_guest_aaaa', guest: { email: 'a@b.co', name: 'A B', phone: '9876543210' } });
    const body = { shippingInfo, orderItems: [{ product: 'lamp', quantity: 1 }], paymentInfo: { provider: 'cashfree', id: 'order_guest_aaaa' } };

    const noToken = mockRes();
    await newGuestOrder(withToken(undefined, body), noToken);
    assert.equal(noToken.statusCode, 403);

    // An account's payment can't be turned into a guest order.
    const accountPayment = mockRes();
    await newGuestOrder(withToken(token, { ...body, paymentInfo: { provider: 'cashfree', id: 'order_u1_abc' } }), accountPayment);
    assert.equal(accountPayment.statusCode, 403);

    s.set(inventory, 'getHold', async () => ({ user: 'u1' }));
    const someoneElsesHold = mockRes();
    await newGuestOrder(withToken(token, body), someoneElsesHold);
    assert.equal(someoneElsesHold.statusCode, 403);
    assert.equal(created, false);
});

test('a repeated guest order request returns the same order', async () => {
    setupCatalogue();
    const token = guestOrders.signGuestCheckoutToken({ cashfreeOrderId: 'order_guest_aaaa', guest: { email: 'a@b.co', name: 'A B', phone: '9876543210' } });
    cashfreeOrder = { order_status: 'PAID', order_amount: 550, cf_order_id: 'cf1' };
    s.set(inventory, 'getHold', async () => null);
    s.set(Order, 'findOne', () => ({ select: async () => ({ _id: 'existing1', totalPrice: 550 }) }));
    let created = false;
    s.set(Order, 'create', async () => { created = true; });

    const res = mockRes();
    await newGuestOrder(withToken(token, { shippingInfo, orderItems: [{ product: 'lamp', quantity: 1 }], paymentInfo: { provider: 'cashfree', id: 'order_guest_aaaa' } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.deduped, true);
    assert.equal(res.body.order._id, 'existing1');
    assert.equal(created, false);
    assert.equal(emailsSent.length, 0);
});

test('only a verified email claims guest orders', async () => {
    const queries = [];
    s.set(Order, 'find', filter => ({ distinct: async () => { queries.push(filter); return ['o1', 'o2']; } }));
    let update;
    s.set(Order, 'updateMany', async (filter, change) => { update = { filter, change }; return { modifiedCount: 2 }; });
    s.set(StockAlert, 'updateMany', async () => ({}));
    s.set(cache, 'del', async () => {});

    assert.equal(await guestOrders.claimGuestOrders({ _id: 'u1', email: 'ravi@example.com', isEmailVerified: false }), 0);
    assert.equal(queries.length, 0);

    assert.equal(await guestOrders.claimGuestOrders({ _id: 'u1', email: 'Ravi@Example.com', isEmailVerified: true }), 2);
    assert.deepEqual(queries[0], { user: null, 'guest.email': 'ravi@example.com' });
    // Only still-unclaimed orders move, even if another sign-in raced us.
    assert.equal(update.filter.user, null);
    assert.equal(update.change.$set.user, 'u1');
    assert.ok(update.change.$set['guest.claimedAt'] instanceof Date);
});

test('opening an unclaimed guest order with the matching verified account claims it', async () => {
    const guestOrder = { _id: 'o1', user: null, guest: { email: 'ravi@example.com', name: 'Ravi' }, orderItems: [] };
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(Order, 'findById', () => ({ populate() { return this; }, lean: async () => guestOrder }));
    let claimedFor = null;
    s.set(guestOrders, 'claimGuestOrders', async user => { claimedFor = user; return 1; });

    const stranger = mockRes();
    await getSingleOrder({ params: { id: 'o1' }, user: { _id: 'u2', email: 'other@x.com', isEmailVerified: true } }, stranger);
    assert.equal(stranger.statusCode, 404);

    const unverified = mockRes();
    await getSingleOrder({ params: { id: 'o1' }, user: { _id: 'u3', email: 'ravi@example.com', isEmailVerified: false } }, unverified);
    assert.equal(unverified.statusCode, 404);
    assert.equal(claimedFor, null);

    const owner = mockRes();
    await getSingleOrder({ params: { id: 'o1' }, user: { _id: 'u1', email: 'Ravi@Example.com', isEmailVerified: true } }, owner);
    assert.equal(owner.statusCode, 200);
    assert.equal(claimedFor._id, 'u1');
});
