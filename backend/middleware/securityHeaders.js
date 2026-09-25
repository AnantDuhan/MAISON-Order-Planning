const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');

// Hashes of the inline <script> blocks in the built index.html (e.g. the
// "apply saved theme before paint" snippet), so they can run under a CSP
// without allowing arbitrary inline scripts.
const inlineScriptHashes = () => {
    try {
        const html = fs.readFileSync(path.join(__dirname, '../../frontend/build/index.html'), 'utf8');
        const hashes = [];
        const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = re.exec(html))) {
            if (!match[1].trim()) continue;
            const digest = crypto.createHash('sha256').update(match[1]).digest('base64');
            hashes.push(`'sha256-${digest}'`);
        }
        return hashes;
    } catch {
        return []; // no build (local dev / API-only) — nothing to hash
    }
};

const contentSecurityPolicy = () => ({
    useDefaults: false,
    // Report-only until CSP_ENFORCE=true: violations show up in the browser
    // console without breaking anything. Enforce once the console is clean.
    reportOnly: process.env.CSP_ENFORCE !== 'true',
    directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'", 'https://*.cashfree.com'],
        scriptSrc: [
            "'self'",
            ...inlineScriptHashes(),
            'https://sdk.cashfree.com',
            'https://accounts.google.com',
        ],
        // MUI/Emotion inject <style> tags at runtime, so inline styles are needed.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        // Product images (S3), Google profile pictures, blob previews for uploads.
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https://*.cashfree.com', 'https://accounts.google.com'],
        frameSrc: ["'self'", 'https://*.cashfree.com', 'https://accounts.google.com'],
        workerSrc: ["'self'", 'blob:'],
    },
});

const baseHeaders = helmet({
    contentSecurityPolicy: false, // applied separately below
    // Google sign-in opens a popup that needs to message back to this window.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    // Uploaded images and the API may be loaded from the Netlify frontend.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});

let cspMiddleware;

module.exports = function securityHeaders(req, res, next) {
    baseHeaders(req, res, err => {
        if (err) return next(err);
        // Swagger UI relies on inline scripts; it is a developer tool, so it
        // is left out of the CSP rather than weakening the policy for the app.
        if (req.path.startsWith('/api-docs')) return next();
        cspMiddleware = cspMiddleware || helmet.contentSecurityPolicy(contentSecurityPolicy());
        return cspMiddleware(req, res, next);
    });
};

module.exports.contentSecurityPolicy = contentSecurityPolicy;
