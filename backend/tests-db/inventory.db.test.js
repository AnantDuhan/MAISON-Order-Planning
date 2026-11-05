const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, stopDb, clearDb, orderDoc, productDoc } = require('./setup');
const { stubs } = require('../tests/helpers');

const Order = require('../models/order');
const Product = require('../models/product');
const Return = require('../models/return');
const Refund = require('../models/refund');
const StockAlert = require('../models/stockAlert');
const inventory = require('../services/inventoryService');
const invoiceService = require('../services/invoiceService');
const refundService = require('../services/refundService');
const { upgradeStockAlertIndexes } = require('../config/database');

const s = stubs();
before(startDb);
after(stopDb);
beforeEach(async () => {
    await clearDb();
    // Side effects that leave the database (emails, feature flags over HTTP).
    s.set(inventory, 'afterStockIncrease', () => {});
    s.set(inventory, 'checkLowStock', async () => {});
    s.set(invoiceService, 'setOrderInvoiceStatus', async () => true);
    s.set(invoiceService, 'issueCreditNoteInBackground', () => {});
});
afterEach(() => s.restore());

const colourProduct = (stock = { black: 0, sand: 3 }) => productDoc({
    name: 'Studio Headphones',
    Stock: stock.black + stock.sand,
    options: [{ name: 'Colour', kind: 'color', values: [{ value: 'Black' }, { value: 'Sand' }] }],
    variants: [
        { _id: 'black', options: { Colour: 'Black' }, Stock: stock.black },
        { _id: 'sand', options: { Colour: 'Sand' }, Stock: stock.sand },
    ],
});

// ---- Stock -----------------------------------------------------------------------------

test('two shoppers racing for the last unit: exactly one gets it', async () => {
    const product = await Product.create(productDoc({ Stock: 1 }));
    const results = await Promise.allSettled([
        inventory.takeStock([{ product: product._id, quantity: 1 }]),
        inventory.takeStock([{ product: product._id, quantity: 1 }]),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.match(results.find(r => r.status === 'rejected').reason.message, /Only 0 left/);
    assert.equal((await Product.findById(product._id).lean()).Stock, 0);
});

test('taking a variant moves the variant and the product total together, or neither', async () => {
    const product = await Product.create(colourProduct({ black: 1, sand: 3 }));
    await inventory.takeStock([{ product: product._id, variant: 'sand', quantity: 2 }]);
    let saved = await Product.findById(product._id).lean();
    assert.equal(saved.Stock, 2);
    assert.equal(saved.variants.find(v => v._id === 'sand').Stock, 1);

    // Black has 1: asking for 2 fails and changes nothing, even with Sand in the same basket.
    await assert.rejects(inventory.takeStock([
        { product: product._id, variant: 'sand', quantity: 1 },
        { product: product._id, variant: 'black', quantity: 2 },
    ]), /Only 1 left/);
    saved = await Product.findById(product._id).lean();
    assert.equal(saved.Stock, 2);
    assert.equal(saved.variants.find(v => v._id === 'sand').Stock, 1);
    assert.equal(saved.variants.find(v => v._id === 'black').Stock, 1);
});

// ---- Back-in-stock requests -------------------------------------------------------------

test('one pending request per email and variant; a sold-out colour can be waited for while another has stock', async () => {
    const product = await Product.create(colourProduct());
    const ask = (variantId, who) => inventory.requestBackInStock({ productId: product._id, variantId, ...who });

    assert.equal((await ask('black', { email: 'G@x.com' })).status, 'subscribed');
    assert.equal((await ask('black', { email: 'g@x.com' })).status, 'subscribed');
    assert.equal(await StockAlert.countDocuments(), 1);
    assert.equal((await ask('sand', { email: 'g@x.com' })).status, 'in-stock');

    // Signing in with that email takes the guest request over.
    await ask('black', { user: { _id: 'u1', email: 'g@x.com' } });
    assert.equal(await StockAlert.countDocuments(), 1);
    assert.equal((await StockAlert.findOne().lean()).user, 'u1');

    // Once emailed, the same person can ask again for the next restock.
    await StockAlert.updateMany({}, { notifiedAt: new Date() });
    await ask('black', { email: 'g@x.com' });
    assert.equal(await StockAlert.countDocuments({ notifiedAt: null }), 1);
    assert.equal(await StockAlert.countDocuments(), 2);
});

test('the startup upgrade drops the old per-user index that blocked guests', async () => {
    await StockAlert.collection.dropIndexes();
    await StockAlert.collection.createIndex(
        { product: 1, user: 1 },
        { unique: true, name: 'product_1_user_1', partialFilterExpression: { notifiedAt: null } }
    );
    await StockAlert.collection.insertOne({ _id: 'a1', product: 'p1', variant: null, user: null, email: 'one@x.com', notifiedAt: null });
    // With the old index a second guest (user null) for the same product collides.
    await assert.rejects(
        StockAlert.collection.insertOne({ _id: 'a2', product: 'p1', variant: null, user: null, email: 'two@x.com', notifiedAt: null }),
        err => err.code === 11000
    );

    await upgradeStockAlertIndexes();
    const names = (await StockAlert.collection.indexes()).map(i => i.name);
    assert.ok(!names.includes('product_1_user_1'));
    assert.ok(names.includes('pending_per_email_variant'));
    await StockAlert.collection.insertOne({ _id: 'a2', product: 'p1', variant: null, user: null, email: 'two@x.com', notifiedAt: null });
});

// ---- Refunds ------------------------------------------------------------------------------

const deliveredOrderWithReturn = async ({ product, variant = null, quantity = 2 }) => {
    const order = await Order.create(orderDoc({
        orderStatus: 'Delivered',
        DeliveredAt: new Date(),
        stockCommittedAt: new Date(),
        totalPrice: 800,
        orderItems: [{ name: product.name, price: 400, quantity, images: [{ url: 'https://img/x.jpg' }], product: product._id, ...(variant && { variant }) }],
    }));
    const ret = await Return.create({
        _id: `r-${order._id}`, order: order._id, reason: 'Too small',
        products: [{ _id: `rp-${order._id}`, product: product._id, quantity }],
    });
    order.return = [ret._id];
    await order.save();
    return { order, ret };
};

test('a refund runs start to finish against the database, once', async () => {
    const product = await Product.create(productDoc({ Stock: 5 }));
    const { order, ret } = await deliveredOrderWithReturn({ product });

    const refund = await refundService.startRefund(await Order.findById(order._id));
    assert.equal((await Return.findById(ret._id).lean()).status, 'Initiated');
    assert.equal((await Order.findById(order._id).lean()).refundStatus, 'Processing');
    // The open refund in the database blocks a second one.
    await assert.rejects(refundService.startRefund(await Order.findById(order._id)), /already been initiated/);

    await refundService.moveRefund({ order: await Order.findById(order._id), refund: await Refund.findById(refund._id), to: 'Refunded' });
    assert.equal((await Product.findById(product._id).lean()).Stock, 7);
    assert.equal((await Return.findById(ret._id).lean()).status, 'Completed');
    const savedOrder = await Order.findById(order._id).lean();
    assert.equal(savedOrder.isRefunded, true);
    assert.ok(savedOrder.stockRestoredAt);
    const savedRefund = await Refund.findById(refund._id).lean();
    assert.equal(savedRefund.status, 'Refunded');
    assert.ok(savedRefund.completedAt);

    // Asking again changes nothing: stock is not restored twice.
    await refundService.moveRefund({ order: await Order.findById(order._id), refund: await Refund.findById(refund._id), to: 'Refunded' });
    assert.equal((await Product.findById(product._id).lean()).Stock, 7);
});

test('refunding a variant puts stock back on that variant and the product total', async () => {
    const product = await Product.create(colourProduct({ black: 0, sand: 3 }));
    const { order } = await deliveredOrderWithReturn({ product, variant: 'black', quantity: 1 });
    const refund = await refundService.startRefund(await Order.findById(order._id));
    await refundService.moveRefund({ order: await Order.findById(order._id), refund: await Refund.findById(refund._id), to: 'Refunded' });

    const saved = await Product.findById(product._id).lean();
    assert.equal(saved.Stock, 4);
    assert.equal(saved.variants.find(v => v._id === 'black').Stock, 1);
    assert.equal(saved.variants.find(v => v._id === 'sand').Stock, 3);
});

test('a rejected refund frees the return for a new refund', async () => {
    const product = await Product.create(productDoc({ Stock: 5 }));
    const { order, ret } = await deliveredOrderWithReturn({ product });
    const first = await refundService.startRefund(await Order.findById(order._id));
    await refundService.moveRefund({ order: await Order.findById(order._id), refund: await Refund.findById(first._id), to: 'Rejected' });
    assert.equal((await Return.findById(ret._id).lean()).status, 'Approved');

    const second = await refundService.startRefund(await Order.findById(order._id));
    assert.notEqual(second._id, first._id);
    assert.deepEqual((await Order.findById(order._id).lean()).refund, [first._id, second._id]);
    assert.equal((await Product.findById(product._id).lean()).Stock, 5);
});
