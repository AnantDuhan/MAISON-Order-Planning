const { test } = require('node:test');
const assert = require('node:assert/strict');
const { photoCountError, MAX_PHOTOS_PER_COLOUR } = require('../utils/photoLimits');

const many = (tag, n) => Array.from({ length: n }, () => tag);

test('ten photos per colour and ten shared photos are fine', () => {
    assert.equal(MAX_PHOTOS_PER_COLOUR, 10);
    assert.equal(photoCountError([...many('Black', 10), ...many('Burgundy', 10), ...many('', 10)]), null);
});

test('an eleventh photo of one colour is refused, naming the colour', () => {
    assert.match(photoCountError([...many('Black', 11), ...many('', 2)]), /“Black” has 11/);
});

test('more than ten untagged photos is refused with a hint', () => {
    assert.match(photoCountError(many('', 11)), /aren’t tagged to a colour — you have 11/);
});
