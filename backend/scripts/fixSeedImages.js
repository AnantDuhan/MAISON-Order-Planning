/**
 * Rewrite LoremFlickr image URLs (now 401 Unauthorized) to stable Lorem
 * Picsum URLs everywhere they were copied: products, order lines and saved
 * carts. Each old URL maps to the same new URL every time, so it's safe to
 * re-run. S3 images and anything else are left untouched.
 *
 *   npm run images:fix-seed -- --dry   # count only
 *   npm run images:fix-seed            # rewrite
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const cache = require('../utils/cache');
const { replaceLoremFlickr } = require('../utils/placeholderImage');

const FILTER = /loremflickr\.com/i;

const fixImageArray = images => {
    let changed = false;
    const next = (images || []).map(image => {
        const url = replaceLoremFlickr(image?.url);
        if (!url) return image;
        changed = true;
        return { ...image, url };
    });
    return changed ? next : null;
};

const run = async () => {
    const dryRun = process.argv.includes('--dry');
    connectDB();
    await mongoose.connection.asPromise();
    const db = mongoose.connection.db;

    // Products
    const products = db.collection('products');
    const productOps = [];
    for await (const p of products.find({ 'images.url': FILTER }, { projection: { images: 1 } })) {
        const images = fixImageArray(p.images);
        if (images) productOps.push({ updateOne: { filter: { _id: p._id }, update: { $set: { images } } } });
    }

    // Order lines (orders keep their own copy of item images)
    const orders = db.collection('orders');
    const orderOps = [];
    for await (const o of orders.find({ 'orderItems.images.url': FILTER }, { projection: { orderItems: 1 } })) {
        let changed = false;
        const orderItems = o.orderItems.map(item => {
            const images = fixImageArray(item.images);
            if (!images) return item;
            changed = true;
            return { ...item, images };
        });
        if (changed) orderOps.push({ updateOne: { filter: { _id: o._id }, update: { $set: { orderItems } } } });
    }

    // Saved carts (one image URL per line)
    const carts = db.collection('carts');
    const cartOps = [];
    for await (const c of carts.find({ 'items.image': FILTER }, { projection: { items: 1 } })) {
        let changed = false;
        const items = c.items.map(item => {
            const image = replaceLoremFlickr(item.image);
            if (!image) return item;
            changed = true;
            return { ...item, image };
        });
        if (changed) cartOps.push({ updateOne: { filter: { _id: c._id }, update: { $set: { items } } } });
    }

    console.log(`products: ${productOps.length}, orders: ${orderOps.length}, carts: ${cartOps.length}${dryRun ? ' (dry run, nothing written)' : ''}`);

    if (!dryRun) {
        for (const [collection, ops] of [[products, productOps], [orders, orderOps], [carts, cartOps]]) {
            for (let i = 0; i < ops.length; i += 500) {
                await collection.bulkWrite(ops.slice(i, i + 500), { ordered: false });
            }
        }
        // Product pages are cached for an hour; drop the stale entries now.
        const keys = productOps.map(op => `product:${op.updateOne.filter._id}`);
        for (let i = 0; i < keys.length; i += 100) await cache.del(...keys.slice(i, i + 100));
        await cache.del('products');
        console.log('Done. Order and listing caches expire on their own within minutes.');
    }
    await mongoose.disconnect();
};

run().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});
