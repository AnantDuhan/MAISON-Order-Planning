/**
 * Run after replacing or bulk-editing the products collection directly in
 * MongoDB (Atlas, Compass, mongosh). Those edits skip the app, so nothing
 * clears the copies the storefront reads from:
 *   1. Redis: product lists (products:list:*) and product pages (product:*)
 *   2. Elasticsearch: the "products" search index
 *
 * Usage (from backend/):  node scripts/resetProductCaches.js
 * Add --cache-only to skip Elasticsearch.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env'), quiet: true });

const PATTERNS = ['products:list:*', 'product:*'];

async function clearRedis() {
    let deleted = 0;
    if (process.env.REDIS_UPSTASH_URL) {
        const { createClient } = require('redis');
        const client = createClient({ url: process.env.REDIS_UPSTASH_URL });
        await client.connect();
        for (const match of PATTERNS) {
            for await (const batch of client.scanIterator({ MATCH: match, COUNT: 500 })) {
                const keys = [].concat(batch);
                if (keys.length) deleted += await client.del(keys);
            }
        }
        await client.quit();
    } else {
        const { Redis } = require('@upstash/redis');
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        for (const match of PATTERNS) {
            let cursor = '0';
            do {
                const [next, keys] = await redis.scan(cursor, { match, count: 500 });
                if (keys.length) deleted += await redis.del(...keys);
                cursor = String(next);
            } while (cursor !== '0');
        }
    }
    console.log(`Redis: deleted ${deleted} cached product keys`);
}

async function rebuildSearchIndex() {
    const esClient = require('../config/elasticsearch');
    const { bulkReindex } = require('../services/searchService');
    // Reindexing alone only adds/updates; deleted products would stay
    // searchable. Drop the index so it's rebuilt from the collection as it is now.
    await esClient.indices.delete({ index: 'products', ignore_unavailable: true });
    await mongoose.connect(process.env.DB_HOSTED_URI);
    const { indexed } = await bulkReindex();
    console.log(`Elasticsearch: rebuilt "products" index with ${indexed} products`);
    await mongoose.disconnect();
}

(async () => {
    try {
        await clearRedis();
        if (!process.argv.includes('--cache-only')) await rebuildSearchIndex();
        process.exit(0);
    } catch (error) {
        console.error('Reset failed:', error.name, error.message || '');
        if (error.errors) error.errors.forEach(e => console.error('  -', e.message));
        if (error.meta?.body) console.error('  ES says:', JSON.stringify(error.meta.body.error || error.meta.body));
        process.exit(1);
    }
})();
