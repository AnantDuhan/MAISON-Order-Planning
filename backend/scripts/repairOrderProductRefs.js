/**
 * Repair orderItems.product references left as numeric legacy IDs after ID migration.
 *
 * A bare run is read-only. Use --apply after reviewing the proposed mappings.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config/config.env') });

const APPLY = process.argv.includes('--apply');

const imageUrls = images => (images || []).map(image => image.url).filter(Boolean);

const run = async () => {
    const uri = process.env.DB_HOSTED_URI || process.env.DB_URI;
    if (!uri) {
        console.error('No DB_HOSTED_URI / DB_URI found in env. Aborting.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const orders = db.collection('orders');
    const products = db.collection('products');
    const productDocs = await products.find({}, { projection: { _id: 1, name: 1, price: 1, images: 1 } }).toArray();
    const productByKey = new Map();

    for (const product of productDocs) {
        const key = `${product.name}\u0000${product.price}`;
        const candidates = productByKey.get(key) || [];
        candidates.push(product);
        productByKey.set(key, candidates);
    }

    const affectedOrders = await orders.find({ 'orderItems.product': { $type: 'number' } }).toArray();
    let repaired = 0;

    console.log(`Connected. Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (read only)'}\n`);

    for (const order of affectedOrders) {
        const replacements = new Map();

        for (const item of order.orderItems) {
            if (typeof item.product !== 'number') continue;

            const candidates = (productByKey.get(`${item.name}\u0000${item.price}`) || []).filter(product => {
                const itemUrls = imageUrls(item.images);
                const productUrls = imageUrls(product.images);
                return itemUrls.length === 0 || itemUrls.some(url => productUrls.includes(url));
            });

            if (candidates.length !== 1) {
                throw new Error(
                    `Could not uniquely map order ${order._id} product ${item.product}; ` +
                    `${candidates.length} candidate(s)`
                );
            }

            replacements.set(item.product, candidates[0]._id);
        }

        if (!replacements.size) continue;
        console.log(`  order ${order._id}: ${[...replacements].map(([oldId, newId]) => `${oldId} -> ${newId}`).join(', ')}`);

        if (APPLY) {
            const updatedItems = order.orderItems.map(item => ({
                ...item,
                product: replacements.get(item.product) || item.product,
            }));
            await orders.updateOne({ _id: order._id }, { $set: { orderItems: updatedItems } });
        }
        repaired += replacements.size;
    }

    console.log(`\n${repaired} product reference(s) ${APPLY ? 'repaired' : 'would be repaired'}.`);
    await mongoose.disconnect();
};

run().catch(error => {
    console.error('Reference repair failed:', error);
    process.exit(1);
});
