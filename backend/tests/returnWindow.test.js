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

test('requestReturn stores the reason and trimmed details, and marks the order', async () => {
    const Return = require('../models/return');
    const cache = require('../utils/cache');
    let saved;
    s.set(Return.prototype, 'save', async function () { saved = this.toObject(); return this; });
    s.set(cache, 'del', async () => {});
    const returnEmails = require('../services/returnEmails');
    let emailed;
    s.set(returnEmails, 'sendReturnEmail', async (kind, o, r) => { emailed = { kind, id: o._id, ...r }; });
    const order = {
        _id: 'o2', user: 'u1', orderStatus: 'Delivered', DeliveredAt: deliveredDaysAgo(2),
        orderItems: [{ product: 'p1', quantity: 1 }], return: [],
        save: async () => {},
    };
    s.set(Order, 'findById', async () => order);
    const res = mockRes();
    await requestReturn({
        params: { id: 'o2' }, user: { _id: 'u1' },
        body: { returnReason: 'Damaged or defective', returnDetails: '  The left hinge is cracked.  ' },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(saved.reason, 'Damaged or defective');
    assert.equal(saved.details, 'The left hinge is cracked.');
    assert.equal(order.isReturned, true);
    assert.equal(order.refundStatus, 'Initiated');
    assert.deepEqual(emailed, { kind: 'received', id: 'o2', reason: 'Damaged or defective', details: 'The left hinge is cracked.' });
});

test('getSingleOrder includes the latest return status for the owner', async () => {
    const Return = require('../models/return');
    const cache = require('../utils/cache');
    const { getSingleOrder } = require('../controllers/order');
    s.set(cache, 'getJSON', async () => ({ _id: 'o3', user: { _id: 'u1' }, return: ['r1', 'r2'] }));
    let asked;
    s.set(Return, 'findById', id => { asked = id; return { select: () => ({ lean: async () => ({ status: 'Approved', reason: 'Wrong item sent' }) }) }; });
    const res = mockRes();
    await getSingleOrder({ params: { id: 'o3' }, user: { _id: 'u1' } }, res);
    assert.equal(asked, 'r2');
    assert.equal(res.body.order.returnInfo.status, 'Approved');
});

test('approving a return emails the customer once; repeating the same status does not', async () => {
    const Return = require('../models/return');
    const cache = require('../utils/cache');
    const returnEmails = require('../services/returnEmails');
    const { updateReturnStatus } = require('../controllers/return');
    const sent = [];
    s.set(returnEmails, 'sendReturnEmail', async kind => { sent.push(kind); });
    s.set(cache, 'del', async () => {});
    s.set(Order, 'findById', () => ({ select: () => ({ lean: async () => ({ _id: 'o4', user: 'u1', totalPrice: 2580 }) }) }));
    const doc = { _id: 'r4', order: 'o4', status: 'Pending', reason: 'Wrong item sent', save: async () => {} };
    s.set(Return, 'findById', async () => doc);
    const res = mockRes();
    await updateReturnStatus({ params: { id: 'r4' }, body: { status: 'Approved' } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(doc.approvedAt instanceof Date);
    await updateReturnStatus({ params: { id: 'r4' }, body: { status: 'Approved' } }, mockRes());
    await updateReturnStatus({ params: { id: 'r4' }, body: { status: 'Rejected' } }, mockRes());
    assert.deepEqual(sent, ['approved', 'declined']);
});

test('return emails render the template and go out from the support address', async () => {
    const mailer = require('../utils/sendEmail');
    const { sendReturnEmail } = require('../services/returnEmails');
    for (const kind of ['received', 'approved', 'declined']) {
        let mail;
        s.set(mailer, 'sendEmailInBackground', m => { mail = m; });
        const ok = await sendReturnEmail(kind,
            { _id: 'o5', user: { name: 'Anant Duhan', email: 'a@example.com' }, totalPrice: 31199.22 },
            { reason: 'Damaged or defective', details: 'Cracked <edge>' });
        s.restore();
        assert.equal(ok, true);
        assert.equal(mail.email, 'a@example.com');
        assert.equal(mail.sender, 'support');
        assert.match(mail.html, /Anant/);
        assert.match(mail.html, /Cracked &lt;edge&gt;/); // escaped
        if (kind !== 'declined') assert.match(mail.html, /₹31,199.22/);
    }
});
