const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { stubs, mockRes } = require('./helpers');

const Product = require('../models/product');
const cache = require('../utils/cache');
const { getAllProducts, getRelatedProducts } = require('../controllers/product');

const s = stubs();
afterEach(() => s.restore());

const CARD_FIELDS = ['name', 'price', 'priceFrom', 'priceTo', 'images', 'category', 'ratings', 'numOfReviews', 'Stock', 'options', 'earlyAccessUntil'];

test('product listings load only the fields a card shows, as plain objects', async () => {
    let listQuery;
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(Product, 'estimatedDocumentCount', async () => 12);
    s.set(Product, 'countDocuments', async () => 3);
    s.set(mongoose.Query.prototype, 'exec', async function () {
        listQuery = this;
        return [{ _id: 'p1', name: 'Lamp' }];
    });

    const res = mockRes();
    await getAllProducts({ query: { page: '1' } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.products, [{ _id: 'p1', name: 'Lamp' }]);
    assert.equal(res.body.productsCount, 12);
    assert.equal(res.body.filteredProductsCount, 3);
    const fields = Object.keys(listQuery._fields);
    for (const f of CARD_FIELDS) assert.ok(fields.includes(f), `listing should include ${f}`);
    for (const heavy of ['reviews', 'description', 'variants', 'aiSummary']) {
        assert.ok(!fields.includes(heavy), `listing should not include ${heavy}`);
    }
    assert.equal(listQuery.mongooseOptions().lean, true);
});

test('related products include stock, so cards don\'t all read "Sold out"', async () => {
    const selected = [];
    const chain = result => {
        const q = { select: f => { selected.push(f); return q; }, sort: () => q, limit: () => q, lean: async () => result };
        return q;
    };
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(Product, 'findOne', () => ({ lean: async () => ({ _id: 'x', category: 'Audio' }) }));
    s.set(Product, 'find', () => chain(['a', 'b', 'c', 'd'].map(_id => ({ _id }))));

    await getRelatedProducts({ params: { id: 'x' } }, mockRes());
    for (const f of CARD_FIELDS) assert.ok(selected[0].split(' ').includes(f), `related should include ${f}`);
});
