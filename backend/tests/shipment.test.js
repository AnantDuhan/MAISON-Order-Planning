const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const User = require('../models/user');
const cache = require('../utils/cache');
const shipments = require('../services/shipmentService');
const { addTrackingEvent } = require('../controllers/order');

const s = stubs();
afterEach(() => s.restore());

const shippedOrder = (overrides = {}) => {
    const order = {
        _id: 'o1',
        user: 'u1',
        orderStatus: 'Shipped',
        shipment: { courier: 'Delhivery', awb: 'AWB1', events: [{ status: 'Shipped', at: new Date('2026-10-01T10:00:00Z') }] },
        saved: 0,
        async save() { this.saved += 1; },
        ...overrides,
    };
    return order;
};

const quiet = () => {
    s.set(cache, 'del', async () => {});
    // No customer lookups/emails in these tests.
    s.set(User, 'findById', () => ({ select: async () => null }));
};

test('marking shipped records courier, AWB, a tracking link and the first event', () => {
    const order = { shipment: undefined };
    shipments.applyShipped(order, { courier: 'Delhivery', awb: ' 1234 ' });
    assert.equal(order.shipment.awb, '1234');
    assert.match(order.shipment.trackingUrl, /delhivery\.com/);
    assert.equal(order.shipment.events[0].status, 'Shipped');
    assert.equal(order.shipment.lastStatus, 'Shipped');
});

test('duplicate tracking events are ignored', async () => {
    quiet();
    const order = shippedOrder();
    const event = { status: 'In transit', at: '2026-10-02T09:00:00Z', location: 'Chennai Hub' };
    const first = await shipments.addTrackingEvent(order, event, { notify: false });
    const second = await shipments.addTrackingEvent(order, event, { notify: false });
    assert.equal(first.added, true);
    assert.equal(second.added, false);
    assert.equal(order.shipment.events.length, 2);
    assert.equal(order.saved, 1);
});

test('a Delivered event moves a shipped order to Delivered', async () => {
    quiet();
    const order = shippedOrder();
    const result = await shipments.addTrackingEvent(order, { status: 'Delivered' }, { notify: false });
    assert.equal(result.delivered, true);
    assert.equal(order.orderStatus, 'Delivered');
    assert.ok(order.DeliveredAt instanceof Date);
});

test('tracking events need a shipped order', async () => {
    quiet();
    const order = shippedOrder({ orderStatus: 'Processing' });
    await assert.rejects(
        shipments.addTrackingEvent(order, { status: 'In transit' }, { notify: false }),
        error => error.statusCode === 409
    );
});

test('admin endpoint rejects unknown statuses', async () => {
    quiet();
    s.set(Order, 'findById', async () => shippedOrder());
    const res = mockRes();
    await addTrackingEvent({ params: { id: 'o1' }, body: { status: 'Teleported' }, app: { get: () => null } }, res);
    assert.equal(res.statusCode, 400);
});
