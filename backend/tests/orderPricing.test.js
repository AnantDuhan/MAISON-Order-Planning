const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const Product = require('../models/product');
const Coupon = require('../models/coupon');
const { priceOrder } = require('../utils/orderPricing');

const s = stubs();
afterEach(() => s.restore());

const catalogue = [
    { _id: 'lamp', name: 'Lamp', price: 400, Stock: 5, images: [] },
    { _id: 'rug', name: 'Rug', price: 900, Stock: 1, images: [] },
];

function useCatalogue() {
    s.set(Product, 'find', async query => catalogue.filter(p => query._id.$in.includes(p._id)));
    s.set(Coupon, 'findOne', async query =>
        query.code === 'SAVE10' ? { code: 'SAVE10', discount: 10 } : null);
}

test('uses database prices and ignores prices sent by the client', async () => {
    useCatalogue();
    const result = await priceOrder([{ product: 'lamp', quantity: 2, price: 1 }]);
    assert.equal(result.itemsPrice, 800);
    assert.equal(result.orderItems[0].price, 400);
});

test('charges shipping below the free-shipping threshold', async () => {
    useCatalogue();
    const result = await priceOrder([{ product: 'lamp', quantity: 2 }]);
    assert.equal(result.shippingPrice, 150);
    assert.equal(result.totalPrice, 950);
});

test('applies an active coupon (case-insensitive) and free shipping over 1000', async () => {
    useCatalogue();
    const result = await priceOrder(
        [{ product: 'lamp', quantity: 1 }, { product: 'rug', quantity: 1 }],
        'save10'
    );
    assert.equal(result.itemsPrice, 1300);
    assert.equal(result.shippingPrice, 0);
    assert.equal(result.discount, 130);
    assert.equal(result.totalPrice, 1170);
    assert.equal(result.coupon.code, 'SAVE10');
});

test('merges duplicate lines before checking stock', async () => {
    useCatalogue();
    await assert.rejects(
        priceOrder([{ product: 'rug', quantity: 1 }, { product: 'rug', quantity: 1 }]),
        { statusCode: 409 }
    );
});

test('rejects bad input', async () => {
    useCatalogue();
    await assert.rejects(priceOrder([]), { statusCode: 400 });
    await assert.rejects(priceOrder([{ product: 'lamp', quantity: 0 }]), { statusCode: 400 });
    await assert.rejects(priceOrder([{ product: 'lamp', quantity: 1.5 }]), { statusCode: 400 });
    await assert.rejects(priceOrder([{ product: 'nope', quantity: 1 }]), { statusCode: 404 });
    await assert.rejects(priceOrder([{ product: 'lamp', quantity: 1 }], 'EXPIRED'), { statusCode: 400 });
});

test('no coupon code means no coupon lookup at all', async () => {
    useCatalogue();
    let looked = false;
    s.set(Coupon, 'findOne', async () => { looked = true; return { code: 'ANY', discount: 50 }; });
    const result = await priceOrder([{ product: 'lamp', quantity: 1 }]);
    assert.equal(looked, false);
    assert.equal(result.discount, 0);
});

// Regression: product image ids are strings (generateId), but order line
// images are subdocuments with ObjectId _ids. Copying the product image
// objects made every Order.create fail validation ("Could not place the order").
test('priced order items carry image URLs only, and pass Order validation', async () => {
    useCatalogue();
    const Order = require('../models/order');
    const productsWithStringImageIds = catalogue.map(p => ({ ...p, images: [{ _id: 'img12345', url: `https://cdn.example/${p._id}.jpg` }] }));
    s.set(Product, 'find', async query => productsWithStringImageIds.filter(p => query._id.$in.includes(p._id)));

    const pricing = await priceOrder([{ product: 'lamp', quantity: 1 }]);
    assert.deepEqual(pricing.orderItems[0].images, [{ url: 'https://cdn.example/lamp.jpg' }]);

    const order = new Order({
        _id: 'o1',
        shippingInfo: { address: 'a', city: 'c', state: 's', country: 'IN', pinCode: 641018, phoneNumber: 9876543210 },
        orderItems: pricing.orderItems,
        user: 'u1',
        paymentInfo: { id: 'cf1', status: 'PAID', provider: 'cashfree' },
        paidAt: new Date(),
        itemsPrice: pricing.itemsPrice,
        taxPrice: 0,
        shippingPrice: pricing.shippingPrice,
        totalPrice: pricing.totalPrice,
    });
    assert.equal(order.validateSync(), undefined);
});
