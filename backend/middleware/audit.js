/**
 * Admin audit trail.
 *
 * Mounted in front of every admin route. For each successful write
 * (POST/PUT/PATCH/DELETE answered < 400) it records who did what to which
 * record, with the request body (secrets redacted). Controllers can add the
 * precise before/after of what changed:
 *
 *   res.locals.audit = { before: { orderStatus: 'Processing' }, after: { orderStatus: 'Shipped' } }
 *
 * Recording never blocks or fails the request.
 */
const AuditLog = require('../models/auditLog');
const generateId = require('../utils/generateId');
const logger = require('../config/logger');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SECRET_KEY = /pass(word)?|token|secret|otp|code|card|cvv|pin$|authorization/i;
const MAX_STRING = 500;

// Readable names for known routes; anything else is "<method> <path>".
const ACTIONS = {
    'PUT /api/v1/admin/order/:id': 'order.status',
    'DELETE /api/v1/admin/order/:id': 'order.delete',
    'POST /api/v1/admin/order/:id/tracking': 'shipment.event',
    'PATCH /api/v1/admin/order/:id/shipment': 'shipment.update',
    'POST /api/v1/admin/order/:id/refund': 'refund.initiate',
    'PATCH /api/v1/admin/order/:orderId/refund/:refundId/status': 'refund.status',
    'PATCH /api/v1/admin/return/:id/status': 'return.status',
    'PUT /api/v1/admin/update/product/:id': 'product.update',
    'POST /admin/add-product': 'product.create',
    'PUT /admin/product/:id': 'product.update',
    'DELETE /admin/product/:id': 'product.delete',
    'PUT /api/v1/admin/user/:id': 'user.update',
    'DELETE /api/v1/admin/user/:id': 'user.delete',
    'POST /api/v1/coupon': 'coupon.create',
    'POST /api/v1/admin/banner': 'banner.create',
    'PUT /api/v1/admin/banner/:id': 'banner.update',
    'DELETE /api/v1/admin/banner/:id': 'banner.delete',
    'POST /api/v1/admin/wallet/:userId/adjust': 'wallet.adjust',
};

const ENTITY_FROM_PATH = /\/(order|product|user|return|banner|coupon|wallet|refund)s?\/(?::[a-zA-Z]+)/;

const redact = (value, depth = 0) => {
    if (value == null || depth > 4) return value;
    if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    if (Array.isArray(value)) return value.slice(0, 25).map(v => redact(v, depth + 1));
    if (typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = SECRET_KEY.test(k) ? '[redacted]' : redact(v, depth + 1);
        }
        return out;
    }
    return value;
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Field-level diff of two plain objects (only keys present in either). */
const diff = (before = {}, after = {}) => {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const changes = [];
    for (const field of keys) {
        const from = before?.[field];
        const to = after?.[field];
        if (!same(from, to)) changes.push({ field, from: redact(from), to: redact(to) });
    }
    return changes;
};

const routePattern = req => {
    if (!req.route?.path) return req.originalUrl.split('?')[0];
    return `${req.baseUrl || ''}${req.route.path}`;
};

const entityFor = (req, pattern, extra) => {
    if (extra?.entity) return extra.entity;
    const match = ENTITY_FROM_PATH.exec(pattern);
    if (!match) return undefined;
    const type = match[1];
    const id = req.params.id || req.params.orderId || req.params.userId || req.params[Object.keys(req.params)[0]];
    return { type, id: id && String(id) };
};

const record = async (req, res) => {
    const pattern = routePattern(req);
    const key = `${req.method} ${pattern}`;
    const extra = res.locals.audit || {};
    const user = req.user || {};

    await AuditLog.create({
        _id: generateId(),
        at: new Date(),
        actor: { id: user._id && String(user._id), name: user.name, email: user.email, role: user.role },
        action: extra.action || ACTIONS[key] || key,
        method: req.method,
        path: pattern,
        entity: entityFor(req, pattern, extra),
        summary: extra.summary,
        changes: diff(extra.before, extra.after),
        request: req.is('multipart/form-data') ? redact({ ...req.body, files: req.files?.length || 0 }) : redact(req.body),
        status: res.statusCode,
        ip: req.ip,
        userAgent: String(req.get('user-agent') || '').slice(0, 200),
        isDemo: Boolean(user.isDemo),
    });
};

const auditAdminWrites = (req, res, next) => {
    if (!WRITE_METHODS.has(req.method)) return next();
    res.on('finish', () => {
        if (res.statusCode >= 400 || !req.user) return;
        record(req, res).catch(error =>
            logger.error({ err: error.message, path: req.originalUrl }, 'audit log write failed'));
    });
    next();
};

/**
 * For routes outside /admin that are still admin actions (e.g. POST /coupon).
 * Only records when the caller is an admin.
 */
const auditIfAdmin = (req, res, next) => {
    if (!WRITE_METHODS.has(req.method)) return next();
    res.on('finish', () => {
        if (res.statusCode >= 400 || req.user?.role !== 'admin') return;
        record(req, res).catch(error =>
            logger.error({ err: error.message, path: req.originalUrl }, 'audit log write failed'));
    });
    next();
};

/** Pick a few fields off a document as a plain object, for before/after. */
const snapshot = (doc, fields) => {
    if (!doc) return undefined;
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return Object.fromEntries(fields.map(f => [f, plain[f]]));
};

module.exports = { auditAdminWrites, auditIfAdmin, diff, redact, snapshot, ACTIONS };
