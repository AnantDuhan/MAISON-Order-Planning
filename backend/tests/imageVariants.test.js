const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const { withWidth, renderSizes, keysForImage, WIDTHS, MAX_WIDTH } = require('../utils/imageVariants');

const photo = (width, height) => sharp({ create: { width, height, channels: 3, background: '#c9b89f' } }).png().toBuffer();

test('copies are named with their width before the extension', () => {
    assert.equal(withWidth('products/p1/171-0-lamp.webp', 400), 'products/p1/171-0-lamp-w400.webp');
    assert.equal(withWidth('products/p1/a.b.webp', 800), 'products/p1/a.b-w800.webp');
    assert.equal(withWidth('https://bucket.s3.ap-south-1.amazonaws.com/products/p1/x.webp?v=2', 400),
        'https://bucket.s3.ap-south-1.amazonaws.com/products/p1/x-w400.webp?v=2');
});

test('a large photo becomes a 1600px WebP plus a 400 and 800px copy', async () => {
    const { main, width, copies } = await renderSizes(await photo(3000, 2000));
    assert.equal(width, MAX_WIDTH);
    assert.deepEqual(copies.map(c => c.width), WIDTHS);
    const meta = await sharp(main).metadata();
    assert.equal(meta.format, 'webp');
    for (const copy of copies) {
        assert.equal((await sharp(copy.buffer).metadata()).width, copy.width);
    }
});

test('a small photo is never enlarged and only gets the copies it is wide enough for', async () => {
    const { width, copies } = await renderSizes(await photo(500, 500));
    assert.equal(width, 500);
    assert.deepEqual(copies.map(c => c.width), [400]);
    const tiny = await renderSizes(await photo(300, 300));
    assert.deepEqual(tiny.copies, []);
});

test('deleting an image deletes its copies too', () => {
    assert.deepEqual(keysForImage('products/p1/a.webp', [400, 800]), ['products/p1/a.webp', 'products/p1/a-w400.webp', 'products/p1/a-w800.webp']);
    assert.deepEqual(keysForImage('products/p1/a.webp', undefined), ['products/p1/a.webp']);
    assert.deepEqual(keysForImage(null, [400]), []);
});
