/**
 * Feature switches the admin can turn on and off at /admin/features.
 *
 * Every switch is enforced on the server (requireFeature / isEnabled), not
 * just hidden in the UI, so turning a feature off also blocks the API.
 *
 * To add one: add an entry to FEATURES, gate the endpoint with
 * requireFeature('<key>'), and hide the UI with useFeature('<key>').
 */
const mongoose = require('mongoose');
const FeatureFlag = require('../models/featureFlag');
const cache = require('../utils/cache');
const logger = require('../config/logger');

const FEATURES = [
    // Site
    {
        key: 'storefront', group: 'Site', label: 'Storefront', default: true, critical: true,
        description: 'The shop is open to customers. Turn off to show the maintenance page to everyone except signed-in admins. Payments already in progress still complete, and scheduled jobs keep running.',
        offMessage: 'Maison is closed for maintenance. Please check back shortly.',
    },
    // Checkout
    {
        key: 'checkout', group: 'Checkout', label: 'Accept new orders', default: true, critical: true,
        description: 'Customers can start checkout and pay. Turn off to pause the shop, for example during a stock count. Payments already in progress still complete.',
        offMessage: 'We’re not taking new orders right now. Please check back soon.',
    },
    {
        key: 'coupons', group: 'Checkout', label: 'Coupons', default: true,
        description: 'Customers can apply coupon codes at checkout.',
        offMessage: 'Coupons can’t be used right now.',
    },
    {
        key: 'storeCredit', group: 'Checkout', label: 'Store credit', default: true,
        description: 'Customers can pay with store credit, and refunds can be issued as store credit. Existing balances are kept.',
        offMessage: 'Store credit can’t be used right now.',
    },
    // After purchase
    {
        key: 'returns', group: 'After purchase', label: 'Return requests', default: true,
        description: 'Customers can request a return on delivered orders. Requests already made are unaffected.',
        offMessage: 'Return requests are paused right now. Please contact us about this order.',
    },
    // Shopping
    {
        key: 'reviews', group: 'Shopping', label: 'Product reviews', default: true,
        description: 'Customers can write reviews. Existing reviews stay visible.',
        offMessage: 'Reviews are closed right now.',
    },
    {
        key: 'backInStock', group: 'Shopping', label: 'Back-in-stock alerts', default: true,
        description: '“Notify me when it’s back” on sold-out products, and the emails when they’re restocked.',
        offMessage: 'Back-in-stock alerts are unavailable right now.',
    },
    // Sign-in
    {
        key: 'googleLogin', group: 'Sign-in', label: 'Sign in with Google', default: true,
        description: 'The Google button on the sign-in page.',
        offMessage: 'Sign in with Google is unavailable right now. Please use another method.',
    },
    {
        key: 'passwordlessLogin', group: 'Sign-in', label: 'Email & phone codes', default: true,
        description: 'Signing in with a one-time code by email or SMS, and email magic links.',
        offMessage: 'Sign-in codes are unavailable right now. Please use another method.',
    },
    {
        key: 'passkeys', group: 'Sign-in', label: 'Passkeys', default: true,
        description: 'Signing in and adding new passkeys. Password sign-in is always available.',
        offMessage: 'Passkeys are unavailable right now. Please use another method.',
    },
    // Membership & marketing
    {
        key: 'memberships', group: 'Membership & marketing', label: 'New memberships', default: true,
        description: 'Customers can start a membership. Existing members keep their benefits and can still cancel.',
        offMessage: 'New memberships are paused right now.',
    },
    {
        key: 'cartReminders', group: 'Membership & marketing', label: 'Abandoned-cart emails', default: true,
        description: 'Reminder emails 24 and 72 hours after a signed-in customer leaves items in their bag.',
        offMessage: 'Cart reminders are paused.',
    },
    {
        key: 'newsletter', group: 'Membership & marketing', label: 'Newsletter sign-up', default: true,
        description: 'The newsletter sign-up form. Existing subscribers still receive it.',
        offMessage: 'Newsletter sign-up is closed right now.',
    },
];

const BY_KEY = new Map(FEATURES.map(f => [f.key, f]));
const CACHE_KEY = 'feature-flags';
const LOCAL_TTL_MS = 15 * 1000;

let local = null; // { values, at }

const defaults = () => Object.fromEntries(FEATURES.map(f => [f.key, f.default]));

/**
 * Current on/off value for every feature. Cached in this process for 15s and
 * in the shared cache, so a toggle reaches every server instance quickly.
 * If the database can't be read, defaults are used rather than failing.
 */
const getAll = async () => {
    if (local && Date.now() - local.at < LOCAL_TTL_MS) return local.values;

    let values = await cache.getJSON(CACHE_KEY).catch(() => null);
    if (!values) {
        values = defaults();
        // Not connected yet (startup): use defaults now, read the database next time.
        if (mongoose.connection.readyState !== 1 && !module.exports._allowDisconnectedReads) return values;
        try {
            const docs = await FeatureFlag.find({ _id: { $in: [...BY_KEY.keys()] } }).lean();
            for (const doc of docs) values[doc._id] = Boolean(doc.enabled);
            await cache.setJSON(CACHE_KEY, values, 300).catch(() => {});
        } catch (error) {
            logger.error({ err: error.message }, 'feature flags: falling back to defaults');
        }
    }
    local = { values, at: Date.now() };
    return values;
};

const isEnabled = async key => {
    if (!BY_KEY.has(key)) throw new Error(`Unknown feature "${key}"`);
    const values = await getAll();
    return values[key] !== false;
};

/** Admin view: every feature with its metadata, value and last change. */
const listForAdmin = async () => {
    const [values, docs] = await Promise.all([
        getAll(),
        FeatureFlag.find({ _id: { $in: [...BY_KEY.keys()] } }).lean().catch(() => []),
    ]);
    const meta = new Map(docs.map(d => [d._id, d]));
    return FEATURES.map(f => ({
        key: f.key,
        group: f.group,
        label: f.label,
        description: f.description,
        critical: Boolean(f.critical),
        default: f.default,
        enabled: values[f.key] !== false,
        updatedAt: meta.get(f.key)?.updatedAt || null,
        updatedBy: meta.get(f.key)?.updatedBy?.name || null,
    }));
};

const setEnabled = async (key, enabled, actor) => {
    if (!BY_KEY.has(key)) {
        const error = new Error(`Unknown feature "${key}"`);
        error.statusCode = 404;
        throw error;
    }
    const before = await isEnabled(key);
    await FeatureFlag.updateOne(
        { _id: key },
        { $set: { enabled: Boolean(enabled), updatedAt: new Date(), updatedBy: actor } },
        { upsert: true }
    );
    local = null;
    await cache.del(CACHE_KEY).catch(() => {});
    return { before, after: Boolean(enabled) };
};

/** Express middleware: 403 with a friendly message while a feature is off. */
const requireFeature = key => async (req, res, next) => {
    try {
        if (await isEnabled(key)) return next();
        return res.status(403).json({
            success: false,
            code: 'FEATURE_DISABLED',
            feature: key,
            message: BY_KEY.get(key).offMessage,
        });
    } catch (error) {
        return next(error);
    }
};

const offMessage = key => BY_KEY.get(key)?.offMessage;

/**
 * Maintenance mode is on when the admin switches the storefront off, or when
 * MAINTENANCE_MODE=true is set on the server. The env var is the fallback for
 * work where the database itself may be unavailable (flag reads would then
 * fall back to defaults and reopen the shop).
 */
const maintenanceForced = () => process.env.MAINTENANCE_MODE === 'true';
const isMaintenanceOn = async () => maintenanceForced() || !(await isEnabled('storefront'));

// Tests reset the in-process cache between cases.
const _resetCache = () => {
    local = null;
};

module.exports = {
    FEATURES, getAll, isEnabled, listForAdmin, setEnabled, requireFeature, offMessage,
    maintenanceForced, isMaintenanceOn, _resetCache,
};
