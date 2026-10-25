const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Product = require('../models/product');
const cache = require('../utils/cache');
const { getRelatedProducts } = require('../controllers/product');

const s = stubs();
afterEach(() => s.restore());

// Chainable stand-in for Product.find(...).select().sort().limit().lean().
const chain = result => {
    const q = { select: () => q, sort: () => q, limit: () => q, lean: async () => result };
    return q;
};

function setup({ current, sameCategory, newest }) {
    const finds = [];
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(Product, 'findOne', () => ({ lean: async () => current }));
    s.set(Product, 'find', filter => {
        finds.push(filter);
        return chain(finds.length === 1 ? sameCategory : newest);
    });
    return finds;
}

test('returns same-category products and skips the fill query when the row is full', async () => {
    const same = ['a', 'b', 'c', 'd'].map(_id => ({ _id }));
    const finds = setup({ current: { _id: 'x', category: 'Audio' }, sameCategory: same, newest: [] });
    const res = mockRes();
    await getRelatedProducts({ params: { id: 'x' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.products.map(p => p._id), ['a', 'b', 'c', 'd']);
    assert.equal(finds.length, 1);
    assert.deepEqual(finds[0], { isDemo: { $ne: true }, _id: { $ne: 'x' }, category: 'Audio' });
});

test('fills the row with newest products, excluding the current and already-picked ones', async () => {
    const finds = setup({
        current: { _id: 'x', category: 'Audio' },
        sameCategory: [{ _id: 'a' }],
        newest: [{ _id: 'n1' }, { _id: 'n2' }, { _id: 'n3' }],
    });
    const res = mockRes();
    await getRelatedProducts({ params: { id: 'x' } }, res);
    assert.deepEqual(res.body.products.map(p => p._id), ['a', 'n1', 'n2', 'n3']);
    assert.deepEqual(finds[1], { isDemo: { $ne: true }, _id: { $nin: ['x', 'a'] } });
});

test('404s for an unknown product', async () => {
    setup({ current: null, sameCategory: [], newest: [] });
    const res = mockRes();
    await getRelatedProducts({ params: { id: 'missing' } }, res);
    assert.equal(res.statusCode, 404);
});
