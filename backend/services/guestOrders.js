/**
 * Guest checkout: buying without an account, and claiming those orders later.
 *
 *   createGuestCashfreeOrder ──► guest checkout token (signed: Cashfree order
 *                                id + the guest's email, name and phone)
 *   newGuestOrder            ──► order with user: null, guest: { email, … }
 *   sign-in / email verified ──► claimGuestOrders: every unclaimed guest order
 *                                for that verified email moves to the account
 *
 * Claiming needs a *verified* email. Anyone can type an address at guest
 * checkout, so an unverified account must never pick up those orders.
 */
const jwt = require('jsonwebtoken');
const validator = require('validator');

const Order = require('../models/order');
const StockAlert = require('../models/stockAlert');
const cache = require('../utils/cache');
const logger = require('../config/logger');
const { toNational } = require('../utils/phone');

const TOKEN_KIND = 'guest-checkout';
// Long enough to pay (holds last 30 minutes) and retry placing the order.
const TOKEN_LIFETIME = '3h';

class GuestCheckoutError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * Validate and tidy the details a guest gives at checkout.
 * @throws {GuestCheckoutError}
 */
const cleanGuestDetails = (input = {}) => {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
    const phone = toNational(input.phone);
    if (!email || !validator.isEmail(email)) throw new GuestCheckoutError('Enter a valid email address for your order updates.');
    if (name.length < 2 || name.length > 60) throw new GuestCheckoutError('Enter your full name (2–60 characters).');
    if (!phone || phone.length !== 10) throw new GuestCheckoutError('Enter a 10-digit mobile number for the courier.');
    return { email, name, phone };
};

const signGuestCheckoutToken = ({ cashfreeOrderId, guest }) =>
    jwt.sign(
        { kind: TOKEN_KIND, cfo: cashfreeOrderId, email: guest.email, name: guest.name, phone: guest.phone },
        process.env.JWT_SECRET_KEY,
        { expiresIn: TOKEN_LIFETIME }
    );

/** The checkout this token was issued for, or null. */
const readGuestCheckoutToken = token => {
    if (typeof token !== 'string' || !token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (decoded.kind !== TOKEN_KIND || typeof decoded.cfo !== 'string') return null;
        return {
            cashfreeOrderId: decoded.cfo,
            guest: { email: decoded.email, name: decoded.name, phone: decoded.phone },
        };
    } catch {
        return null;
    }
};

/** Cashfree order ids for guest checkouts. Account checkouts use order_<userId>_… */
const GUEST_PREFIX = 'order_guest_';
const isGuestPaymentId = id => typeof id === 'string' && id.startsWith(GUEST_PREFIX);

/** Stock holds are keyed by shopper; a guest checkout is its own shopper. */
const holdOwnerFor = cashfreeOrderId => `guest:${cashfreeOrderId}`;

/**
 * Move this account's unclaimed guest orders (and guest back-in-stock
 * requests) to it. Only for a verified email. Safe to call on every sign-in:
 * with nothing to claim it is one indexed query.
 * @returns {Promise<number>} orders claimed
 */
const claimGuestOrders = async user => {
    const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
    if (!user?._id || !email || !user.isEmailVerified || user.isDemo) return 0;

    const unclaimed = { user: null, 'guest.email': email };
    const ids = await Order.find(unclaimed).distinct('_id');
    if (!ids.length) {
        await StockAlert.updateMany({ user: null, email, notifiedAt: null }, { user: String(user._id) }).catch(() => {});
        return 0;
    }

    const result = await Order.updateMany(
        { _id: { $in: ids }, ...unclaimed },
        { $set: { user: String(user._id), 'guest.claimedAt': new Date() } }
    );
    await StockAlert.updateMany({ user: null, email, notifiedAt: null }, { user: String(user._id) }).catch(() => {});
    await cache.del('orders', `orders:${user._id}`, ...ids.map(id => `order:${id}`)).catch(() => {});

    if (result.modifiedCount) {
        logger.info({ userId: user._id, orders: result.modifiedCount }, 'guest orders claimed');
    }
    return result.modifiedCount || 0;
};

/** claimGuestOrders without blocking or failing the caller (sign-in). */
const claimGuestOrdersInBackground = user => {
    setImmediate(() => {
        module.exports.claimGuestOrders(user).catch(error =>
            logger.error({ err: error.message, userId: user?._id }, 'claiming guest orders failed'));
    });
};

module.exports = {
    GuestCheckoutError,
    GUEST_PREFIX,
    cleanGuestDetails,
    signGuestCheckoutToken,
    readGuestCheckoutToken,
    isGuestPaymentId,
    holdOwnerFor,
    claimGuestOrders,
    claimGuestOrdersInBackground,
};
