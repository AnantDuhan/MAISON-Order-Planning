const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/*
 * Who is on the other end of a live-update socket.
 *
 * The site and the API are on different hosts in production
 * (maisonorderplanning.in and api.maisonorderplanning.in). The session cookie
 * belongs to the site, and Netlify can't forward socket connections, so the
 * socket goes straight to the API without that cookie. Instead, the page asks
 * the API (through the site, with the cookie) for a short-lived socket token
 * and hands it over when the socket connects.
 *
 * The token is signed with a key derived from JWT_SECRET_KEY, not the key
 * itself, so it can never be replayed as a session cookie; it only lets the
 * socket join rooms the user may see (their orders; admins, all orders).
 */
const TTL = '5m';
const secret = () => crypto.createHmac('sha256', String(process.env.JWT_SECRET_KEY || '')).update('socket-token').digest('hex');

const issueSocketToken = (user, auth = {}) =>
    jwt.sign({ id: String(user._id), mfa: Boolean(auth.mfaVerified) }, secret(), { expiresIn: TTL });

/** { id, mfa } for a valid token, otherwise null. */
const readSocketToken = token => {
    if (typeof token !== 'string' || !token) return null;
    try {
        const decoded = jwt.verify(token, secret());
        return decoded?.id ? { id: decoded.id, mfa: Boolean(decoded.mfa), iat: decoded.iat } : null;
    } catch {
        return null;
    }
};

module.exports = { issueSocketToken, readSocketToken };
