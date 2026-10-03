const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Product = require('../models/product');
const StockHold = require('../models/stockHold');
const StockAlert = require('../models/stockAlert');
const cache = require('../utils/cache');
const cashfree = require('../utils/cashfree');
const inventory = require('../services/inventoryService');

const s = stubs();
afterEach(() => s.restore());

const lean = value => ({ select: () => ({ lean: async () => value }), lean: async () => value });

// In-memory product stock with Mongo-like conditional decrements.
function catalogue(stock) {
    const state = { ...stock };
    const restocked = [];
    s.set(Product, 'updateOne', async (filter, update) => {
        const id = filter._id;
        const delta = update.$inc?.Stock;
        if (delta === undefined) return { modifiedCount: 1 };
        if (filter.Stock?.$gte !== undefined && !(state[id] >= filter.Stock.$gte)) {
            return { modifiedCount: 0 };
        }
        state[id] += delta;
        return { modifiedCount: 1 };
    });
    s.set(Product, 'bulkWrite', async ops => {
        for (const op of ops) {
            state[op.updateOne.filter._id] += op.updateOne.update.$inc.Stock;
            restocked.push([op.updateOne.filter._id, op.updateOne.update.$inc.Stock]);
        }
    });
    s.set(Product, 'findById', id => lean(id in state ? { _id: id, name: id, Stock: state[id] } : null));
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'checkLowStock', async () => []);
    s.set(inventory, 'afterStockIncrease', () => {});
    return { state, restocked };
}

// ---- takeStock -------------------------------------------------------------------

test('takeStock takes every item when all are available', async () => {
    const { state } = catalogue({ lamp: 3, rug: 1 });
    await inventory.takeStock([{ product: 'lamp', quantity: 2 }, { product: 'rug', quantity: 1 }]);
    assert.deepEqual(state, { lamp: 1, rug: 0 });
});

test('takeStock merges duplicate lines before checking', async () => {
    const { state } = catalogue({ lamp: 3 });
    await assert.rejects(
        inventory.takeStock([{ product: 'lamp', quantity: 2 }, { product: 'lamp', quantity: 2 }]),
        /Only 3 left/
    );
    assert.deepEqual(state, { lamp: 3 });
});

test('takeStock is all-or-nothing: a short item rolls back the others', async () => {
    const { state } = catalogue({ lamp: 3, rug: 0 });
    await assert.rejects(
        inventory.takeStock([{ product: 'lamp', quantity: 2 }, { product: 'rug', quantity: 1 }]),
        error => error instanceof inventory.StockError && error.statusCode === 409
    );
    assert.deepEqual(state, { lamp: 3, rug: 0 });
});

test('two checkouts racing for the last unit: exactly one wins', async () => {
    const { state } = catalogue({ lamp: 1 });
    const results = await Promise.allSettled([
        inventory.takeStock([{ product: 'lamp', quantity: 1 }]),
        inventory.takeStock([{ product: 'lamp', quantity: 1 }]),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(state.lamp, 0);
});

// ---- holds -----------------------------------------------------------------------

test('reserveForCheckout holds stock and records the hold', async () => {
    const { state } = catalogue({ lamp: 2 });
    s.set(StockHold, 'find', () => ({ select: async () => [] }));
    let created;
    s.set(StockHold, 'create', async doc => { created = doc; return doc; });

    await inventory.reserveForCheckout({
        userId: 'u1', cashfreeOrderId: 'order_u1_a', items: [{ product: 'lamp', quantity: 2 }],
    });
    assert.equal(state.lamp, 0);
    assert.equal(created.cashfreeOrderId, 'order_u1_a');
    assert.ok(created.expiresAt > new Date());
});

test('a hold is released exactly once even if two releases race', async () => {
    const { state } = catalogue({ lamp: 0 });
    let flips = 0;
    s.set(StockHold, 'findOneAndUpdate', async () => {
        flips += 1;
        return flips === 1 ? { items: [{ product: 'lamp', quantity: 1 }] } : null;
    });
    await Promise.all([
        inventory.releaseHoldForPayment('order_u1_a', 'test'),
        inventory.releaseHoldForPayment('order_u1_a', 'test'),
    ]);
    assert.equal(state.lamp, 1);
});

test('commitForOrder consumes the live hold without touching stock again', async () => {
    const { state } = catalogue({ lamp: 0 });
    s.set(StockHold, 'findOneAndUpdate', async () => ({ status: 'consumed' }));
    const result = await inventory.commitForOrder({
        cashfreeOrderId: 'order_u1_a', orderId: 'o1', items: [{ product: 'lamp', quantity: 1 }],
    });
    assert.deepEqual([result.committed, result.shortfall, result.source], [true, false, 'hold']);
    assert.equal(state.lamp, 0);
});

test('commitForOrder does not double-take when a concurrent request consumed the hold', async () => {
    const { state } = catalogue({ lamp: 5 });
    s.set(StockHold, 'findOneAndUpdate', async () => null);
    s.set(StockHold, 'findOne', () => lean({ status: 'consumed' }));
    const result = await inventory.commitForOrder({
        cashfreeOrderId: 'order_u1_a', orderId: 'o1', items: [{ product: 'lamp', quantity: 1 }],
    });
    assert.equal(result.source, 'already-consumed');
    assert.equal(state.lamp, 5);
});

test('commitForOrder takes stock late if the hold expired but stock remains', async () => {
    const { state } = catalogue({ lamp: 2 });
    s.set(StockHold, 'findOneAndUpdate', async () => null);
    s.set(StockHold, 'findOne', () => lean({ status: 'released' }));
    s.set(StockHold, 'updateOne', async () => ({}));
    const result = await inventory.commitForOrder({
        cashfreeOrderId: 'order_u1_a', orderId: 'o1', items: [{ product: 'lamp', quantity: 1 }],
    });
    assert.deepEqual([result.committed, result.shortfall], [true, false]);
    assert.equal(state.lamp, 1);
});

test('commitForOrder reports a shortfall when the stock is gone', async () => {
    const { state } = catalogue({ lamp: 0 });
    s.set(StockHold, 'findOneAndUpdate', async () => null);
    s.set(StockHold, 'findOne', () => lean({ status: 'released' }));
    const result = await inventory.commitForOrder({
        cashfreeOrderId: 'order_u1_a', orderId: 'o1', items: [{ product: 'lamp', quantity: 1 }],
    });
    assert.deepEqual([result.committed, result.shortfall], [false, true]);
    assert.equal(state.lamp, 0);
});

// ---- checkout endpoint ----------------------------------------------------------

test('checkout releases the hold if Cashfree cannot create the payment session', async () => {
    const { state } = catalogue({ lamp: 1 });
    s.set(Product, 'find', async () => [{ _id: 'lamp', name: 'Lamp', price: 2000, Stock: state.lamp, images: [] }]);
    // find().select() is awaited directly (user holds) or .limit()ed (expired).
    const none = Object.assign(Promise.resolve([]), { limit: async () => [] });
    s.set(StockHold, 'find', () => ({ select: () => none }));
    s.set(StockHold, 'create', async doc => doc);
    let released = 0;
    s.set(StockHold, 'findOneAndUpdate', async () => {
        released += 1;
        return { items: [{ product: 'lamp', quantity: 1 }] };
    });
    s.set(cashfree, 'cashfreeRequest', async () => { throw Object.assign(new Error('gateway down'), { statusCode: 502 }); });

    // Re-require with the stubbed cashfreeRequest in place.
    delete require.cache[require.resolve('../controllers/payment')];
    const { createCashfreeOrder } = require('../controllers/payment');

    const res = mockRes();
    await createCashfreeOrder({
        user: { _id: 'u1', name: 'U', email: 'u@example.com' },
        body: { orderItems: [{ product: 'lamp', quantity: 1 }] },
    }, res);

    assert.equal(res.statusCode, 502);
    assert.equal(released, 1);
    assert.equal(state.lamp, 1);
});

// ---- back-in-stock -------------------------------------------------------------

test('back-in-stock: subscribe only while out of stock, duplicates are fine', async () => {
    s.set(Product, 'findById', () => lean({ _id: 'lamp', Stock: 0 }));
    let creates = 0;
    s.set(StockAlert, 'create', async () => {
        creates += 1;
        if (creates > 1) throw Object.assign(new Error('dup'), { code: 11000 });
    });
    const user = { _id: 'u1', email: 'u@example.com' };
    assert.equal((await inventory.requestBackInStock({ productId: 'lamp', user })).status, 'subscribed');
    assert.equal((await inventory.requestBackInStock({ productId: 'lamp', user })).status, 'subscribed');

    s.set(Product, 'findById', () => lean({ _id: 'lamp', Stock: 4 }));
    assert.equal((await inventory.requestBackInStock({ productId: 'lamp', user })).status, 'in-stock');
});

test('back-in-stock: each waiting customer is emailed once', async t => {
    s.set(Product, 'find', () => lean([{ _id: 'lamp', name: 'Lamp', price: 10, images: [], Stock: 3 }]));
    const alerts = [{ _id: 'a1', email: 'a@x.com' }, { _id: 'a2', email: 'b@x.com' }];
    s.set(StockAlert, 'find', () => ({ limit: async () => alerts }));
    const claimed = new Set();
    s.set(StockAlert, 'updateOne', async filter => {
        if (claimed.has(filter._id)) return { modifiedCount: 0 };
        claimed.add(filter._id);
        return { modifiedCount: 1 };
    });
    process.env.RESEND_API_KEY = 'k';
    process.env.EMAIL_FROM_NOREPLY = 'n@x.com';
    process.env.EMAIL_FROM_SUPPORT = 's@x.com';
    const sentTo = [];
    t.mock.method(global, 'fetch', async (url, init) => {
        sentTo.push(JSON.parse(init.body).to[0]);
        return { ok: true, json: async () => ({ id: 'e' }) };
    });

    const [first, second] = await Promise.all([
        inventory.notifyBackInStock(['lamp']),
        inventory.notifyBackInStock(['lamp']),
    ]);
    assert.equal(first + second, 2);
    assert.deepEqual(sentTo.sort(), ['a@x.com', 'b@x.com']);
});
