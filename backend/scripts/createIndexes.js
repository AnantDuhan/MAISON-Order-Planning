/**
 * Create the indexes this app queries on.
 *
 *   products : compound { category: 1, price: 1, ratings: 1 }  — filter+sort on the listing page
 *              text index on { name, description }             — search
 *   orders   : compound { user: 1, createdAt: -1 }             — "my orders", newest first
 *
 * createIndex is idempotent: re-running only creates what is missing and
 * leaves existing indexes untouched, so this is safe to run on every deploy.
 *
 * USAGE
 *   node backend/scripts/createIndexes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config/config.env') });
dotenv.config({ path: path.join(__dirname, '../config/.env') });

const Product = require('../models/product');
const Order = require('../models/order');

const run = async () => {
    const uri = process.env.DB_HOSTED_URI;
    if (!uri) {
        console.error('No DB_HOSTED_URI found in env. Aborting.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected. Creating indexes…\n');

    const products = Product.collection;
    const orders = Order.collection;

    const created = [];

    created.push(
        await products.createIndex(
            { category: 1, price: 1, ratings: 1 },
            { name: 'category_price_ratings' }
        )
    );

    created.push(
        await products.createIndex(
            { name: 'text', description: 'text' },
            { name: 'product_text' }
        )
    );

    created.push(
        await orders.createIndex(
            { user: 1, createdAt: -1 },
            { name: 'user_createdAt' }
        )
    );

    console.log('Ensured indexes:');
    created.forEach(name => console.log(`  ✓ ${name}`));

    console.log('\nCurrent products indexes:');
    console.log((await products.indexes()).map(i => `  ${i.name}: ${JSON.stringify(i.key)}`).join('\n'));
    console.log('\nCurrent orders indexes:');
    console.log((await orders.indexes()).map(i => `  ${i.name}: ${JSON.stringify(i.key)}`).join('\n'));

    await mongoose.disconnect();
    console.log('\nDone.');
};

run().catch(err => {
    console.error('Index creation failed:', err);
    process.exit(1);
});
