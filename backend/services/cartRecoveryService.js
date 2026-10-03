/**
 * Abandoned-cart recovery.
 *
 * A logged-in customer's cart is synced to the server. If it sits untouched:
 *   after 24h -> first reminder
 *   after 72h -> second (and last) reminder for that idle period
 * Editing the cart starts a new period. Nobody gets reminders if they opted
 * out, placed an order since, are a demo user, or haven't verified their email.
 *
 * Links in the email are signed (no login needed to follow them) and record a
 * click; an order placed within 7 days of a reminder counts as recovered.
 */
const crypto = require('crypto');
const ejs = require('ejs');
const path = require('path');

const Cart = require('../models/cart');
const User = require('../models/user');
const Order = require('../models/order');
const Product = require('../models/product');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/sendEmail');

const HOUR = 3600 * 1000;
const FIRST_AFTER = 24 * HOUR;
const SECOND_AFTER = 72 * HOUR;
const GIVE_UP_AFTER = 7 * 24 * HOUR;
const ATTRIBUTION_WINDOW = 7 * 24 * HOUR;

const secret = () => {
    const s = process.env.CART_LINK_SECRET || process.env.JWT_SECRET_KEY;
    if (!s) throw new Error('CART_LINK_SECRET or JWT_SECRET_KEY is required for cart links');
    return s;
};

const sign = payload => crypto.createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, 22);

const makeToken = (kind, id) => {
    const body = Buffer.from(`${kind}:${id}`).toString('base64url');
    return `${body}.${sign(`${kind}:${id}`)}`;
};

const readToken = (kind, token) => {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    let decoded;
    try {
        decoded = Buffer.from(body, 'base64url').toString();
    } catch {
        return null;
    }
    const [k, id] = decoded.split(':');
    if (k !== kind || !id) return null;
    const expected = Buffer.from(sign(`${kind}:${id}`));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    return id;
};

const apiBase = () => (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

/** Which reminder (1 or 2) this cart is due for now, or 0. */
const reminderDue = (cart, now = Date.now()) => {
    if (!cart.items?.length) return 0;
    const updatedAt = new Date(cart.updatedAt).getTime();
    const idle = now - updatedAt;
    if (idle < FIRST_AFTER || idle > GIVE_UP_AFTER) return 0;

    const sameCycle = cart.recovery?.cycle && new Date(cart.recovery.cycle).getTime() === updatedAt;
    const sent = sameCycle ? cart.recovery.emailsSent || 0 : 0;
    if (sent === 0) return 1;
    if (sent === 1 && idle >= SECOND_AFTER) return 2;
    return 0;
};

const sendReminder = async (cart, stage) => {
    const user = await User.findById(cart.user)
        .select('name email isDemo isEmailVerified cartRemindersOptOut').lean();
    if (!user?.email || user.isDemo || user.cartRemindersOptOut || user.isEmailVerified === false) {
        return 'skipped:user';
    }

    // Bought since the cart was last touched: the cart is stale, not abandoned.
    const ordered = await Order.exists({ user: String(cart.user), createdAt: { $gte: cart.updatedAt } });
    if (ordered) return 'skipped:ordered';

    // Current prices and availability, not what was in the cart days ago.
    const products = await Product.find({ _id: { $in: cart.items.map(i => i.product) } })
        .select('name price Stock images').lean();
    const byId = new Map(products.map(p => [String(p._id), p]));
    const items = cart.items
        .map(item => {
            const p = byId.get(String(item.product));
            return p && {
                name: p.name,
                price: p.price,
                quantity: item.quantity,
                image: p.images?.[0]?.url || item.image,
                inStock: p.Stock > 0,
                lowStock: p.Stock > 0 && p.Stock <= 3,
            };
        })
        .filter(Boolean);
    if (!items.length || !items.some(i => i.inStock)) return 'skipped:unavailable';

    // Claim this reminder before sending, so overlapping runs can't double-send.
    const claimed = await Cart.updateOne(
        {
            _id: cart._id,
            updatedAt: cart.updatedAt,
            ...(stage === 1
                ? { $or: [{ 'recovery.cycle': { $ne: cart.updatedAt } }, { 'recovery.emailsSent': { $in: [0, null] } }] }
                : { 'recovery.cycle': cart.updatedAt, 'recovery.emailsSent': 1 }),
        },
        {
            $set: {
                'recovery.cycle': cart.updatedAt,
                'recovery.emailsSent': stage,
                'recovery.lastEmailAt': new Date(),
                ...(stage === 1 ? { 'recovery.clickedAt': null, 'recovery.recoveredAt': null } : {}),
            },
        }
    );
    if (!claimed.modifiedCount) return 'skipped:claimed';

    const html = await ejs.renderFile(path.join(__dirname, '../mails/abandoned-cart.ejs'), {
        user,
        items,
        stage,
        total: items.filter(i => i.inStock).reduce((n, i) => n + i.price * i.quantity, 0),
        restoreLink: `${apiBase()}/api/v1/cart/recover/${makeToken('cart', cart._id)}`,
        unsubscribeLink: `${apiBase()}/api/v1/cart/reminders/unsubscribe/${makeToken('optout', cart.user)}`,
    });
    try {
        await sendEmail({
            email: user.email,
            sender: 'noreply',
            subject: stage === 1 ? 'You left something in your bag' : 'Still thinking it over?',
            html,
        });
    } catch (error) {
        // Release the claim so the next run can retry.
        await Cart.updateOne({ _id: cart._id }, { $set: { 'recovery.emailsSent': stage - 1 } }).catch(() => {});
        throw error;
    }
    return 'sent';
};

/** Cron entry point: POST /api/v1/jobs/abandoned-carts */
const runAbandonedCartReminders = async ({ limit = 200, now = Date.now() } = {}) => {
    if (!(await require('./featureFlags').isEnabled('cartReminders'))) {
        return { scanned: 0, sent: 0, skipped: 0, failed: 0, disabled: true };
    }
    const carts = await Cart.find({
        'items.0': { $exists: true },
        updatedAt: { $lte: new Date(now - FIRST_AFTER), $gte: new Date(now - GIVE_UP_AFTER) },
    }).limit(limit).lean();

    const result = { scanned: carts.length, sent: 0, skipped: 0, failed: 0 };
    for (const cart of carts) {
        const stage = reminderDue(cart, now);
        if (!stage) {
            result.skipped += 1;
            continue;
        }
        try {
            const outcome = await sendReminder(cart, stage);
            if (outcome === 'sent') result.sent += 1;
            else result.skipped += 1;
        } catch (error) {
            result.failed += 1;
            logger.error({ cart: cart._id, err: error.message }, 'abandoned-cart email failed');
        }
    }
    return result;
};

/** Signed link from the email: record the click, return where to send them. */
const recordClick = async token => {
    const cartId = readToken('cart', token);
    if (cartId) {
        await Cart.updateOne(
            { _id: cartId, 'recovery.clickedAt': null },
            { $set: { 'recovery.clickedAt': new Date() } }
        ).catch(() => {});
    }
    return `${apiBase()}/cart?restore=1`;
};

const optOut = async token => {
    const userId = readToken('optout', token);
    if (!userId) return false;
    await User.updateOne({ _id: userId }, { cartRemindersOptOut: true });
    return true;
};

/** Called after an order is created: credit the reminder if one went out recently. */
const markRecovered = async (userId, order) => {
    await Cart.updateOne(
        {
            user: String(userId),
            'recovery.lastEmailAt': { $gte: new Date(Date.now() - ATTRIBUTION_WINDOW) },
            'recovery.recoveredAt': null,
        },
        {
            $set: {
                'recovery.recoveredAt': new Date(),
                'recovery.recoveredOrder': String(order._id),
                'recovery.recoveredValue': order.totalPrice,
            },
        }
    );
};

const recoveryStats = async ({ days = 30 } = {}) => {
    const since = new Date(Date.now() - days * 24 * HOUR);
    const [emailed, clicked, recovered, revenue, abandonedNow] = await Promise.all([
        Cart.countDocuments({ 'recovery.lastEmailAt': { $gte: since } }),
        Cart.countDocuments({ 'recovery.clickedAt': { $gte: since } }),
        Cart.countDocuments({ 'recovery.recoveredAt': { $gte: since } }),
        Cart.aggregate([
            { $match: { 'recovery.recoveredAt': { $gte: since } } },
            { $group: { _id: null, total: { $sum: '$recovery.recoveredValue' } } },
        ]),
        Cart.countDocuments({
            'items.0': { $exists: true },
            updatedAt: { $lte: new Date(Date.now() - FIRST_AFTER), $gte: new Date(Date.now() - GIVE_UP_AFTER) },
        }),
    ]);
    const recent = await Cart.find({ 'recovery.lastEmailAt': { $gte: since } })
        .sort({ 'recovery.lastEmailAt': -1 })
        .limit(25)
        .populate('user', 'name email')
        .select('user items recovery updatedAt')
        .lean();

    return {
        days,
        emailed,
        clicked,
        recovered,
        recoveredRevenue: revenue[0]?.total || 0,
        clickRate: emailed ? clicked / emailed : 0,
        recoveryRate: emailed ? recovered / emailed : 0,
        abandonedNow,
        recent: recent.map(c => ({
            _id: c._id,
            customer: c.user?.name,
            email: c.user?.email,
            itemCount: c.items.reduce((n, i) => n + i.quantity, 0),
            value: c.items.reduce((n, i) => n + i.price * i.quantity, 0),
            emailsSent: c.recovery?.emailsSent || 0,
            lastEmailAt: c.recovery?.lastEmailAt,
            clickedAt: c.recovery?.clickedAt,
            recoveredAt: c.recovery?.recoveredAt,
            recoveredOrder: c.recovery?.recoveredOrder,
        })),
    };
};

module.exports = {
    reminderDue,
    runAbandonedCartReminders,
    sendReminder,
    recordClick,
    optOut,
    markRecovered,
    recoveryStats,
    makeToken,
    readToken,
    FIRST_AFTER,
    SECOND_AFTER,
};
