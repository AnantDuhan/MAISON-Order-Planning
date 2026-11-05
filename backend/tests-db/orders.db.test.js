const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, stopDb, clearDb, orderDoc, DAY } = require('./setup');
const { mockRes } = require('../tests/helpers');

const Order = require('../models/order');
const Invoice = require('../models/invoice');
const StockAlert = require('../models/stockAlert');
const orderListing = require('../services/orderListing');
const { claimGuestOrders } = require('../services/guestOrders');
const { myInvoices } = require('../controllers/invoice');

before(startDb);
after(stopDb);
beforeEach(clearDb);

// ---- Order model -------------------------------------------------------------------

test('one payment can only ever make one order (unique paymentInfo.id)', async () => {
    await Order.create(orderDoc({ paymentInfo: { id: 'cf_same', status: 'PAID' } }));
    await assert.rejects(
        Order.create(orderDoc({ paymentInfo: { id: 'cf_same', status: 'PAID' } })),
        err => err.code === 11000
    );
});

test('an order needs an account or a guest email', async () => {
    await assert.rejects(Order.create(orderDoc({ user: null })), /account or a guest email/);
    const guest = await Order.create(orderDoc({ user: null, guest: { email: 'Ravi@Example.com', name: 'Ravi' } }));
    assert.equal(guest.guest.email, 'ravi@example.com');
});

// ---- Claiming guest orders ------------------------------------------------------------

test('a verified sign-in claims exactly its own unclaimed guest orders', async () => {
    const mine1 = await Order.create(orderDoc({ user: null, guest: { email: 'a@x.com', name: 'A' } }));
    const mine2 = await Order.create(orderDoc({ user: null, guest: { email: 'a@x.com', name: 'A' } }));
    const other = await Order.create(orderDoc({ user: null, guest: { email: 'b@x.com', name: 'B' } }));
    // Same email, but already claimed by another account: stays there.
    const taken = await Order.create(orderDoc({ user: 'u9', guest: { email: 'a@x.com', name: 'A', claimedAt: new Date() } }));
    await StockAlert.create({ _id: 'al1', product: 'p1', variant: null, user: null, email: 'a@x.com' });

    assert.equal(await claimGuestOrders({ _id: 'u1', email: 'a@x.com', isEmailVerified: false }), 0);
    assert.equal(await Order.countDocuments({ user: 'u1' }), 0);

    assert.equal(await claimGuestOrders({ _id: 'u1', email: 'A@X.com', isEmailVerified: true }), 2);
    const after = Object.fromEntries((await Order.find().lean()).map(o => [o._id, o]));
    assert.equal(after[mine1._id].user, 'u1');
    assert.equal(after[mine2._id].user, 'u1');
    assert.ok(after[mine1._id].guest.claimedAt instanceof Date);
    assert.equal(after[other._id].user, null);
    assert.equal(after[taken._id].user, 'u9');
    assert.equal((await StockAlert.findById('al1').lean()).user, 'u1');

    // Nothing left to claim.
    assert.equal(await claimGuestOrders({ _id: 'u1', email: 'a@x.com', isEmailVerified: true }), 0);
});

test('My Invoices includes invoices of claimed guest orders, not other guests\'', async () => {
    const claimed = await Order.create(orderDoc({ user: 'u1', guest: { email: 'a@x.com', claimedAt: new Date() } }));
    const unclaimed = await Order.create(orderDoc({ user: null, guest: { email: 'b@x.com' } }));
    const base = { type: 'order', total: 550, issuedAt: new Date() };
    await Invoice.create([
        { ...base, _id: 'i1', invoiceNumber: 'MSN/1', sourceId: 'o-own', order: 'o-own', user: 'u1' },
        { ...base, _id: 'i2', invoiceNumber: 'MSN/2', sourceId: claimed._id, order: claimed._id, user: null },
        { ...base, _id: 'i3', invoiceNumber: 'MSN/3', sourceId: unclaimed._id, order: unclaimed._id, user: null },
        { ...base, _id: 'i4', invoiceNumber: 'MSN/4', sourceId: 'o-u2', order: 'o-u2', user: 'u2' },
    ]);

    const res = mockRes();
    await myInvoices({ user: { _id: 'u1' }, query: {} }, res);
    assert.deepEqual(res.body.invoices.map(i => i.invoiceNumber).sort(), ['MSN/1', 'MSN/2']);
});

// ---- Order lists ----------------------------------------------------------------------

const NOW = new Date('2026-11-05T06:30:00Z'); // 12:00 in India

const seedListing = async () => {
    const ago = days => new Date(NOW.getTime() - days * DAY);
    const late = await Order.create(orderDoc({ orderStatus: 'Shipped', estimatedDeliveryDate: ago(2), createdAt: ago(8) }));
    const veryLate = await Order.create(orderDoc({ orderStatus: 'Processing', estimatedDeliveryDate: ago(5), createdAt: ago(10) }));
    const plusLate = await Order.create(orderDoc({ orderStatus: 'Processing', memberTier: 'plus', estimatedDeliveryDate: ago(1), createdAt: ago(6) }));
    const plusToShip = await Order.create(orderDoc({ orderStatus: 'Processing', memberTier: 'plus', estimatedDeliveryDate: ago(-3), createdAt: ago(1) }));
    // Due today: not late yet (the day isn't over).
    const dueToday = await Order.create(orderDoc({ orderStatus: 'Shipped', estimatedDeliveryDate: new Date('2026-11-05T02:00:00Z'), createdAt: ago(4) }));
    const refunded = await Order.create(orderDoc({ orderStatus: 'Shipped', isRefunded: true, estimatedDeliveryDate: ago(9), createdAt: ago(12) }));
    const demoLate = await Order.create(orderDoc({ isDemo: true, orderStatus: 'Shipped', estimatedDeliveryDate: ago(3), createdAt: ago(5) }));
    const delivered = [];
    for (let i = 0; i < 26; i += 1) {
        delivered.push(await Order.create(orderDoc({ orderStatus: 'Delivered', DeliveredAt: ago(i), createdAt: ago(20 + i) })));
    }
    return { late, veryLate, plusLate, plusToShip, dueToday, refunded, demoLate, delivered };
};

test('admin list page 1 pins late orders (most overdue first) then Plus to ship, and pages the rest', async () => {
    const o = await seedListing();
    const page1 = await orderListing.adminOrders({ view: 'all', page: 1, now: NOW });

    assert.deepEqual(page1.pinned.map(x => x._id), [o.veryLate._id, o.late._id, o.plusLate._id, o.plusToShip._id]);
    assert.deepEqual(page1.counts, { late: 3, plusToShip: 1 });

    // The rest: due today, refunded and 26 delivered = 28, newest first, 25 a page.
    assert.equal(page1.total, 28);
    assert.equal(page1.pages, 2);
    assert.equal(page1.orders.length, 25);
    assert.equal(page1.orders[0]._id, o.dueToday._id);
    const created = page1.orders.map(x => new Date(x.createdAt).getTime());
    assert.deepEqual(created, [...created].sort((a, b) => b - a));
    const pinnedIds = new Set(page1.pinned.map(x => x._id));
    assert.ok(page1.orders.every(x => !pinnedIds.has(x._id)), 'no order shows twice');
    assert.ok(![...page1.orders, ...page1.pinned].some(x => x._id === o.demoLate._id), 'demo orders stay out');

    const page2 = await orderListing.adminOrders({ view: 'all', page: 2, now: NOW });
    assert.equal(page2.orders.length, 3);
    assert.deepEqual(page2.pinned, []);
    assert.equal(page2.orders.at(-1)._id, o.delivered.at(-1)._id);

    // The list carries no street address, phone or payment id.
    const json = JSON.stringify(page1);
    assert.ok(!json.includes('1 Street'));
    assert.ok(!json.includes('9876543210'));
    assert.ok(!json.includes('cf_'));
});

test('the late view lists every late order, most overdue first', async () => {
    const o = await seedListing();
    const late = await orderListing.adminOrders({ view: 'late', now: NOW });
    assert.deepEqual(late.orders.map(x => x._id), [o.veryLate._id, o.late._id, o.plusLate._id]);
    assert.equal(late.total, 3);

    const demo = await orderListing.adminOrders({ view: 'late', demo: true, now: NOW });
    assert.deepEqual(demo.orders.map(x => x._id), [o.demoLate._id]);
});

test('My Orders is newest first, paged, and only the shopper\'s own', async () => {
    const ago = days => new Date(NOW.getTime() - days * DAY);
    const oldest = await Order.create(orderDoc({ user: 'u1', createdAt: ago(3) }));
    const middle = await Order.create(orderDoc({ user: 'u1', createdAt: ago(2) }));
    const newest = await Order.create(orderDoc({ user: 'u1', createdAt: ago(1) }));
    await Order.create(orderDoc({ user: 'u2', createdAt: ago(0) }));

    const first = await orderListing.customerOrders('u1', { limit: 2 });
    assert.deepEqual(first.orders.map(x => x._id), [newest._id, middle._id]);
    assert.equal(first.total, 3);
    assert.equal(first.pages, 2);

    const second = await orderListing.customerOrders('u1', { limit: 2, page: 2 });
    assert.deepEqual(second.orders.map(x => x._id), [oldest._id]);

    // Nonsense paging falls back to sane values.
    const odd = await orderListing.customerOrders('u1', { page: '-4', limit: '100000' });
    assert.equal(odd.page, 1);
    assert.equal(odd.limit, 100);
});
