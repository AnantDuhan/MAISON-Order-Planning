const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Product = require('../models/product');
const Order = require('../models/order');
const { getMyReview, createProductReview } = require('../controllers/product');

const s = stubs();
afterEach(() => s.restore());

const withProduct = reviews => s.set(Product, 'findById', () => ({ select: () => ({ lean: async () => ({ reviews }) }) }));

test('my-review: a customer with a delivered order can review, and gets their earlier review back', async () => {
    withProduct([{ user: 'u1', rating: 4, comment: 'Lovely' }, { user: 'u2', rating: 2, comment: 'Meh' }]);
    s.set(Order, 'exists', async () => ({ _id: 'o1' }));
    const res = mockRes();
    await getMyReview({ params: { id: 'p1' }, user: { _id: 'u1' } }, res);
    assert.equal(res.body.canReview, true);
    assert.deepEqual(res.body.review, { rating: 4, comment: 'Lovely' });
});

test('my-review: without a delivered order the form is told why, before typing anything', async () => {
    withProduct([]);
    s.set(Order, 'exists', async () => null);
    const res = mockRes();
    await getMyReview({ params: { id: 'p1' }, user: { _id: 'u9' } }, res);
    assert.equal(res.body.canReview, false);
    assert.equal(res.body.reason, 'not-delivered');
    assert.equal(res.body.review, null);
});

test('reviews over the length limit are refused', async () => {
    const res = mockRes();
    await createProductReview({ body: { productId: 'p1', rating: 5, comment: 'x'.repeat(2001) }, user: { _id: 'u1' } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /under 2000/);
});
