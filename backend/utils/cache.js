const redis = require('../config/redisClientUpstash');

// Redis-backed cache shared across ALL instances, replacing per-process
// NodeCache (whose deletes never reached other instances under horizontal
// scaling). Every call is wrapped so a Redis hiccup degrades to a cache miss
// instead of breaking the request. TTLs make a missed invalidation self-heal.
//
// Works with both client flavors config/redisClientUpstash may export:
//   - node-redis (REDIS_URL): get() -> string, set(key, val, { EX })
//   - @upstash/redis (REST):  get() -> parsed value, set(key, val, { ex })
// so setJSON passes both EX and ex, and getJSON parses only when it got a string.

const DEFAULT_TTL = 300; // seconds

async function getJSON(key) {
    try {
        const raw = await redis.get(key);
        if (raw === null || raw === undefined) return null;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
        console.error(`cache.getJSON(${key}) failed:`, err.message);
        return null; // treat as a miss
    }
}

async function setJSON(key, value, ttl = DEFAULT_TTL) {
    try {
        await redis.set(key, JSON.stringify(value), { EX: ttl, ex: ttl });
    } catch (err) {
        console.error(`cache.setJSON(${key}) failed:`, err.message);
    }
}

async function del(...keys) {
    const flat = keys.filter(Boolean);
    try {
        await Promise.all(flat.map(k => redis.del(k)));
    } catch (err) {
        console.error(`cache.del(${flat.join(',')}) failed:`, err.message);
    }
}

module.exports = { getJSON, setJSON, del, DEFAULT_TTL };
