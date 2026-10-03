/**
 * Invoice authenticity.
 *
 * - contentHash: SHA-256 over a canonical form of everything that was billed.
 *   Stored at issue time; recomputed on verification, so a row edited directly
 *   in the database no longer matches.
 * - verify token: HMAC-SHA256(INVOICE_SIGNING_SECRET, id + contentHash).
 *   Printed (as a URL + QR) on the invoice. Only the server can mint a valid
 *   token, and invoice ids can't be enumerated through the public verify page.
 *
 * A PDF can always be edited; what can't be faked is the record the verify
 * page shows. That is the source of truth for "is this invoice genuine?".
 *
 * Required env: INVOICE_SIGNING_SECRET (32+ random chars). Rotating it
 * invalidates every printed QR code, so treat it like JWT_SECRET_KEY.
 */
const crypto = require('crypto');

const MIN_SECRET_LENGTH = 32;

const getSecret = () => {
    const secret = process.env.INVOICE_SIGNING_SECRET;
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
        const error = new Error(
            `INVOICE_SIGNING_SECRET must be set (at least ${MIN_SECRET_LENGTH} characters)`
        );
        error.code = 'INVOICE_SIGNING_SECRET_MISSING';
        throw error;
    }
    return secret;
};

const isSigningConfigured = () => {
    try {
        getSecret();
        return true;
    } catch {
        return false;
    }
};

const money = n => Number(n || 0).toFixed(2);

// Fixed field order, fixed number format, ISO date. Never reorder or rename
// these — doing so changes every hash. New fields are appended under a new
// version; each invoice stores the version it was hashed with (hashVersion),
// so older invoices keep verifying exactly as issued.
//   v1: billed content
//   v2: + credit-note link, refund method, store credit applied
const HASH_VERSION = 2;
const canonicalize = invoice => {
    const version = invoice.hashVersion || 1;
    const fields = [
    version,
    invoice.invoiceNumber,
    invoice.type,
    String(invoice.sourceId),
    String(invoice.user?._id || invoice.user),
    invoice.billedTo?.name || '',
    invoice.billedTo?.email || '',
    (invoice.lines || []).map(line => [
        line.description,
        Number(line.quantity),
        money(line.unitPrice),
        money(line.amount),
    ]),
    money(invoice.subtotal),
    money(invoice.shipping),
    money(invoice.discount),
    money(invoice.tax),
    money(invoice.total),
    invoice.currency || 'INR',
    invoice.paymentRef || '',
    new Date(invoice.issuedAt).toISOString(),
    ];
    if (version >= 2) {
        fields.push(
            invoice.creditNoteFor || '',
            invoice.creditNoteForNumber || '',
            invoice.refundMethod || '',
            money(invoice.storeCreditApplied),
        );
    }
    return JSON.stringify(fields);
};

const computeContentHash = invoice =>
    crypto.createHash('sha256').update(canonicalize(invoice)).digest('hex');

// Short human-readable form printed on the invoice: "3F2A 91C0 7B4E 5D16".
const fingerprint = invoice =>
    (invoice.contentHash || '').slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join(' ') || '';

const computeVerifyToken = invoice =>
    crypto.createHmac('sha256', getSecret())
        .update(`${invoice._id}.${invoice.contentHash}`)
        .digest('base64url')
        .slice(0, 22); // 132 bits

const tokenMatches = (invoice, token) => {
    if (typeof token !== 'string' || !invoice?.contentHash) return false;
    const expected = Buffer.from(computeVerifyToken(invoice));
    const given = Buffer.from(token);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

const verifyRef = invoice => `${invoice._id}.${computeVerifyToken(invoice)}`;

const verifyUrl = invoice => {
    const base = (process.env.FRONTEND_URL || 'https://maisonorderplanning.in').replace(/\/+$/, '');
    return `${base}/verify/${verifyRef(invoice)}`;
};

// Per-invoice owner password for PDF permissions (stops casual editing in PDF
// tools; not a security boundary on its own).
const pdfOwnerPassword = invoice =>
    crypto.createHmac('sha256', getSecret()).update(`pdf-owner.${invoice._id}`).digest('hex');

module.exports = {
    HASH_VERSION,
    canonicalize,
    computeContentHash,
    fingerprint,
    computeVerifyToken,
    tokenMatches,
    verifyRef,
    verifyUrl,
    pdfOwnerPassword,
    isSigningConfigured,
};
