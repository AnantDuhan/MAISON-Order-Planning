/**
 * Run after replacing or bulk-editing the products collection directly in
 * MongoDB (Atlas, Compass, mongosh). Those edits skip the app, so nothing
 * clears the copies the storefront reads from Redis: product lists
 * (products:list:*) and product pages (product:*).
 *
 * Usage (from backend/):  node scripts/resetProductCaches.js
 */
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

(async () => {
    try {
        await clearRedis();
        process.exit(0);
    } catch (error) {
        console.error('Reset failed:', error.name, error.message || '');
        if (error.errors) error.errors.forEach(e => console.error('  -', e.message));
        process.exit(1);
    }
})();
