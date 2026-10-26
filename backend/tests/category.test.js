const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Category = require('../models/category');
const Product = require('../models/product');
const cache = require('../utils/cache');
const categories = require('../services/categoryService');
const controller = require('../controllers/category');

const s = stubs();
afterEach(() => s.restore());

const lean = value => ({ lean: async () => value });

function useStore({ docs, stats = [], products = [] }) {
    s.set(cache, 'getJSON', async () => null);
    s.set(cache, 'setJSON', async () => {});
    s.set(cache, 'del', async () => {});
    s.set(Category, 'estimatedDocumentCount', async () => docs.length);
    s.set(Category, 'find', () => lean(docs));
    s.set(Product, 'aggregate', async () => stats);
    s.set(Product, 'distinct', async () => products);
}

test('slugify handles ampersands, accents and punctuation', () => {
    assert.equal(categories.slugify('Home & Living'), 'home-and-living');
    assert.equal(categories.slugify('  Café — Décor! '), 'cafe-decor');
});

test('first run seeds the five departments and files old product categories under them', async () => {
    let inserted;
    s.set(Category, 'estimatedDocumentCount', async () => 0);
    s.set(Product, 'distinct', async () => ['SmartPhones', 'Footwear', 'Liquor', 'Electronics']);
    s.set(Category, 'insertMany', async docs => { inserted = docs; });
    assert.equal(await categories.seedIfEmpty(), true);
    const names = inserted.map(d => d.name);
    assert.deepEqual(names.slice(0, 5), ['Electronics', 'Clothes', 'Shoes', 'Accessories', 'Home & Living']);
    const byName = Object.fromEntries(inserted.map(d => [d.name, d]));
    assert.equal(byName.SmartPhones.parent, byName.Electronics._id);
    assert.equal(byName.Footwear.parent, byName.Shoes._id);
    assert.equal(byName.Liquor.parent, null); // no obvious home: top level
    assert.equal(names.filter(n => n === 'Electronics').length, 1); // no duplicate
});

test('tree nests categories, sums counts and falls back to a product photo', async () => {
    useStore({
        docs: [
            { _id: 'e', name: 'Electronics', slug: 'electronics', parent: null, sortOrder: 0, isActive: true, image: { url: null } },
            { _id: 'p', name: 'SmartPhones', slug: 'smartphones', parent: 'e', sortOrder: 1, isActive: true, image: { url: null } },
            { _id: 'c', name: 'Clothes', slug: 'clothes', parent: null, sortOrder: 1, isActive: true, image: { url: 'https://img/c.jpg' } },
        ],
        stats: [{ _id: 'smartphones', count: 2, image: 'https://img/iphone.webp' }, { _id: 'electronics', count: 1, image: null }],
    });
    const tree = await categories.getTree();
    assert.deepEqual(tree.map(d => d.name), ['Electronics', 'Clothes']);
    assert.equal(tree[0].productCount, 3);
    assert.equal(tree[0].displayImage, 'https://img/iphone.webp');
    assert.equal(tree[0].children[0].name, 'SmartPhones');
    assert.equal(tree[1].displayImage, 'https://img/c.jpg');
    assert.equal(tree[1].productCount, 0);
});

test('a department filter covers its categories; a category covers only itself', async () => {
    useStore({
        docs: [
            { _id: 'e', name: 'Electronics', slug: 'electronics', parent: null, sortOrder: 0, isActive: true },
            { _id: 'p', name: 'SmartPhones', slug: 'smartphones', parent: 'e', sortOrder: 1, isActive: true },
            { _id: 'a', name: 'Audio', slug: 'audio', parent: 'e', sortOrder: 2, isActive: true },
        ],
    });
    assert.deepEqual(await categories.namesFor('electronics'), ['Electronics', 'SmartPhones', 'Audio']);
    assert.deepEqual(await categories.namesFor('Audio'), ['Audio']);
    assert.deepEqual(await categories.namesFor('Unknown'), ['Unknown']);
});

test('creating a category rejects a duplicate name and a third level', async () => {
    s.set(Category, 'findOne', () => lean({ name: 'Shoes' }));
    await assert.rejects(controller._readInput({ name: 'shoes' }, null), /already exists/);

    s.set(Category, 'findOne', () => lean(null));
    s.set(Category, 'findById', () => lean({ _id: 'p', parent: 'e' }));
    await assert.rejects(controller._readInput({ name: 'Cases', parent: 'p' }, null), /one level deep/);
});

test('renaming a category renames it on its products', async () => {
    const doc = { _id: 'p', name: 'SmartPhones', parent: 'e', isActive: true, save: async () => {} };
    s.set(Category, 'findById', async () => doc);
    s.set(Category, 'findOne', () => lean(null));
    s.set(cache, 'del', async () => {});
    let update;
    s.set(Product, 'updateMany', async (filter, change) => { update = { filter, change }; return { modifiedCount: 2 }; });
    const res = mockRes();
    await controller.updateCategory({ params: { id: 'p' }, body: { name: 'Smartphones' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.productsUpdated, 2);
    assert.ok(update.filter.category.test('smartphones'));
    assert.deepEqual(update.change, { $set: { category: 'Smartphones' } });
});

test('a category in use can’t be deleted', async () => {
    s.set(Category, 'findById', async () => ({ _id: 'p', name: 'Audio', deleteOne: async () => { throw new Error('should not delete'); } }));
    s.set(Category, 'exists', async () => null);
    s.set(Product, 'countDocuments', async () => 3);
    const res = mockRes();
    await controller.deleteCategory({ params: { id: 'p' } }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /3 products use this category/);
});
