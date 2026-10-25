const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const { returnDeadline, isWithinReturnWindow } = require('../utils/returnWindow');
const { requestReturn } = require('../controllers/return');

const s = stubs();
afterEach(() => s.restore());

const DAY = 24 * 60 * 60 * 1000;
const deliveredDaysAgo = days => new Date(Date.now() - days * DAY);

test('deadline is seven days after DeliveredAt', () => {
    const delivered = new Date('2026-10-01T10:00:00Z');
    assert.equal(returnDeadline({ DeliveredAt: delivered }).toISOString(), '2026-10-08T10:00:00.000Z');
});

test('falls back to the courier Delivered event when DeliveredAt is missing', () => {
    const order = { shipment: { events: [{ status: 'Shipped', at: '2026-09-28T00:00:00Z' }, { status: 'Delivered', at: '2026-10-01T00:00:00Z' }] } };
    assert.equal(returnDeadline(order).toISOString(), '2026-10-08T00:00:00.000Z');
});

test('window is open on day 6, closed on day 8, and open when the delivery time is unknown', () => {
    assert.equal(isWithinReturnWindow({ DeliveredAt: deliveredDaysAgo(6) }), true);
    assert.equal(isWithinReturnWindow({ DeliveredAt: deliveredDaysAgo(8) }), false);
    assert.equal(isWithinReturnWindow({ orderStatus: 'Delivered' }), true);
});

test('requestReturn refuses a return after the window closes', async () => {
    s.set(Order, 'findById', async () => ({
        _id: 'o1',
        user: 'u1',
        orderStatus: 'Delivered',
        DeliveredAt: deliveredDaysAgo(10),
        orderItems: [{ product: 'p1', quantity: 1 }],
        return: [],
    }));
    const res = mockRes();
    await requestReturn({ params: { id: 'o1' }, user: { _id: 'u1' }, body: { returnReason: 'Changed my mind' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'RETURN_WINDOW_CLOSED');
    assert.match(res.body.message, /within 7 days of delivery/);
});
