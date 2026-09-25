const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const Refund = require('../models/refund');
const Product = require('../models/product');
const cache = require('../utils/cache');
const { updateRefundStatus } = require('../controllers/refund');

const s = stubs();
afterEach(() => s.restore());

function setup(orderOverrides = {}) {
    const order = {
        _id: 'o1',
        user: 'u1',
        orderStatus: 'Delivered',
        isRefunded: false,
        stockRestoredAt: null,
        orderItems: [
            { product: 'lamp', quantity: 2 },
            { product: 'rug', quantity: 1 },
        ],
        save: async () => {},
        ...orderOverrides,
    };
    const refund = { _id: 'r1', order: 'o1', status: 'Initiated', save: async () => {} };
    const bulkWrites = [];

    s.set(Order, 'findById', async () => order);
    s.set(Refund, 'findById', async () => refund);
    s.set(Product, 'bulkWrite', async ops => { bulkWrites.push(ops); });
    s.set(cache, 'del', async () => {});

    const call = async status => {
        const res = mockRes();
        await updateRefundStatus(
            { params: { refundId: 'r1', orderId: 'o1' }, body: { refundStatus: status } },
            res
        );
        return res;
    };
    return { order, bulkWrites, call };
}

test('a completed refund puts every item back into stock', async () => {
    const { order, bulkWrites, call } = setup();
    const res = await call('Refunded');
    assert.equal(res.statusCode, 200);
    assert.equal(bulkWrites.length, 1);
    assert.deepEqual(
        bulkWrites[0].map(op => [op.updateOne.filter._id, op.updateOne.update.$inc.Stock]),
        [['lamp', 2], ['rug', 1]]
    );
    assert.ok(order.stockRestoredAt instanceof Date);
});

test('stock is restored only once', async () => {
    const { bulkWrites, call } = setup();
    await call('Refunded');
    await call('Refunded');
    assert.equal(bulkWrites.length, 1);
});

test('no restock if stock was never taken out (order not shipped)', async () => {
    const { bulkWrites, call } = setup({ orderStatus: 'Processing' });
    await call('Refunded');
    assert.equal(bulkWrites.length, 0);
});

test('a completed refund cannot be moved back to another status', async () => {
    const { call } = setup({ isRefunded: true, stockRestoredAt: new Date() });
    const res = await call('Rejected');
    assert.equal(res.statusCode, 409);
});
