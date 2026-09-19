const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const IORedis = require('ioredis');

const json429 = message => (req, res) =>
    res.status(429).json({ success: false, message });

// One shared ioredis CLIENT is fine; what must not be shared is the RedisStore
// wrapper. So we make a factory that returns a new store (with a unique prefix)
// per limiter. Falls back to the in-memory store when REDIS_UPSTASH_URL is unset.
let makeStore = () => undefined;

if (process.env.REDIS_UPSTASH_URL) {
    const client = new IORedis(process.env.REDIS_UPSTASH_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
    client.on('error', err => console.error('Rate-limit Redis error:', err.message));

    makeStore = prefix =>
        new RedisStore({
            sendCommand: (...args) => client.call(...args),
            prefix,
        });
    console.info('Rate limiter: using shared Redis store');
} else {
    console.info('Rate limiter: using in-memory store (single instance)');
}

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: req => req.originalUrl.includes('/health'),
    handler: json429('Too many requests - please slow down and try again shortly.'),
    store: makeStore('rl:api:'),
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: json429('Too many attempts - please wait a few minutes and try again.'),
    store: makeStore('rl:auth:'),
});

module.exports = { apiLimiter, authLimiter };