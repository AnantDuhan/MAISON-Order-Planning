const { test } = require('node:test');
const assert = require('node:assert/strict');
const { replaceLoremFlickr, placeholderImageUrl } = require('../utils/placeholderImage');

test('LoremFlickr URLs map to a stable Picsum URL', () => {
    const old = 'https://loremflickr.com/600/600/yoga,mat?lock=3712713871';
    assert.equal(replaceLoremFlickr(old), 'https://picsum.photos/seed/yoga-mat-3712713871/600/600');
    assert.equal(replaceLoremFlickr(old), replaceLoremFlickr(old));
    assert.notEqual(replaceLoremFlickr(old), replaceLoremFlickr(old.replace('3712713871', '3712713872')));
});

test('other image URLs are left alone', () => {
    assert.equal(replaceLoremFlickr('https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/products/p1/a.jpg'), null);
    assert.equal(replaceLoremFlickr(undefined), null);
});

test('seed URLs are clean and sized', () => {
    assert.equal(placeholderImageUrl('Yoga Mat,Pro-12'), 'https://picsum.photos/seed/yoga-mat-pro-12/600/600');
});
