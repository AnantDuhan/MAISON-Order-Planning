const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const Product = require('../models/product');
const Coupon = require('../models/coupon');
const cache = require('../utils/cache');
const inventory = require('../services/inventoryService');
const { priceOrder } = require('../utils/orderPricing');
const V = require('../utils/productVariants');

const s = stubs();
afterEach(() => s.restore());

const OPTIONS = [
    { name: 'Size', kind: 'size', values: ['S', 'M', 'L'] },
    { name: 'Colour', kind: 'color', values: [{ value: 'Black', hex: '#1a1816' }, { value: 'Sand', hex: 'nope' }] },
];

// ---- Validation -------------------------------------------------------------------

test('options are tidied: trimmed names, colour hex kept only when valid', () => {
    const options = V.normalizeOptions(JSON.stringify(OPTIONS));
    assert.deepEqual(options[1].values, [{ value: 'Black', hex: '#1A1816' }, { value: 'Sand' }]);
    assert.throws(() => V.normalizeOptions([{ name: 'Size', values: ['S'] }, { name: 'size', values: ['M'] }]), /listed twice/);
    assert.throws(() => V.normalizeOptions([{ name: 'Size', values: [] }]), /at least one value/);
    assert.throws(() => V.normalizeOptions([{ name: 'Size', values: ['S', 's'] }]), /appears twice/);
});

test('variants must be complete, unique combinations with valid stock and price', () => {
    const options = V.normalizeOptions(OPTIONS);
    const ok = V.normalizeVariants([
        { options: { Size: 'M', Colour: 'Black' }, Stock: 4 },
        { options: { Size: 'L', Colour: 'Black' }, Stock: '2', price: 3199, sku: 'LIN-L-BLK' },
    ], options);
    assert.equal(ok.length, 2);
    assert.equal(ok[0].price, null);
    assert.equal(ok[1].Stock, 2);
    assert.throws(() => V.normalizeVariants([{ options: { Size: 'M' }, Stock: 1 }], options), /choose a Colour/);
    assert.throws(() => V.normalizeVariants([{ options: { Size: 'XL', Colour: 'Black' } }], options), /choose a Size/);
    assert.throws(() => V.normalizeVariants([
        { options: { Size: 'M', Colour: 'Black' } }, { options: { Size: 'm', Colour: 'black' } },
    ], options), /listed twice/);
    assert.throws(() => V.normalizeVariants([{ options: { Size: 'M', Colour: 'Black' }, Stock: -1 }], options), /whole number/);
    assert.throws(() => V.normalizeVariants([{ options: { Size: 'M', Colour: 'Black' }, price: 0 }], options), /positive/);
});

test('existing variant ids are kept on edit, so carts pointing at them stay valid', () => {
    const options = V.normalizeOptions(OPTIONS);
    const [kept, fresh] = V.normalizeVariants([
        { _id: 'v-old', options: { Size: 'M', Colour: 'Black' } },
        { _id: 'v-forged', options: { Size: 'L', Colour: 'Black' } },
    ], options, [{ _id: 'v-old' }]);
    assert.equal(kept._id, 'v-old');
    assert.notEqual(fresh._id, 'v-forged');
});

test('stock is the sum of active variants; price range for listings', () => {
    const built = V.buildVariantFields({
        options: OPTIONS,
        variants: [
            { options: { Size: 'S', Colour: 'Black' }, Stock: 3 },
            { options: { Size: 'M', Colour: 'Black' }, Stock: 2, price: 2999 },
            { options: { Size: 'L', Colour: 'Black' }, Stock: 9, active: false },
        ],
        price: 2499,
    });
    assert.equal(built.Stock, 5);
    assert.deepEqual([built.priceFrom, built.priceTo], [2499, 2999]);
    assert.deepEqual(V.buildVariantFields({ options: [], price: 10 }).variants, []);
});

test('category templates suggest sensible options', () => {
    assert.deepEqual(V.templateForCategory('Tops').map(o => o.name), ['Size', 'Colour']);
    assert.deepEqual(V.templateForCategory('Jeans').map(o => o.name), ['Waist', 'Colour']);
    assert.deepEqual(V.templateForCategory('Footwear').map(o => o.name), ['Size (UK)', 'Colour']);
    assert.deepEqual(V.templateForCategory('Gardening'), []);
});

// ---- Pricing ---------------------------------------------------------------------------

const shirt = () => ({
    _id: 'shirt', name: 'Linen Shirt', price: 2499, Stock: 5, images: [],
    options: V.normalizeOptions(OPTIONS),
    variants: [
        { _id: 'v-m-blk', options: { Size: 'M', Colour: 'Black' }, Stock: 2, price: null, sku: 'LIN-M-BLK' },
        { _id: 'v-l-blk', options: { Size: 'L', Colour: 'Black' }, Stock: 3, price: 2799 },
    ],
});

test('pricing: a variant is required, its price and label are used', async () => {
    s.set(Product, 'find', async () => [shirt()]);
    s.set(Coupon, 'findOne', async () => null);

    await assert.rejects(priceOrder([{ product: 'shirt', quantity: 1 }]), /choose size and colour/);

    const priced = await priceOrder([
        { product: 'shirt', variant: 'v-m-blk', quantity: 1 },
        { product: 'shirt', variant: 'v-l-blk', quantity: 1 },
        { product: 'shirt', variant: 'v-m-blk', quantity: 1 }, // merged with the first line
    ]);
    assert.equal(priced.orderItems.length, 2);
    const m = priced.orderItems.find(i => i.variant === 'v-m-blk');
    assert.equal(m.quantity, 2);
    assert.equal(m.price, 2499);
    assert.equal(m.variantLabel, 'Size: M · Colour: Black');
    assert.equal(m.sku, 'LIN-M-BLK');
    assert.equal(priced.orderItems.find(i => i.variant === 'v-l-blk').price, 2799);
    assert.equal(priced.itemsPrice, 2499 * 2 + 2799);
});

test('pricing: stock is checked per variant, not per product', async () => {
    s.set(Product, 'find', async () => [shirt()]);
    s.set(Coupon, 'findOne', async () => null);
    await assert.rejects(
        priceOrder([{ product: 'shirt', variant: 'v-m-blk', quantity: 3 }]),
        /Only 2 left in stock for "Linen Shirt" \(Size: M · Colour: Black\)/
    );
    await assert.rejects(priceOrder([{ product: 'shirt', variant: 'nope', quantity: 1 }]), /no longer available/);
});

// ---- Stock movements ---------------------------------------------------------------------

test('stock: variant lines move the variant and the product total together, conditionally', async () => {
    const calls = [];
    s.set(Product, 'updateOne', async (filter, update) => { calls.push({ filter, update }); return { modifiedCount: 1 }; });
    s.set(Product, 'bulkWrite', async ops => { calls.push(...ops.map(o => o.updateOne)); });
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'checkLowStock', async () => []);
    s.set(inventory, 'afterStockIncrease', () => {});

    await inventory.takeStock([{ product: 'shirt', variant: 'v-m-blk', quantity: 2 }, { product: 'lamp', quantity: 1 }]);
    assert.deepEqual(calls[0].filter, { _id: 'shirt', variants: { $elemMatch: { _id: 'v-m-blk', Stock: { $gte: 2 } } } });
    assert.deepEqual(calls[0].update, { $inc: { 'variants.$.Stock': -2, Stock: -2 } });
    assert.deepEqual(calls[1].filter, { _id: 'lamp', Stock: { $gte: 1 } });

    calls.length = 0;
    await inventory.restoreStock([{ product: 'shirt', variant: 'v-m-blk', quantity: 2 }]);
    assert.deepEqual(calls[0].filter, { _id: 'shirt', 'variants._id': 'v-m-blk' });
    assert.deepEqual(calls[0].update, { $inc: { 'variants.$.Stock': 2, Stock: 2 } });
});

test('stock: a short variant rolls back the other lines and names the option', async () => {
    const calls = [];
    s.set(Product, 'updateOne', async (filter, update) => {
        calls.push(update);
        return { modifiedCount: filter.variants ? 0 : 1 };
    });
    s.set(Product, 'bulkWrite', async ops => { calls.push(...ops.map(o => o.updateOne.update)); });
    s.set(Product, 'findById', () => ({ select: () => ({ lean: async () => shirt() }) }));
    s.set(cache, 'del', async () => {});
    s.set(inventory, 'checkLowStock', async () => []);
    s.set(inventory, 'afterStockIncrease', () => {});

    await assert.rejects(
        inventory.takeStock([{ product: 'lamp', quantity: 1 }, { product: 'shirt', variant: 'v-m-blk', quantity: 5 }]),
        /Only 2 left in stock for "Linen Shirt" \(Size: M · Colour: Black\)/
    );
    assert.deepEqual(calls.at(-1), { $inc: { Stock: 1 } }); // lamp given back
});

// ---- Colour ↔ photos ----------------------------------------------------------------

const photos = [
    { _id: 'p1', url: 'black-front.jpg', color: 'Black' },
    { _id: 'p2', url: 'navy-front.jpg', color: 'Navy' },
    { _id: 'p3', url: 'fabric.jpg' },               // shared by every colour
    { _id: 'p4', url: 'black-back.jpg', color: 'Black' },
];

test('choosing a colour shows its photos first, then the shared ones', () => {
    const product = { images: photos };
    assert.deepEqual(V.imagesForColor(product, 'Black').map(p => p._id), ['p1', 'p4', 'p3']);
    assert.deepEqual(V.imagesForColor(product, 'Navy').map(p => p._id), ['p2', 'p3']);
    // No colour chosen, or a colour with no photos of its own: everything.
    assert.equal(V.imagesForColor(product, null).length, 4);
    assert.equal(V.imagesForColor(product, 'Sand').length, 4);
});

test('photo tags must name an existing colour; spelling follows the option', () => {
    const options = V.normalizeOptions([{ name: 'Colour', kind: 'color', values: ['Black', 'Navy'] }]);
    const cleaned = V.cleanImageColors([
        { _id: 'a', url: 'a', color: 'black' },
        { _id: 'b', url: 'b', color: 'Purple' },
        { _id: 'c', url: 'c' },
    ], options);
    assert.deepEqual(cleaned.map(i => i.color), ['Black', undefined, undefined]);
    // Without a colour option, nothing stays tagged.
    assert.equal(V.cleanImageColors([{ _id: 'a', url: 'a', color: 'Black' }], []).color, undefined);
});

test('an order line for Navy carries the Navy photo', async () => {
    const product = {
        ...shirt(),
        options: V.normalizeOptions(OPTIONS.map(o => (o.kind === 'color' ? { ...o, values: ['Black', 'Navy'] } : o))),
        variants: [{ _id: 'v-m-navy', options: { Size: 'M', Colour: 'Navy' }, Stock: 3, price: null }],
        images: photos,
    };
    s.set(Product, 'find', async () => [product]);
    s.set(Coupon, 'findOne', async () => null);
    const priced = await priceOrder([{ product: 'shirt', variant: 'v-m-navy', quantity: 1 }]);
    assert.deepEqual(priced.orderItems[0].images.map(i => i.url), ['navy-front.jpg', 'fabric.jpg']);
});
