const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseProductDetails } = require('../utils/productDetails');

test('highlights and specs are read from form JSON, trimmed and capped', () => {
    const out = parseProductDetails({
        highlights: JSON.stringify(['  6.9-inch display ', '', 'A18 Pro chip', 'Titanium', '5x zoom', 'too many']),
        specs: JSON.stringify([{ label: 'Weight', value: ' 227 g ' }, { label: '', value: 'x' }, { label: 'Chip' }]),
    });
    assert.deepEqual(out.highlights, ['6.9-inch display', 'A18 Pro chip', 'Titanium', '5x zoom']);
    assert.deepEqual(out.specs, [{ label: 'Weight', value: '227 g' }]);
});

test('fields that were not sent are left alone; bad JSON clears them', () => {
    assert.deepEqual(parseProductDetails({}), {});
    assert.deepEqual(parseProductDetails({ highlights: 'not json', specs: '{}' }), { highlights: [], specs: [] });
});
