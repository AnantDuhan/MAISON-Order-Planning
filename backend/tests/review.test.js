const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const Product = require('../models/product');
const cache = require('../utils/cache');
const searchService = require('../services/searchService');
const { createProductReview, deleteReview } = require('../controllers/product');

const s = stubs();
afterEach(() => s.restore());

const app = { get: () => ({ to: () => ({ emit: () => {} }) }) };

function productDoc() {
    return {
        _id: 'lamp',
        reviews: [],
        ratings: 0,
        numOfReviews: 0,
        save: async () => {},
    };
}

test('rejects a review from someone who has not received the product', async () => {
    s.set(Product, 'findById', async () => productDoc());
    s.set(Order, 'exists', async () => null);
    const res = mockRes();
    await createProductReview(
        { body: { productId: 'lamp', rating: 5, comment: 'Great' }, user: { _id: 'u1', name: 'A' }, app },
        res
    );
    assert.equal(res.statusCode, 403);
});

test('accepts a review from a customer with a delivered order', async () => {
    const product = productDoc();
    let existsQuery;
    s.set(Product, 'findById', async () => product);
    s.set(Order, 'exists', async q => { existsQuery = q; return { _id: 'o1' }; });
    s.set(cache, 'del', async () => {});
    s.set(searchService, 'indexProduct', async () => {});
    const res = mockRes();
    await createProductReview(
        { body: { productId: 'lamp', rating: 4, comment: 'Nice' }, user: { _id: 'u1', name: 'A' }, app },
        res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(product.reviews.length, 1);
    assert.deepEqual(existsQuery, { user: 'u1', orderStatus: 'Delivered', 'orderItems.product': 'lamp' });
});

test('validates the rating range', async () => {
    for (const rating of [0, 6, 2.5, 'x']) {
        const res = mockRes();
        await createProductReview(
            { body: { productId: 'lamp', rating, comment: 'c' }, user: { _id: 'u1' }, app },
            res
        );
        assert.equal(res.statusCode, 400, String(rating));
    }
});

test('only the author (or a verified admin) can delete a review', async () => {
    const product = { _id: 'lamp', reviews: [{ _id: 'rev1', user: 'author', rating: 5 }] };
    s.set(Product, 'findById', async () => product);
    const res = mockRes();
    await deleteReview(
        { params: { reviewId: 'rev1' }, query: { productId: 'lamp' }, user: { _id: 'someone-else', role: 'user' }, auth: {}, app },
        res
    );
    assert.equal(res.statusCode, 403);
});
