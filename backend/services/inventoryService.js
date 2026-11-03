/**
 * Inventory: checkout holds, stock commits, low-stock and back-in-stock alerts.
 *
 * Product.Stock means "units available to sell". It goes down when a customer
 * starts paying (a hold), and the hold is either consumed by the order or
 * released back. That closes the window where two customers could both pay
 * for the last unit — previously stock only moved when an order shipped.
 *
 *   createCashfreeOrder ──► reserveForCheckout ──► StockHold(active), Stock −n
 *   newOrder            ──► commitForOrder      ──► hold consumed
 *   payment abandoned   ──► releaseExpiredHolds ──► hold released,  Stock +n
 *   refund / cancel     ──► restoreStock        ──► Stock +n
 */
const ejs = require('ejs');
const path = require('path');

const Product = require('../models/product');
const { findVariant, variantLabel, hasVariants, variantPrice, imagesForVariant } = require('../utils/productVariants');
const validator = require('validator');
const StockHold = require('../models/stockHold');
const StockAlert = require('../models/stockAlert');
const User = require('../models/user');
const generateId = require('../utils/generateId');
const cache = require('../utils/cache');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/sendEmail');

const HOLD_MINUTES = Number(process.env.STOCK_HOLD_MINUTES) || 30;
const DEFAULT_LOW_STOCK = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);

class StockError extends Error {
    constructor(message, product) {
        super(message);
        this.statusCode = 409;
        this.product = product;
    }
}

// Merge lines for the same product and variant. `variant` is only present
// for products with options (Size, Colour...).
const normalizeItems = items => {
    const merged = new Map();
    for (const item of items || []) {
        const id = String(item.product);
        const variant = item.variant ? String(item.variant) : null;
        const quantity = Number(item.quantity);
        if (!id || !(quantity > 0)) continue;
        const key = `${id}|${variant || ''}`;
        const line = merged.get(key) || { product: id, ...(variant && { variant }), quantity: 0 };
        line.quantity += quantity;
        merged.set(key, line);
    }
    return [...merged.values()];
};

// One atomic update per line. For a variant, the variant's stock and the
// product's total move together, conditional on the variant having enough.
const takeFilter = item => (item.variant
    ? { _id: item.product, variants: { $elemMatch: { _id: item.variant, Stock: { $gte: item.quantity } } } }
    : { _id: item.product, Stock: { $gte: item.quantity } });

const stockDelta = (item, sign) => (item.variant
    ? { $inc: { 'variants.$.Stock': sign * item.quantity, Stock: sign * item.quantity } }
    : { $inc: { Stock: sign * item.quantity } });

const invalidateProducts = ids => cache.del(...ids.map(id => `product:${id}`)).catch(() => {});

// ---- Raw stock movements ------------------------------------------------------

/**
 * Atomically take stock for every item, or none of them. Each decrement is
 * conditional on enough stock, so concurrent checkouts can never take the
 * same unit twice.
 * @throws {StockError} when any item is short (nothing is left decremented)
 */
const takeStock = async rawItems => {
    const items = normalizeItems(rawItems);
    const taken = [];
    for (const item of items) {
        const result = await Product.updateOne(takeFilter(item), stockDelta(item, -1));
        if (result.modifiedCount === 0) {
            if (taken.length) await giveBack(taken);
            const product = await Product.findById(item.product).select('name Stock options variants').lean();
            const variant = item.variant && product ? findVariant(product, item.variant) : null;
            const left = item.variant ? (variant?.Stock ?? 0) : product?.Stock;
            const label = variant ? ` (${variantLabel(product, variant)})` : '';
            throw new StockError(
                product && (!item.variant || variant)
                    ? `Only ${Math.max(0, left)} left in stock for "${product.name}"${label}`
                    : `Product ${item.product} is no longer available`,
                item.product
            );
        }
        taken.push(item);
    }
    await invalidateProducts(items.map(i => i.product));
    module.exports.checkLowStock(items.map(i => i.product)).catch(error =>
        logger.error({ err: error.message }, 'low-stock check failed'));
    return items;
};

const giveBack = async items => {
    const ops = items.map(item => ({
        updateOne: {
            filter: item.variant ? { _id: item.product, 'variants._id': item.variant } : { _id: item.product },
            update: stockDelta(item, +1),
        },
    }));
    if (ops.length) await Product.bulkWrite(ops, { ordered: false });
};

/**
 * Return stock (refund, cancelled order, released hold) and run the
 * restock side effects: clear low-stock flags, notify back-in-stock waiters.
 */
const restoreStock = async rawItems => {
    const items = normalizeItems(rawItems);
    if (!items.length) return;
    await giveBack(items);
    await invalidateProducts(items.map(i => i.product));
    module.exports.afterStockIncrease(items.map(i => i.product));
};

// ---- Checkout holds -------------------------------------------------------------

/**
 * Called when a customer starts paying. Releases their own earlier unfinished
 * attempts first (so a retry doesn't compete with itself), then holds stock.
 */
const reserveForCheckout = async ({ userId, cashfreeOrderId, items }) => {
    await releaseUserHolds(userId, 'superseded by a new checkout');
    const taken = await takeStock(items);
    try {
        return await StockHold.create({
            _id: generateId(),
            user: String(userId),
            cashfreeOrderId,
            items: taken,
            expiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
        });
    } catch (error) {
        await restoreStock(taken);
        throw error;
    }
};

/**
 * Release one hold, exactly once. The status transition is the lock: only the
 * caller that flips active -> released gives the stock back.
 */
const releaseHold = async (filter, reason) => {
    const hold = await StockHold.findOneAndUpdate(
        { ...filter, status: 'active' },
        { status: 'released', releasedAt: new Date(), releaseReason: reason },
        { returnDocument: 'after' }
    );
    if (hold) {
        await restoreStock(hold.items);
    }
    return hold;
};

/** The hold for a checkout, whatever its state (null if none). */
const getHold = cashfreeOrderId => StockHold.findOne({ cashfreeOrderId }).lean();

const setHoldMember = (cashfreeOrderId, tier) =>
    StockHold.updateOne({ cashfreeOrderId }, { memberFreeShipping: true, memberTier: tier });

const releaseHoldForPayment = (cashfreeOrderId, reason) =>
    releaseHold({ cashfreeOrderId }, reason);

const releaseUserHolds = async (userId, reason) => {
    const holds = await StockHold.find({ user: String(userId), status: 'active' }).select('_id');
    for (const { _id } of holds) await releaseHold({ _id }, reason);
};

const releaseExpiredHolds = async ({ limit = 100 } = {}) => {
    const expired = await StockHold.find({ status: 'active', expiresAt: { $lt: new Date() } })
        .select('_id')
        .limit(limit);
    let released = 0;
    for (const { _id } of expired) {
        if (await releaseHold({ _id }, 'expired')) released += 1;
    }
    return { scanned: expired.length, released };
};

/**
 * Called from newOrder once the payment is verified.
 * @returns {{ committed: boolean, shortfall: boolean, source: string }}
 *   committed — stock for this order has been taken (now or by the hold)
 *   shortfall — the customer paid but stock ran out (hold expired meanwhile)
 */
const commitForOrder = async ({ cashfreeOrderId, orderId, items }) => {
    const hold = await StockHold.findOneAndUpdate(
        { cashfreeOrderId, status: 'active' },
        { status: 'consumed', consumedAt: new Date(), order: orderId },
        { returnDocument: 'after' }
    );
    if (hold) return { committed: true, shortfall: false, source: 'hold' };

    const existing = await StockHold.findOne({ cashfreeOrderId }).select('status').lean();
    if (existing?.status === 'consumed') {
        // A concurrent request for the same payment already committed it.
        return { committed: true, shortfall: false, source: 'already-consumed' };
    }

    // No live hold: payment took longer than the hold, or predates holds.
    // Take stock now if it's still there.
    try {
        await takeStock(items);
        if (existing) {
            await StockHold.updateOne({ cashfreeOrderId }, { order: orderId }).catch(() => {});
        }
        return { committed: true, shortfall: false, source: 'late' };
    } catch (error) {
        if (!(error instanceof StockError)) throw error;
        return { committed: false, shortfall: true, source: 'late', message: error.message };
    }
};

// ---- Alerts -------------------------------------------------------------------------

const thresholdOf = product =>
    product.lowStockThreshold == null ? DEFAULT_LOW_STOCK : product.lowStockThreshold;

const getAdminRecipients = async () => {
    const configured = (process.env.ADMIN_ALERT_EMAILS || '')
        .split(',').map(s => s.trim()).filter(Boolean);
    if (configured.length) return configured;
    const admins = await User.find({ role: 'admin', isDemo: { $ne: true } }).select('email').lean();
    return admins.map(a => a.email).filter(Boolean);
};

/**
 * Email admins once when a product falls to or below its threshold. The
 * conditional update on lowStockAlertedAt makes the alert fire once per dip,
 * even with concurrent checkouts.
 */
const checkLowStock = async productIds => {
    const products = await Product.find({ _id: { $in: productIds } })
        .select('name Stock lowStockThreshold lowStockAlertedAt isDemo').lean();

    const dipped = [];
    for (const product of products) {
        if (product.isDemo || product.Stock > thresholdOf(product)) continue;
        const claimed = await Product.updateOne(
            { _id: product._id, lowStockAlertedAt: null },
            { lowStockAlertedAt: new Date() }
        );
        if (claimed.modifiedCount) dipped.push(product);
    }
    if (!dipped.length) return [];

    const recipients = await getAdminRecipients();
    if (!recipients.length) return dipped;

    const html = await ejs.renderFile(path.join(__dirname, '../mails/low-stock-alert.ejs'), {
        products: dipped.map(p => ({ ...p, threshold: thresholdOf(p) })),
        adminLink: `${process.env.FRONTEND_URL || ''}/admin/inventory`,
    });
    await Promise.all(recipients.map(email => sendEmail({
        email,
        sender: 'noreply',
        subject: dipped.length === 1
            ? `Low stock: ${dipped[0].name} (${dipped[0].Stock} left)`
            : `Low stock on ${dipped.length} products`,
        html,
    }).catch(error => logger.error({ err: error.message }, 'low-stock email failed'))));
    return dipped;
};

/**
 * Notify everyone waiting on products that are back in stock. Each request is
 * claimed (notifiedAt set) before its email goes out, so concurrent runs can't
 * email the same person twice.
 */
/** Is there stock for this request: its variant, or the product as a whole. */
const restockedFor = (product, variantId) => {
    if (!variantId) return product.Stock > 0;
    const variant = findVariant(product, variantId);
    return Boolean(variant) && variant.active !== false && variant.Stock > 0;
};

// Plus members get restock emails this long before everyone else.
const MEMBER_HEAD_START_MS = 6 * 60 * 60 * 1000;

/**
 * Email people waiting for these products, now that they're in stock.
 * Plus members are emailed straight away; everyone else (Essential included) is
 * scheduled MEMBER_HEAD_START_MS later and emailed by a later call (the
 * /jobs/back-in-stock job, or the next restock), if it's still in stock.
 */
const notifyBackInStock = async (productIds, { now = new Date() } = {}) => {
    // Switched off in admin Features: keep requests until it's turned back on.
    if (!(await require('./featureFlags').isEnabled('backInStock'))) return 0;
    const Subscription = require('../models/plusMembership');
    const products = await Product.find({ _id: { $in: productIds }, Stock: { $gt: 0 } })
        .select('name price images Stock options variants').lean();
    let sent = 0;
    for (const product of products) {
        const pending = await StockAlert.find({ product: product._id, notifiedAt: null }).limit(500);
        // Only requests whose variant (or, without one, the product) has stock.
        const ready = pending.filter(alert => restockedFor(product, alert.variant));
        if (!ready.length) continue;
        const userIds = ready.map(a => a.user).filter(Boolean).map(String);
        const members = new Set(userIds.length ? (await Subscription.distinct('user', {
            user: { $in: userIds }, isActive: true, status: 'ACTIVE',
            // Older memberships have no tier and are Plus.
            tier: { $ne: 'essential' },
        })).map(String) : []);

        for (const alert of ready) {
            // Guests (no account) are never members.
            const isMember = Boolean(alert.user) && members.has(String(alert.user));
            if (!isMember) {
                if (!alert.notifyAfter) {
                    await StockAlert.updateOne({ _id: alert._id, notifyAfter: null }, { notifyAfter: new Date(now.getTime() + MEMBER_HEAD_START_MS) });
                    continue;
                }
                if (new Date(alert.notifyAfter) > now) continue;
            }
            const claimed = await StockAlert.updateOne(
                { _id: alert._id, notifiedAt: null },
                { notifiedAt: new Date() }
            );
            if (!claimed.modifiedCount) continue;
            try {
                const variant = alert.variant ? findVariant(product, alert.variant) : null;
                const label = variant ? variantLabel(product, variant) : '';
                const images = variant ? imagesForVariant(product, variant) : product.images || [];
                const html = await ejs.renderFile(path.join(__dirname, '../mails/back-in-stock.ejs'), {
                    product: { ...product, images, price: variant ? variantPrice(product, variant) : product.price },
                    variantLabel: label,
                    productLink: `${process.env.FRONTEND_URL || ''}/product/${product._id}${variant ? `?variant=${encodeURIComponent(variant._id)}` : ''}`,
                });
                await sendEmail({
                    email: alert.email,
                    sender: 'noreply',
                    subject: `Back in stock: ${product.name}${label ? ` (${label})` : ''}`,
                    html,
                });
                sent += 1;
            } catch (error) {
                // Put the request back so the next restock tries again.
                await StockAlert.updateOne({ _id: alert._id }, { notifiedAt: null }).catch(() => {});
                logger.error({ err: error.message, product: product._id }, 'back-in-stock email failed');
            }
        }
    }
    return sent;
};

/** Send restock emails whose member head start is over (scheduled job). */
const sendDueRestockAlerts = async ({ now = new Date() } = {}) => {
    const productIds = await StockAlert.distinct('product', { notifiedAt: null, notifyAfter: { $ne: null, $lte: now } });
    return productIds.length ? module.exports.notifyBackInStock(productIds, { now }) : 0;
};

/**
 * Side effects of stock going up: reset low-stock flags above threshold, and
 * tell waiting customers. Fire-and-forget; never blocks the caller.
 */
const afterStockIncrease = productIds => {
    setImmediate(async () => {
        try {
            const products = await Product.find({ _id: { $in: productIds }, lowStockAlertedAt: { $ne: null } })
                .select('Stock lowStockThreshold').lean();
            for (const product of products) {
                if (product.Stock > thresholdOf(product)) {
                    await Product.updateOne({ _id: product._id }, { lowStockAlertedAt: null });
                }
            }
            await notifyBackInStock(productIds);
        } catch (error) {
            logger.error({ err: error.message }, 'restock side effects failed');
        }
    });
};

/** Hook for admin edits of Stock (product update endpoints). */
const onStockEdited = (productId, before, after) => {
    if (after > before) module.exports.afterStockIncrease([productId]);
    else if (after < before) {
        module.exports.checkLowStock([productId]).catch(error =>
            logger.error({ err: error.message }, 'low-stock check failed'));
    }
};

// ---- Back-in-stock requests ------------------------------------------------------

const cleanEmail = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** Requests that belong to this shopper: by account, or by the account's email. */
const ownedBy = user => ({ $or: [{ user: String(user._id) }, { email: cleanEmail(user.email) }] });

/**
 * Ask to be emailed when a product (or one variant of it) is back.
 * Signed-in shoppers pass `user`; guests pass `email`.
 * @returns {{status: 'subscribed'|'in-stock'|'not-found'|'choose-variant'|'invalid-email'}}
 */
const requestBackInStock = async ({ productId, variantId = null, user = null, email = null }) => {
    const product = await Product.findById(productId).select('Stock options variants').lean();
    if (!product) return { status: 'not-found' };

    let variant = null;
    if (hasVariants(product)) {
        if (!variantId) return { status: 'choose-variant' };
        variant = findVariant(product, variantId);
        if (!variant || variant.active === false) return { status: 'not-found' };
        if (variant.Stock > 0) return { status: 'in-stock' };
    } else if (product.Stock > 0) {
        return { status: 'in-stock' };
    }

    const address = cleanEmail(user ? user.email : email);
    if (!address || !validator.isEmail(address)) return { status: 'invalid-email' };

    try {
        await StockAlert.create({
            _id: generateId(),
            product: String(productId),
            variant: variant ? String(variant._id) : null,
            user: user ? String(user._id) : null,
            email: address,
        });
    } catch (error) {
        if (error.code !== 11000) throw error; // already waiting: fine
        // A guest request for this address becomes theirs once they sign in.
        if (user) {
            await StockAlert.updateOne(
                { product: String(productId), variant: variant ? String(variant._id) : null, email: address, notifiedAt: null, user: null },
                { user: String(user._id) }
            );
        }
    }
    return { status: 'subscribed' };
};

const cancelBackInStock = ({ productId, variantId = null, user }) =>
    StockAlert.deleteOne({ product: String(productId), variant: variantId ? String(variantId) : null, notifiedAt: null, ...ownedBy(user) });

/** What this shopper is waiting for on one product: the whole product and/or variant ids. */
const waitingFor = async ({ productId, user }) => {
    const pending = await StockAlert.find({ product: String(productId), notifiedAt: null, ...ownedBy(user) })
        .select('variant').lean();
    return {
        product: pending.some(a => !a.variant),
        variants: pending.filter(a => a.variant).map(a => String(a.variant)),
    };
};

const isWaitingFor = async ({ productId, variantId = null, user }) => {
    const { product, variants } = await waitingFor({ productId, user });
    return variantId ? variants.includes(String(variantId)) : product;
};

// ---- Admin report -----------------------------------------------------------------

const inventoryReport = async ({ includeDemo = false } = {}) => {
    const productFilter = includeDemo ? {} : { isDemo: { $ne: true } };
    const products = await Product.find(productFilter)
        .select('name Stock price category lowStockThreshold lowStockAlertedAt images options variants')
        .lean();

    const [holds, waiting, waitingVariants] = await Promise.all([
        StockHold.aggregate([
            { $match: { status: 'active' } },
            { $unwind: '$items' },
            { $group: { _id: '$items.product', held: { $sum: '$items.quantity' }, holds: { $sum: 1 } } },
        ]),
        StockAlert.aggregate([
            { $match: { notifiedAt: null } },
            { $group: { _id: '$product', waiting: { $sum: 1 } } },
        ]),
        StockAlert.aggregate([
            { $match: { notifiedAt: null, variant: { $ne: null } } },
            { $group: { _id: { product: '$product', variant: '$variant' }, waiting: { $sum: 1 } } },
        ]),
    ]);
    const variantsWaitingBy = new Map();
    for (const row of waitingVariants) {
        const key = String(row._id.product);
        if (!variantsWaitingBy.has(key)) variantsWaitingBy.set(key, []);
        variantsWaitingBy.get(key).push({ variant: String(row._id.variant), waiting: row.waiting });
    }
    const heldBy = new Map(holds.map(h => [String(h._id), h]));
    const waitingBy = new Map(waiting.map(w => [String(w._id), w.waiting]));

    const rows = products.map(p => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        image: p.images?.[0]?.url,
        stock: p.Stock,
        threshold: thresholdOf(p),
        heldInCheckout: heldBy.get(String(p._id))?.held || 0,
        waitingForRestock: waitingBy.get(String(p._id)) || 0,
        // Which options people are waiting for, most wanted first.
        waitingByVariant: (variantsWaitingBy.get(String(p._id)) || [])
            .map(({ variant, waiting: count }) => {
                const v = findVariant(p, variant);
                return { variant, label: v ? variantLabel(p, v) : 'Removed option', stock: v?.Stock ?? 0, waiting: count };
            })
            .sort((a, b) => b.waiting - a.waiting),
        status: p.Stock <= 0 ? 'out' : p.Stock <= thresholdOf(p) ? 'low' : 'ok',
    }));

    const order = { out: 0, low: 1, ok: 2 };
    rows.sort((a, b) => order[a.status] - order[b.status]
        || b.waitingForRestock - a.waitingForRestock
        || a.stock - b.stock);

    return {
        summary: {
            products: rows.length,
            outOfStock: rows.filter(r => r.status === 'out').length,
            lowStock: rows.filter(r => r.status === 'low').length,
            unitsInCheckout: rows.reduce((n, r) => n + r.heldInCheckout, 0),
            customersWaiting: rows.reduce((n, r) => n + r.waitingForRestock, 0),
        },
        products: rows,
    };
};

// Internal calls to checkLowStock/afterStockIncrease go through module.exports
// so tests can stub the side effects.
module.exports = {
    StockError,
    HOLD_MINUTES,
    takeStock,
    restoreStock,
    reserveForCheckout,
    releaseHoldForPayment,
    releaseUserHolds,
    releaseExpiredHolds,
    commitForOrder,
    getHold,
    setHoldMember,
    checkLowStock,
    notifyBackInStock,
    sendDueRestockAlerts,
    MEMBER_HEAD_START_MS,
    afterStockIncrease,
    onStockEdited,
    requestBackInStock,
    cancelBackInStock,
    isWaitingFor,
    waitingFor,
    restockedFor,
    inventoryReport,
    thresholdOf,
};
