const { rateLimit } = require('express-rate-limit');

const json429 = message => (req, res) =>
    res.status(429).json({ success: false, message });

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: req => req.originalUrl.includes('/health'),
    handler: json429('Too many requests - please slow down and try again shortly.')
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: json429('Too many attempts - please wait a few minutes and try again.')
});

module.exports = { apiLimiter, authLimiter };
