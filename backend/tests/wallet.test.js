const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Wallet = require('../models/wallet');
const WalletEntry = require('../models/walletEntry');
const StockHold = require('../models/stockHold');
const Order = require('../models/order');
const Refund = require('../models/refund');
const Product = require('../models/product');
const Coupon = require('../models/coupon');
const User = require('../models/user');
const cache = require('../utils/cache');
const wallet = require('../services/walletService');
const inventory = require('../services/inventoryService');
const invoiceService = require('../services/invoiceService');

const s = stubs();
afterEach(() => s.restore());

// In-memory ledger + balances with Mongo-like semantics (unique keys,
// conditional $inc).
function memoryWallet(initial = {}) {
    const balances = { ...initial };
    const entries = [];
    s.set(Wallet, 'findById', id => ({ lean: async () => (id in balances ? { _id: id, balance: balances[id] } : null) }));
    s.set(Wallet, 'updateOne', async (filter, update) => {
        const id = filter._id;
        if (filter.balance?.$gte !== undefined && !((balances[id] || 0) >= filter.balance.$gte)) return { modifiedCount: 0 };
        if (update.$inc) balances[id] = (balances[id] || 0) + update.$inc.balance;
        if (update.$set?.balance !== undefined) balances[id] = update.$set.balance;
        return { modifiedCount: 1 };
    });
    s.set(WalletEntry, 'create', async doc => {
        if (entries.some(e => e.idempotencyKey === doc.idempotencyKey)) {
            throw Object.assign(new Error('dup'), { code: 11000 });
        }
        entries.push(doc);
        return doc;
    });
    s.set(WalletEntry, 'findOne', filter => ({
        lean: async () => entries.find(e => e.idempotencyKey === filter.idempotencyKey) || null,
    }));
    return { balances, entries };
}

// ---- ledger -----------------------------------------------------------------

test('credit is idempotent on its key', async () => {
    const { balances, entries } = memoryWallet();
    const first = await wallet.credit('u1', 50000, { type: 'refund', idempotencyKey: 'refund:r1' });
    const again = await wallet.credit('u1', 50000, { type: 'refund', idempotencyKey: 'refund:r1' });
    assert.equal(first.applied, true);
    assert.equal(again.applied, false);
    assert.equal(balances.u1, 50000);
    assert.equal(entries.length, 1);
});

test('debit never takes the balance below zero', async () => {
    const { balances } = memoryWallet({ u1: 30000 });
    await assert.rejects(
        wallet.debit('u1', 30001, { type: 'checkout', idempotencyKey: 'checkout:a' }),
        error => error instanceof wallet.WalletError && /₹300/.test(error.message)
    );
    assert.equal(balances.u1, 30000);
});

test('two concurrent spends of the same credit: only one succeeds', async () => {
    const { balances } = memoryWallet({ u1: 50000 });
    const results = await Promise.allSettled([
        wallet.debit('u1', 40000, { type: 'checkout', idempotencyKey: 'checkout:a' }),
        wallet.debit('u1', 40000, { type: 'checkout', idempotencyKey: 'checkout:b' }),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(balances.u1, 10000);
});

test('a retried debit with the same key does not charge twice', async () => {
    const { balances } = memoryWallet({ u1: 50000 });
    await wallet.debit('u1', 20000, { type: 'checkout', idempotencyKey: 'checkout:a' });
    const again = await wallet.debit('u1', 20000, { type: 'checkout', idempotencyKey: 'checkout:a' });
    assert.equal(again.applied, false);
    assert.equal(balances.u1, 30000);
});

test('statement shows a running balance, newest first', async () => {
    s.set(Wallet, 'findById', () => ({ lean: async () => ({ balance: 70000 }) }));
    s.set(WalletEntry, 'find', () => ({ sort: () => ({ limit: () => ({ lean: async () => [
        { _id: 'e2', amount: -30000, type: 'checkout', createdAt: new Date(2) },
        { _id: 'e1', amount: 100000, type: 'refund', createdAt: new Date(1) },
    ] }) }) }));
    const st = await wallet.statement('u1');
    assert.equal(st.balance, 700);
    assert.deepEqual(st.entries.map(e => [e.amount, e.balanceAfter]), [[-300, 700], [1000, 1000]]);
});

// ---- checkout ------------------------------------------------------------------

test('releasing a checkout hold gives the store credit back', async () => {
    const { balances } = memoryWallet({ u1: 0 });
    s.set(StockHold, 'findOneAndUpdate', async () => ({
        user: 'u1', cashfreeOrderId: 'order_u1_a', walletApplied: 250, items: [{ product: 'lamp', quantity: 1 }],
    }));
    s.set(Product, 'bulkWrite', async () => {});
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'afterStockIncrease', () => {});

    await inventory.releaseHoldForPayment('order_u1_a', 'expired');
    await inventory.releaseHoldForPayment('order_u1_a', 'expired'); // retried: no double credit
    assert.equal(balances.u1, 25000);
});

test('checkout fully covered by store credit skips the payment gateway', async () => {
    const { balances } = memoryWallet({ u1: 200000 });
    s.set(Product, 'find', async () => [{ _id: 'lamp', name: 'Lamp', price: 1500, Stock: 3, images: [] }]);
    s.set(Coupon, 'findOne', async () => null);
    const none = Object.assign(Promise.resolve([]), { limit: async () => [] });
    s.set(StockHold, 'find', () => ({ select: () => none }));
    s.set(StockHold, 'create', async doc => doc);
    let holdWallet;
    s.set(StockHold, 'updateOne', async (filter, update) => { holdWallet = update.walletApplied; return {}; });
    s.set(Product, 'updateOne', async () => ({ modifiedCount: 1 }));
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'checkLowStock', async () => []);

    delete require.cache[require.resolve('../controllers/payment')];
    const { createCashfreeOrder } = require('../controllers/payment');
    const res = mockRes();
    await createCashfreeOrder({
        user: { _id: 'u1', name: 'U', email: 'u@x.com' },
        body: { orderItems: [{ product: 'lamp', quantity: 1 }], useStoreCredit: true },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.walletOnly, true);
    assert.equal(res.body.storeCreditApplied, 1500);
    assert.equal(holdWallet, 1500);
    assert.equal(balances.u1, 50000);
});

const { newOrder } = require('../controllers/order');

const placeWalletOrder = async (hold, total = 1500) => {
    s.set(Product, 'find', async () => [{ _id: 'lamp', name: 'Lamp', price: total, Stock: 0, images: [] }]);
    s.set(Coupon, 'findOne', async () => null);
    s.set(User, 'findById', async () => ({ _id: 'u1', email: 'u@x.com', name: 'U', isDemo: false }));
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'getHold', async () => hold);
    s.set(inventory, 'commitForOrder', async () => ({ committed: true, shortfall: false, source: 'hold' }));
    s.set(Order, 'findOne', () => ({ select: async () => null }));
    let created;
    s.set(Order, 'create', async doc => { created = doc; return doc; });
    s.set(invoiceService, 'sendOrderConfirmationWithInvoice', () => {});
    const res = mockRes();
    await newOrder({
        user: { _id: 'u1' },
        body: {
            shippingInfo: { address: 'a', city: 'c', state: 's', country: 'IN', pinCode: 600001, phoneNumber: 9999999999 },
            orderItems: [{ product: 'lamp', quantity: 1 }],
            paymentInfo: { provider: 'wallet', id: 'order_u1_a' },
        },
    }, res);
    return { res, created };
};

test('a store-credit-only order is created when the credit covers the total', async () => {
    const { res, created } = await placeWalletOrder({ user: 'u1', walletApplied: 1500, status: 'active' });
    assert.equal(res.statusCode, 200);
    assert.equal(created.paymentInfo.provider, 'wallet');
    assert.equal(created.paymentInfo.id, 'wallet_order_u1_a');
    assert.equal(created.storeCreditApplied, 1500);
});

test('a store-credit-only order is refused if the credit does not cover it', async () => {
    const { res, created } = await placeWalletOrder({ user: 'u1', walletApplied: 900, status: 'active' });
    assert.equal(res.statusCode, 409);
    assert.equal(created, undefined);
});

test('someone else\'s checkout cannot be used', async () => {
    const { res } = await placeWalletOrder({ user: 'intruder', walletApplied: 1500, status: 'active' });
    assert.equal(res.statusCode, 403);
});

// ---- refunds -------------------------------------------------------------------

const { updateRefundStatus } = require('../controllers/refund');

const refundTo = async (method, orderOverrides = {}) => {
    const { balances } = memoryWallet();
    const order = {
        _id: 'o1', user: 'u1', orderStatus: 'Delivered', isRefunded: false, stockRestoredAt: null,
        stockCommittedAt: new Date(), orderItems: [], storeCreditApplied: 0, save: async () => {},
        ...orderOverrides,
    };
    const refund = { _id: 'r1', order: 'o1', amount: 2000, status: 'Approved', save: async () => {} };
    s.set(Order, 'findById', async () => order);
    s.set(Refund, 'findById', async () => refund);
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'restoreStock', async () => {});
    s.set(invoiceService, 'setOrderInvoiceStatus', async () => true);
    const notes = [];
    s.set(invoiceService, 'issueCreditNoteInBackground', (o, r, opts) => notes.push(opts));
    const res = mockRes();
    await updateRefundStatus({
        params: { refundId: 'r1', orderId: 'o1' },
        body: { refundStatus: 'Refunded', refundMethod: method },
        user: { _id: 'admin', name: 'Admin' },
    }, res);
    return { res, balances, refund, notes };
};

test('refund to store credit credits the full amount, once', async () => {
    const { res, balances, refund, notes } = await refundTo('store-credit');
    assert.equal(res.statusCode, 200);
    assert.equal(balances.u1, 200000);
    assert.equal(refund.method, 'store-credit');
    assert.deepEqual(notes, [{ refundMethod: 'store-credit' }]);
});

test('refund to the original method still returns any store credit used', async () => {
    const { balances, refund } = await refundTo('original', { storeCreditApplied: 500 });
    assert.equal(balances.u1, 50000);
    assert.equal(refund.storeCreditAmount, 500);
});

test('an invalid refund method is rejected', async () => {
    const { res } = await refundTo('bitcoin');
    assert.equal(res.statusCode, 400);
});
