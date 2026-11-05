const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startDb, stopDb, clearDb, orderDoc, productDoc, DAY } = require('./setup');

const Order = require('../models/order');
const Product = require('../models/product');
const insights = require('../services/insights');

before(startDb);
after(stopDb);
beforeEach(clearDb);

const NOW = new Date('2026-11-05T06:30:00Z');
const ago = days => new Date(NOW.getTime() - days * DAY);
const line = (product, quantity, price, variant) => ({
    name: product.name, price, quantity, product: product._id, images: [{ url: 'https://img/x.webp' }], ...(variant && { variant }),
});

test('the sales pipeline: coupon share, refunds and demo orders, inside the window only', async () => {
    const vase = await Product.create(productDoc({ name: 'Vase', price: 1000, costPrice: 400, Stock: 50 }));
    // 2 × 1000 with a ₹200 coupon on ₹2000 of items: kept 90% → revenue 1800.
    await Order.create(orderDoc({ createdAt: ago(3), itemsPrice: 2000, discountedAmount: 200, orderItems: [line(vase, 2, 1000)] }));
    // Refunded: counts as a refunded unit, not revenue.
    await Order.create(orderDoc({ createdAt: ago(4), itemsPrice: 1000, isRefunded: true, orderItems: [line(vase, 1, 1000)] }));
    // Demo and too old: left out.
    await Order.create(orderDoc({ createdAt: ago(5), itemsPrice: 1000, isDemo: true, orderItems: [line(vase, 1, 1000)] }));
    await Order.create(orderDoc({ createdAt: ago(60), itemsPrice: 1000, orderItems: [line(vase, 1, 1000)] }));

    const report = await insights.profitability({ days: 30, now: NOW });
    assert.equal(report.products.length, 1);
    const row = report.products[0];
    assert.equal(row.units, 2);
    assert.equal(row.refundedUnits, 1);
    assert.equal(row.revenue, 1800);
    assert.equal(row.cost, 800);
    assert.equal(row.margin, 1000);
});

test('running out is worked out per variant from real stock', async () => {
    const tee = await Product.create(productDoc({
        name: 'Tee', price: 900, Stock: 12,
        options: [{ name: 'Colour', kind: 'color', values: [{ value: 'Black' }, { value: 'Sand' }] }],
        variants: [
            { _id: 'black', options: { Colour: 'Black' }, Stock: 2 },
            { _id: 'sand', options: { Colour: 'Sand' }, Stock: 10 },
        ],
    }));
    // Black: 15 sold in 30 days (0.5/day), 2 left → 4 days. Sand: 1 sold, 10 left → 300 days.
    await Order.create(orderDoc({ createdAt: ago(10), itemsPrice: 13500, orderItems: [line(tee, 15, 900, 'black')] }));
    await Order.create(orderDoc({ createdAt: ago(2), itemsPrice: 900, orderItems: [line(tee, 1, 900, 'sand')] }));

    const rows = await insights.runningOut({ now: NOW });
    assert.deepEqual(rows.map(r => [r.variant, r.label, r.daysLeft, r.soldLast30Days]), [['black', 'Colour: Black', 4, 15]]);
});
