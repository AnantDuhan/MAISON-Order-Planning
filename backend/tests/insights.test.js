const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const Order = require('../models/order');
const Product = require('../models/product');
const insights = require('../services/insights');
const { publicProduct } = require('../controllers/product');
const { buildVariantFields } = require('../utils/productVariants');

const s = stubs();
afterEach(() => s.restore());

const lean = value => ({ select() { return this; }, lean: async () => value });

const tee = {
    _id: 'tee', name: 'Linen Tee', Stock: 13, costPrice: 400,
    options: [{ name: 'Colour', kind: 'color', values: [{ value: 'Black' }, { value: 'Sand' }] }],
    variants: [
        { _id: 'black', options: { Colour: 'Black' }, Stock: 3, costPrice: 450 },
        { _id: 'sand', options: { Colour: 'Sand' }, Stock: 10, costPrice: null },
    ],
};
const lamp = { _id: 'lamp', name: 'Lamp', Stock: 40, costPrice: null, options: [], variants: [] };

test('running out: days of stock left at the last 30 days\' pace, soonest first', async () => {
    s.set(Order, 'aggregate', async () => [
        { _id: { product: 'tee', variant: 'black' }, units: 30, revenue: 0, refundedUnits: 0 },  // 1/day, 3 left → 3 days
        { _id: { product: 'tee', variant: 'sand' }, units: 6, revenue: 0, refundedUnits: 0 },    // 0.2/day, 10 left → 50 days
        { _id: { product: 'lamp', variant: null }, units: 45, revenue: 0, refundedUnits: 0 },    // 1.5/day, 40 left → 26 days
        { _id: { product: 'gone', variant: null }, units: 5, revenue: 0, refundedUnits: 0 },     // deleted product
    ]);
    s.set(Product, 'find', () => lean([tee, lamp]));

    const rows = await insights.runningOut();
    assert.deepEqual(rows.map(r => [r.product, r.label, r.daysLeft]), [['tee', 'Colour: Black', 3]]);
});

test('profitability: revenue after coupons, refunds left out, variant cost before product cost', async () => {
    s.set(Order, 'aggregate', async () => [
        { _id: { product: 'tee', variant: 'black' }, name: 'Linen Tee', units: 2, revenue: 1800, refundedUnits: 1 },
        { _id: { product: 'tee', variant: 'sand' }, name: 'Linen Tee', units: 1, revenue: 900, refundedUnits: 0 },
        { _id: { product: 'lamp', variant: null }, name: 'Lamp', units: 4, revenue: 2000, refundedUnits: 0 },
    ]);
    s.set(Product, 'find', () => lean([tee, lamp]));

    const report = await insights.profitability({ days: 30 });
    const teeRow = report.products.find(r => r.product === 'tee');
    // Black: 2 × 450 (variant cost); Sand: 1 × 400 (falls back to the product's).
    assert.equal(teeRow.cost, 1300);
    assert.equal(teeRow.revenue, 2700);
    assert.equal(teeRow.margin, 1400);
    assert.equal(teeRow.marginRate, 0.52);
    assert.equal(teeRow.refundRate, 0.25);

    const lampRow = report.products.find(r => r.product === 'lamp');
    assert.equal(lampRow.margin, null);
    assert.deepEqual(report.missingCost, [{ product: 'lamp', name: 'Lamp' }]);

    // Totals: margin only over products with a cost, against their revenue.
    assert.deepEqual(report.totals, { revenue: 4700, margin: 1400, revenueWithCost: 2700, marginRate: 0.52 });
    assert.equal(report.products[0].product, 'tee'); // highest revenue first (2700 vs 2000)
});

test('shoppers never see cost prices, of the product or of any variant', () => {
    const shown = publicProduct(tee);
    assert.equal('costPrice' in shown, false);
    assert.ok(shown.variants.every(v => !('costPrice' in v)));
    assert.equal(shown.variants[0].Stock, 3);
});

test('saving variants without cost prices keeps the saved ones; "" clears, a number sets', () => {
    const options = tee.options;
    const sent = [
        { _id: 'black', options: { Colour: 'Black' }, Stock: 3 },                    // not sent: keep 450
        { _id: 'sand', options: { Colour: 'Sand' }, Stock: 10, costPrice: '380' },     // set
    ];
    const { variants } = buildVariantFields({ options, variants: sent, price: 900, existingVariants: tee.variants });
    assert.equal(variants.find(v => v._id === 'black').costPrice, 450);
    assert.equal(variants.find(v => v._id === 'sand').costPrice, 380);

    const cleared = buildVariantFields({ options, variants: [{ ...sent[0], costPrice: '' }, sent[1]], price: 900, existingVariants: tee.variants });
    assert.equal(cleared.variants.find(v => v._id === 'black').costPrice, null);

    assert.throws(() => buildVariantFields({ options, variants: [{ ...sent[0], costPrice: '-5' }, sent[1]], price: 900, existingVariants: tee.variants }), /cost price/);
});
