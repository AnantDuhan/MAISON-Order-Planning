const { test } = require('node:test');
const assert = require('node:assert/strict');

const Order = require('../models/order');

// Orders placed before the order-pricing fix, and seeded demo orders, store
// each line's images with the product's *string* image id. Every return /
// refund step re-saved the order, and Mongoose rejected it
// ("Cast to ObjectId failed ... orderItems.0.images.0._id"), so returns and
// refunds silently never got created for those orders.
const legacyOrder = () => Order.hydrate({
    _id: 'o1',
    user: 'c1',
    orderStatus: 'Delivered',
    paidAt: new Date(),
    shippingInfo: { address: 'a', city: 'c', state: 's', country: 'IN', pinCode: 641018, phoneNumber: 9876543210 },
    paymentInfo: { id: 'cf1', status: 'PAID' },
    itemsPrice: 500,
    taxPrice: 0,
    shippingPrice: 0,
    totalPrice: 500,
    return: [],
    refund: [],
    orderItems: [{ name: 'Mat', price: 500, quantity: 1, product: 'p1', images: [{ _id: 'img12345', url: 'https://x/a.jpg' }] }],
});

test('a legacy order (string image ids) can be updated for a return and a refund', () => {
    const order = legacyOrder();
    order.return.push('r1');
    order.isReturned = true;
    order.refundStatus = 'Initiated';
    assert.equal(order.validateSync(), undefined);

    order.refund.push('rf1');
    order.refundStatus = 'Processing';
    order.isRefunded = true;
    assert.equal(order.validateSync(), undefined);
});

test('order line images keep their URL and need no id', () => {
    const order = new Order({ orderItems: [{ name: 'Mat', price: 1, quantity: 1, product: 'p1', images: [{ url: 'https://x/a.jpg' }] }] });
    const image = order.orderItems[0].images[0];
    assert.equal(image.url, 'https://x/a.jpg');
    assert.equal(image._id, undefined);
});
