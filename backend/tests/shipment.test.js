const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const User = require('../models/user');
const cache = require('../utils/cache');
const shipments = require('../services/shipmentService');
const { courierWebhook, addTrackingEvent } = require('../controllers/order');

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

test('courier statuses map onto the timeline', () => {
    const map = shipments.normalizeCourierStatus;
    assert.equal(map('IN TRANSIT'), 'In transit');
    assert.equal(map('PICKED UP'), 'In transit');
    assert.equal(map('OUT FOR DELIVERY'), 'Out for delivery');
    assert.equal(map('DELIVERED'), 'Delivered');
    assert.equal(map('UNDELIVERED'), 'Delivery attempted');
    assert.equal(map('RTO INITIATED'), 'Returning to sender');
    assert.equal(map('RTO DELIVERED'), 'Returning to sender');
    assert.equal(map('SHIPMENT DELAYED'), 'Delayed');
    assert.equal(map('CANCELED'), null);
});

test('Shiprocket timestamps are read as IST', () => {
    const d = shipments.parseCourierDate('23 05 2023 11:43:52');
    assert.equal(d.toISOString(), '2023-05-23T06:13:52.000Z');
});

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

const webhook = async (body, key) => {
    const res = mockRes();
    await courierWebhook({ body, get: () => key, app: { get: () => null } }, res);
    return res;
};

test('courier webhook needs the shared token', async () => {
    process.env.SHIPPING_WEBHOOK_TOKEN = 'secret-token';
    const res = await webhook({ awb: 'AWB1', current_status: 'IN TRANSIT' }, 'wrong');
    assert.equal(res.statusCode, 401);
});

test('courier webhook adds the latest scan to the matching order', async () => {
    process.env.SHIPPING_WEBHOOK_TOKEN = 'secret-token';
    quiet();
    const order = shippedOrder();
    s.set(Order, 'findOne', async filter => (filter['shipment.awb'] === 'AWB1' ? order : null));

    const res = await webhook({
        awb: 'AWB1',
        courier_name: 'Delhivery Surface',
        current_status: 'OUT FOR DELIVERY',
        current_timestamp: '02 10 2026 09:15:00',
        scans: [
            { date: '2026-10-01 18:00:00', activity: 'Bagged', location: 'Coimbatore Hub' },
            { date: '2026-10-02 09:15:00', activity: 'Out for delivery', location: 'RS Puram DC' },
        ],
    }, 'secret-token');

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.added, true);
    const last = order.shipment.events[order.shipment.events.length - 1];
    assert.equal(last.status, 'Out for delivery');
    assert.equal(last.location, 'RS Puram DC');
    assert.equal(last.source, 'courier');
});

test('courier webhook answers 200 for an unknown AWB', async () => {
    process.env.SHIPPING_WEBHOOK_TOKEN = 'secret-token';
    s.set(Order, 'findOne', async () => null);
    const res = await webhook({ awb: 'NOPE', current_status: 'IN TRANSIT' }, 'secret-token');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.matched, false);
});
