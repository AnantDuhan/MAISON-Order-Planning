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

// Endpoints that send an email to an arbitrary address (contact form,
// newsletter, verification resend). Separate counter so they can't be used
// to burn through the login budget, or to spam inboxes.
const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: json429('Too many requests - please try again later.'),
    store: makeStore('rl:email:'),
});

// Authenticated account changes (password, 2FA) and the demo login.
const accountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: json429('Too many attempts - please wait a few minutes and try again.'),
    store: makeStore('rl:account:'),
});

module.exports = { apiLimiter, authLimiter, emailLimiter, accountLimiter };