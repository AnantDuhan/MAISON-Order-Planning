const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ApiFeatures = require('../utils/apifeatures');

const Item = mongoose.models.ApiFeaturesTestItem || mongoose.model(
    'ApiFeaturesTestItem',
    new mongoose.Schema({ name: String, price: Number, category: String, ratings: Number, isDemo: Boolean })
);

const build = query => new ApiFeatures(Item.find(), query).search().filter();

test('builds numeric range filters for price and ratings', () => {
    const filter = build({ price: { gte: '10', lte: '500' }, ratings: { gte: '4' } }).query.getFilter();
    assert.deepEqual(filter.price, { $gte: 10, $lte: 500 });
    assert.deepEqual(filter.ratings, { $gte: 4 });
});

test('escapes the search keyword so it is matched literally', () => {
    const filter = build({ keyword: 'a.*(b' }).query.getFilter();
    assert.equal(filter.name.$regex, 'a\\.\\*\\(b');
    assert.doesNotThrow(() => new RegExp(filter.name.$regex));
});

test('ignores fields and operators that are not whitelisted', () => {
    const filter = build({
        isDemo: 'true',
        user: 'someone',
        price: { $where: 'sleep(1000)', gte: '5' },
        category: { $ne: 'x' },
    }).query.getFilter();
    assert.deepEqual(filter, { price: { $gte: 5 } });
});

test('paginates from page 1 when page is missing or invalid', () => {
    const q = build({ page: 'abc' });
    q.pagination(8);
    assert.deepEqual(q.query.getOptions(), { limit: 8, skip: 0 });

    const q2 = build({ page: '3' });
    q2.pagination(8);
    assert.deepEqual(q2.query.getOptions(), { limit: 8, skip: 16 });
});
