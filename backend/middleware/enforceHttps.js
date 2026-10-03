/**
 * Redirect plain-HTTP requests to HTTPS in production. Render/Netlify
 * terminate TLS at their proxy and pass the original scheme in
 * X-Forwarded-Proto (app.set('trust proxy', 1) makes req.secure honour it).
 * HSTS (from helmet) then keeps browsers on HTTPS after the first visit.
 */
module.exports = function enforceHttps(req, res, next) {
    if (process.env.NODE_ENV !== 'production') return next();
    // Health checks from the platform may come in over plain HTTP internally.
    if (req.path === '/api/v1/health') return next();
    if (req.secure) return next();
    return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
};
