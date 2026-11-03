const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const { defineLifecycle, TransitionError } = require('../lifecycle/stateMachine');
const { orderLifecycle } = require('../lifecycle/orderLifecycle');
const { returnLifecycle } = require('../lifecycle/returnLifecycle');
const { refundLifecycle } = require('../lifecycle/refundLifecycle');

const Return = require('../models/return');
const Refund = require('../models/refund');
const Order = require('../models/order');
const cache = require('../utils/cache');
const invoiceService = require('../services/invoiceService');
const inventory = require('../services/inventoryService');
const refundService = require('../services/refundService');
const { updateReturnStatus } = require('../controllers/return');
const { updateOrder } = require('../controllers/order');

const s = stubs();
afterEach(() => s.restore());

// ---- The engine -----------------------------------------------------------------

test('a lifecycle refuses tables that point at undeclared states or have no actor', () => {
    assert.throws(() => defineLifecycle({ name: 'x', field: 's', initial: 'A', states: { A: { to: { B: { by: ['admin'] } } } } }), /B is not declared/);
    assert.throws(() => defineLifecycle({ name: 'x', field: 's', initial: 'A', states: { A: { to: { B: { by: [] } } }, B: {} } }), /needs "by"/);
    assert.throws(() => defineLifecycle({ name: 'x', field: 's', initial: 'A', states: { A: { terminal: true, to: { B: { by: ['admin'] } } }, B: {} } }), /terminal/);
});

test('transition checks the table, the actor and the guard, then runs enter', () => {
    const machine = defineLifecycle({
        name: 'thing', field: 'state', initial: 'Draft',
        states: {
            Draft: { to: { Live: { by: ['admin'], guard: doc => (doc.title ? null : 'Add a title first') } } },
            Live: { terminal: true, enter: (doc, { at, from }) => { doc.liveAt = at; doc.cameFrom = from; } },
        },
    });
    const doc = { state: 'Draft' };

    assert.throws(() => machine.transition(doc, 'Live', { by: 'customer' }), err => err instanceof TransitionError && err.statusCode === 403);
    assert.throws(() => machine.transition(doc, 'Live', { by: 'admin' }), /Add a title first/);
    doc.title = 'Hello';
    const at = new Date('2026-11-04T00:00:00Z');
    assert.deepEqual(machine.transition(doc, 'Live', { by: 'admin', at }), { from: 'Draft', to: 'Live', changed: true });
    assert.equal(doc.liveAt, at);
    assert.equal(doc.cameFrom, 'Draft');

    // Same state again: a harmless no-op, enter does not run twice.
    doc.liveAt = null;
    assert.equal(machine.transition(doc, 'Live', { by: 'admin' }).changed, false);
    assert.equal(doc.liveAt, null);

    assert.throws(() => machine.transition(doc, 'Draft', { by: 'admin' }), err => err.code === 'TERMINAL');
    assert.throws(() => machine.transition(doc, 'Archived', { by: 'admin' }), err => err.code === 'UNKNOWN_STATE' && err.statusCode === 400);
});

// ---- The tables -----------------------------------------------------------------

test('orders only move forward, one step at a time', () => {
    assert.deepEqual(orderLifecycle.describe(), {
        Processing: { terminal: false, to: { Shipped: ['admin'] } },
        Shipped: { terminal: false, to: { Delivered: ['admin', 'system'] } },
        Delivered: { terminal: true, to: {} },
    });
    assert.equal(orderLifecycle.can({ orderStatus: 'Processing' }, 'Delivered', { by: 'admin' }), false);

    const order = { orderStatus: 'Shipped', estimatedDeliveryDate: new Date() };
    const at = new Date('2026-11-06T10:00:00Z');
    orderLifecycle.transition(order, 'Delivered', { by: 'system', at });
    assert.equal(order.DeliveredAt, at);
    assert.equal(order.estimatedDeliveryDate, null);
});

test('admins decide on returns; only refunds start or finish them', () => {
    assert.deepEqual(returnLifecycle.next('Pending', { by: 'admin' }), ['Approved', 'Rejected']);
    assert.deepEqual(returnLifecycle.next('Approved', { by: 'admin' }), ['Rejected']);
    assert.deepEqual(returnLifecycle.next('Initiated', { by: 'admin' }), []);
    assert.equal(returnLifecycle.can({ status: 'Approved' }, 'Completed', { by: 'admin' }), false);
    assert.equal(returnLifecycle.can({ status: 'Rejected' }, 'Approved', { by: 'admin' }), false);
    assert.equal(returnLifecycle.can({ status: 'Completed' }, 'Pending', { by: 'admin' }), false);
    assert.equal(returnLifecycle.label('Initiated'), 'Refund started');
});

test('a refund is final once refunded or rejected', () => {
    for (const end of ['Refunded', 'Rejected']) {
        assert.ok(refundLifecycle.isTerminal(end));
        assert.deepEqual(refundLifecycle.next(end), []);
    }
    const refund = { status: 'Approved', method: 'store-credit' };
    refundLifecycle.transition(refund, 'Refunded', { by: 'admin' });
    assert.ok(refund.completedAt instanceof Date);
    assert.equal(refund.method, 'original');
});

// ---- Controllers and services ---------------------------------------------------------

const returnDoc = (id, status) => ({ _id: id, status, saved: 0, async save() { this.saved += 1; } });

test('an admin can no longer reopen, complete or un-decline a return by hand', async () => {
    for (const [from, to] of [['Completed', 'Pending'], ['Rejected', 'Approved'], ['Approved', 'Completed'], ['Pending', 'Initiated']]) {
        const ret = returnDoc('r1', from);
        s.set(Return, 'findById', async () => ret);
        const res = mockRes();
        await updateReturnStatus({ params: { id: 'r1' }, body: { status: to } }, res);
        assert.ok([403, 409].includes(res.statusCode), `${from} → ${to} gave ${res.statusCode}`);
        assert.equal(ret.status, from);
        assert.equal(ret.saved, 0);
        s.restore();
    }
});

test('approving a return stamps approvedAt and offers the next move', async () => {
    const ret = returnDoc('r1', 'Pending');
    s.set(Return, 'findById', async () => ret);
    s.set(cache, 'del', async () => {});
    s.set(Order, 'findById', () => ({ select() { return this; }, lean: async () => null }));
    const res = mockRes();
    await updateReturnStatus({ params: { id: 'r1' }, body: { status: 'Approved' } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(ret.approvedAt instanceof Date);
    assert.equal(ret.saved, 1);
    assert.deepEqual(res.body.nextStatuses, ['Rejected']);
});

test('an order can\'t skip shipping or go backwards', async () => {
    const order = { _id: 'o1', orderStatus: 'Processing', orderItems: [], save: async () => { throw new Error('should not save'); } };
    s.set(Order, 'findById', async () => order);
    const res = mockRes();
    await updateOrder({ params: { id: 'o1' }, body: { status: 'Delivered' }, app: { get: () => null } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(order.orderStatus, 'Processing');
});

const refundSetup = returns => {
    const byId = new Map(returns.map(r => [r._id, r]));
    s.set(Return, 'find', async () => [...byId.values()]);
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'restoreStock', async () => {});
    const effects = { creditNotes: 0, invoiceMarked: 0 };
    s.set(invoiceService, 'setOrderInvoiceStatus', async () => { effects.invoiceMarked += 1; });
    s.set(invoiceService, 'issueCreditNoteInBackground', () => { effects.creditNotes += 1; });
    return effects;
};

const deliveredOrder = returnIds => ({
    _id: 'o1', user: 'u1', orderStatus: 'Delivered', totalPrice: 900, return: returnIds, refund: [],
    orderItems: [{ product: 'p1', quantity: 1 }], stockCommittedAt: new Date(),
    save: async () => {},
});

test('starting a refund moves open returns to "Refund started" and skips declined ones', async () => {
    const pending = returnDoc('r1', 'Pending');
    const declined = returnDoc('r2', 'Rejected');
    refundSetup([pending, declined]);
    s.set(Refund, 'exists', async () => null);
    s.set(Refund.prototype, 'save', async function () { return this; });

    const order = deliveredOrder(['r1', 'r2']);
    const refund = await refundService.startRefund(order);
    assert.equal(refund.status, 'Initiated');
    assert.equal(refund.amount, 900);
    assert.equal(pending.status, 'Initiated');
    assert.ok(pending.approvedAt instanceof Date);
    assert.equal(declined.status, 'Rejected');
    assert.equal(order.refundStatus, 'Processing');
    assert.deepEqual(order.refund, [refund._id]);
});

test('a second refund can\'t start while one is open', async () => {
    refundSetup([returnDoc('r1', 'Approved')]);
    s.set(Refund, 'exists', async () => ({ _id: 'open' }));
    await assert.rejects(refundService.startRefund(deliveredOrder(['r1'])), /already been initiated/);
});

test('completing a refund completes its return; repeating it changes nothing', async () => {
    const ret = returnDoc('r1', 'Initiated');
    const effects = refundSetup([ret]);
    const order = deliveredOrder(['r1']);
    const refund = { _id: 'f1', status: 'Initiated', save: async () => {} };

    const first = await refundService.moveRefund({ order, refund, to: 'Refunded' });
    assert.equal(first.changed, true);
    assert.equal(ret.status, 'Completed');
    assert.equal(order.isRefunded, true);
    assert.equal(order.refundStatus, 'Refunded');
    assert.equal(effects.creditNotes, 1);

    const again = await refundService.moveRefund({ order, refund, to: 'Refunded' });
    assert.equal(again.changed, false);
    assert.equal(effects.creditNotes, 1);
    assert.equal(effects.invoiceMarked, 1);

    await assert.rejects(refundService.moveRefund({ order, refund, to: 'Rejected' }), /already been refunded/);
});

test('a rejected refund sends its return back to approved, ready for another refund', async () => {
    const ret = returnDoc('r1', 'Initiated');
    const effects = refundSetup([ret]);
    const order = deliveredOrder(['r1']);
    const refund = { _id: 'f1', status: 'Pending', save: async () => {} };

    await refundService.moveRefund({ order, refund, to: 'Rejected' });
    assert.equal(refund.status, 'Rejected');
    assert.equal(ret.status, 'Approved');
    assert.equal(ret.resolvedAt, undefined);
    assert.equal(order.refundStatus, 'Rejected');
    assert.equal(effects.creditNotes, 0);

    // Rejected is final for this refund.
    await assert.rejects(refundService.moveRefund({ order, refund, to: 'Refunded' }), err => err.code === 'TERMINAL');
});
