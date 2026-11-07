const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { stubs, mockRes } = require('./helpers');

const ApiFeatures = require('../utils/apifeatures');
const Product = require('../models/product');
const cache = require('../utils/cache');
const categoryService = require('../services/categoryService');
const { getAllProducts } = require('../controllers/product');
const { searchProductsController, suggestProducts } = require('../controllers/search');

const s = stubs();
afterEach(() => s.restore());

const Item = mongoose.models.SortTestItem || mongoose.model(
    'SortTestItem',
    new mongoose.Schema({ name: String, price: Number, ratings: Number, numOfReviews: Number, createdAt: Date })
);
const sortOf = query => new ApiFeatures(Item.find(), query).sort().query.getOptions().sort;

test('sort applies only whitelisted orders', () => {
    assert.deepEqual(sortOf({ sort: 'newest' }), { createdAt: -1, _id: -1 });
    assert.deepEqual(sortOf({ sort: 'price_asc' }), { price: 1, _id: 1 });
    assert.deepEqual(sortOf({ sort: 'price_desc' }), { price: -1, _id: -1 });
    assert.deepEqual(sortOf({ sort: 'ratings' }), { ratings: -1, numOfReviews: -1, _id: -1 });
});

test('no sort or an unknown sort keeps the old unsorted order', () => {
    assert.equal(sortOf({}), undefined);
    assert.equal(sortOf({ sort: 'isDemo' }), undefined);
    assert.equal(sortOf({ sort: { $where: '1' } }), undefined);
});

test('product listings sort when asked and cache per sort', async () => {
    let listQuery;
    const cacheKeys = [];
    s.set(cache, 'getJSON', async key => { cacheKeys.push(key); return null; });
    s.set(cache, 'setJSON', async () => {});
    s.set(Product, 'estimatedDocumentCount', async () => 2);
    s.set(Product, 'countDocuments', async () => 2);
    s.set(mongoose.Query.prototype, 'exec', async function () { listQuery = this; return []; });

    await getAllProducts({ query: { sort: 'price_asc' } }, mockRes());
    assert.deepEqual(listQuery.getOptions().sort, { price: 1, _id: 1 });
    assert.match(cacheKeys[0], /"sort":"price_asc"/);
});

test('search filters by every category in a department, ratings, price and stock', async () => {
    let listQuery;
    s.set(categoryService, 'namesFor', async () => ['Accessories', 'Necklaces']);
    s.set(Product, 'estimatedDocumentCount', async () => 5);
    s.set(Product, 'countDocuments', async () => 1);
    s.set(mongoose.Query.prototype, 'exec', async function () { listQuery = this; return [{ _id: 'p1', name: 'Gold chain' }]; });

    const res = mockRes();
    await searchProductsController({ query: { keyword: 'gold', category: 'accessories', price: { gte: '1000', lte: '5000' }, ratings: { gte: '4' }, sort: 'newest', inStock: 'true' } }, res);

    assert.equal(res.statusCode, 200);
    const filter = listQuery.getFilter();
    assert.equal(filter.name.$regex, 'gold');
    assert.deepEqual(filter.category.$in.map(r => r.source), ['^Accessories$', '^Necklaces$']);
    assert.deepEqual(filter.price, { $gte: 1000, $lte: 5000 });
    assert.deepEqual(filter.ratings, { $gte: 4 });
    assert.deepEqual(filter.Stock, { $gt: 0 });
    assert.deepEqual(listQuery.getOptions().sort, { createdAt: -1, _id: -1 });
    assert.deepEqual(res.body.products, [{ _id: 'p1', name: 'Gold chain' }]);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.filteredProductsCount, 1);
});

test('suggestions: names that start with the text first, then shorter names, at most six', async () => {
    let filter;
    const names = ['A gold ring', 'Gold chain bracelet', 'Gold chain', 'Rose gold watch', 'Goldie', 'Old gold', 'Gilded gold tray', 'gold'];
    s.set(Product, 'find', f => {
        filter = f;
        return { select() { return this; }, limit() { return this; }, lean: async () => names.map((name, i) => ({ _id: `p${i}`, name, images: [{ url: 'a' }, { url: 'b' }] })) };
    });

    await suggestProducts('Gold.*');
    assert.equal(filter.name.$regex, 'Gold\\.\\*'); // typed text is matched literally

    const data = await suggestProducts('  Gold ');
    assert.equal(data.length, 6);
    assert.deepEqual(data.slice(0, 4).map(d => d.name), ['gold', 'Goldie', 'Gold chain', 'Gold chain bracelet']);
    assert.equal(data[0].id, 'p7');
    assert.equal(data[0].images.length, 1);
    assert.deepEqual(await suggestProducts('   '), []);
});
