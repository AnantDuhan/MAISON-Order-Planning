const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { stubs, mockRes } = require('./helpers');

const ApiFeatures = require('../utils/apifeatures');
const Product = require('../models/product');
const cache = require('../utils/cache');
const categoryService = require('../services/categoryService');
const searchService = require('../services/searchService');
const esClient = require('../config/elasticsearch');
const { getAllProducts } = require('../controllers/product');
const { searchProductsController } = require('../controllers/search');

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

test('search filters by every category in a department, ratings and price', async () => {
    let body;
    s.set(categoryService, 'namesFor', async () => ['Accessories', 'Necklaces']);
    s.set(esClient, 'search', async req => { body = req; return { hits: { hits: [], total: { value: 0 } } }; });

    const res = mockRes();
    await searchProductsController({ query: { keyword: 'gold', category: 'accessories', price: { gte: '1000', lte: '5000' }, ratings: { gte: '4' }, sort: 'newest' } }, res);

    assert.equal(res.statusCode, 200);
    const filters = body.query.bool.filter;
    assert.deepEqual(filters.find(f => f.terms).terms.category.sort(), ['Accessories', 'Necklaces', 'accessories', 'necklaces']);
    assert.deepEqual(filters.find(f => f.range?.price).range.price, { gte: 1000, lte: 5000 });
    assert.deepEqual(filters.find(f => f.range?.ratings).range.ratings, { gte: 4 });
    assert.deepEqual(body.sort, [{ createdAt: 'desc' }]);
    assert.equal(res.body.filteredProductsCount, 0);
    assert.ok(res.body.resultPerPage > 0);
});

test('search falls back to the catalogue when Elasticsearch is down', async () => {
    s.set(searchService, 'searchProducts', async () => { throw new Error('connect ECONNREFUSED'); });
    s.set(esClient, 'search', async () => { throw new Error('connect ECONNREFUSED'); });
    s.set(Product, 'estimatedDocumentCount', async () => 5);
    s.set(Product, 'countDocuments', async () => 1);
    s.set(mongoose.Query.prototype, 'exec', async () => [{ _id: 'p1', name: 'Gold chain' }]);

    const res = mockRes();
    await searchProductsController({ query: { keyword: 'gold' } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.products, [{ _id: 'p1', name: 'Gold chain' }]);
    assert.equal(res.body.filteredProductsCount, 1);
    assert.equal(res.body.fallback, true);
});
