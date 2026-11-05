/**
 * One-off: add the smaller copies (400 / 800px) to product photos uploaded
 * before responsive images existed, and record them on each photo (widths).
 *
 * Only photos in our own bucket are touched. The main file is left as it is;
 * the copies are made from it. Safe to re-run: photos that already have
 * `widths` are skipped.
 *
 * USAGE
 *   node backend/scripts/backfillImageSizes.js            # dry run: counts only
 *   node backend/scripts/backfillImageSizes.js --apply
 *   node backend/scripts/backfillImageSizes.js --apply --limit=50
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '../config/.env'), quiet: true });

const mongoose = require('mongoose');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/s3');
const Product = require('../models/product');
const cache = require('../utils/cache');
const { renderSizes, withWidth } = require('../utils/imageVariants');

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

const bucketHost = `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com`;
const keyOf = url => {
    try {
        const u = new URL(url);
        return u.host === bucketHost ? decodeURIComponent(u.pathname.slice(1)) : null;
    } catch {
        return null;
    }
};

const run = async () => {
    if (!process.env.DB_HOSTED_URI || !process.env.AWS_BUCKET_NAME) {
        console.error('DB_HOSTED_URI and AWS_BUCKET_NAME are required. Aborting.');
        process.exit(1);
    }
    await mongoose.connect(process.env.DB_HOSTED_URI);

    const products = await Product.find({ 'images.0': { $exists: true } }).select('name images').lean();
    const todo = [];
    for (const product of products) {
        for (const image of product.images || []) {
            if (Array.isArray(image.widths)) continue; // done ([] = too small for copies)
            const key = keyOf(image.url);
            if (key) todo.push({ productId: product._id, name: product.name, imageId: image._id, key });
        }
    }
    console.log(`${todo.length} photo(s) without smaller copies across ${products.length} product(s).`);
    if (!apply) {
        console.log('Dry run. Pass --apply to create the copies.');
        await mongoose.disconnect();
        return;
    }

    let done = 0;
    let failed = 0;
    const touched = new Set();
    for (const item of todo.slice(0, limit)) {
        try {
            const object = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: item.key }));
            const input = Buffer.from(await object.Body.transformToByteArray());
            const { copies } = await renderSizes(input);
            for (const copy of copies) {
                await s3.send(new PutObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: withWidth(item.key, copy.width),
                    Body: copy.buffer,
                    ContentType: 'image/webp',
                    CacheControl: 'public, max-age=31536000, immutable',
                }));
            }
            // Small photos get no copies; record [] so they aren't retried.
            await Product.updateOne(
                { _id: item.productId, 'images._id': item.imageId },
                { $set: { 'images.$.widths': copies.map(c => c.width) } }
            );
            touched.add(String(item.productId));
            done += 1;
            console.log(`✓ ${item.name}: ${item.key} (${copies.map(c => c.width).join(', ') || 'no copies, already small'})`);
        } catch (error) {
            failed += 1;
            console.error(`✗ ${item.name}: ${item.key}: ${error.message}`);
        }
    }

    await cache.del(...[...touched].map(id => `product:${id}`)).catch(() => {});
    console.log(`\nDone: ${done} photo(s) updated, ${failed} failed.`);
    console.log('Search results show the new sizes after the next reindex: npm run reindex');
    await mongoose.disconnect();
};

run().catch(error => {
    console.error('Backfill failed:', error);
    process.exit(1);
});
