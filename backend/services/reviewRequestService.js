/**
 * Review requests: a few days after an order is delivered, one email asks the
 * customer how they like what they bought, with a link straight into the
 * review form (and five stars that pre-fill the rating).
 *
 * Who is asked:
 *   - orders delivered between REVIEW_REQUEST_AFTER_DAYS (default 4) and
 *     WINDOW_DAYS (14) ago, so the first run doesn't email every old order;
 *   - once per order (claimed atomically before sending);
 *   - not returned, refunded, or with a return/refund requested;
 *   - not demo accounts, unverified emails, or people who opted out;
 *   - only products the customer hasn't reviewed yet (up to 3 per email).
 * A failed send is put back so the next run tries again.
 */
const crypto = require('crypto');
const ejs = require('ejs');
const path = require('path');

const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');
const logger = require('../config/logger');
// Through the module object, so tests can stub it.
const mailer = require('../utils/sendEmail');

const DAY = 24 * 60 * 60 * 1000;
const afterDays = () => Number(process.env.REVIEW_REQUEST_AFTER_DAYS) || 4;
const WINDOW_DAYS = 14;
const MAX_ITEMS = 3;

const secret = () => {
    const s = process.env.REVIEW_LINK_SECRET || process.env.CART_LINK_SECRET || process.env.JWT_SECRET_KEY;
    if (!s) throw new Error('REVIEW_LINK_SECRET or JWT_SECRET_KEY is required for review links');
    return s;
};
const sign = payload => crypto.createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, 22);

/** Signed, login-free unsubscribe token for a user. */
const optOutToken = userId => `${Buffer.from(String(userId)).toString('base64url')}.${sign(`review-optout:${userId}`)}`;

const readOptOutToken = token => {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    let userId;
    try {
        userId = Buffer.from(body, 'base64url').toString();
    } catch {
        return null;
    }
    const expected = Buffer.from(sign(`review-optout:${userId}`));
    const given = Buffer.from(sig);
    if (!userId || expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    return userId;
};

const optOut = async token => {
    const userId = readOptOutToken(token);
    if (!userId) return false;
    await User.updateOne({ _id: userId }, { reviewRequestsOptOut: true });
    return true;
};

const site = () => (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const firstPhoto = product => (product.images || []).find(img => img?.url)?.url || null;

const runReviewRequests = async ({ limit = 200, now = new Date() } = {}) => {
    const stats = { checked: 0, sent: 0, skipped: 0, failed: 0 };
    const orders = await Order.find({
        orderStatus: 'Delivered',
        DeliveredAt: { $lte: new Date(now.getTime() - afterDays() * DAY), $gte: new Date(now.getTime() - WINDOW_DAYS * DAY) },
        reviewRequestSentAt: null,
        isReturned: { $ne: true },
        isRefunded: { $ne: true },
        returnRequestedAt: null,
        refundRequestedAt: null,
        isDemo: { $ne: true },
    }).select('user orderItems DeliveredAt').limit(limit).lean();

    for (const order of orders) {
        stats.checked += 1;
        // Claim first, so overlapping runs can't email the same order twice.
        const claimed = await Order.updateOne({ _id: order._id, reviewRequestSentAt: null }, { reviewRequestSentAt: now });
        if (!claimed.modifiedCount) continue;

        const user = await User.findById(order.user).select('name email isDemo isEmailVerified reviewRequestsOptOut').lean();
        if (!user || !user.email || user.isDemo || !user.isEmailVerified || user.reviewRequestsOptOut) {
            stats.skipped += 1;
            continue;
        }

        const ids = [...new Set((order.orderItems || []).map(item => String(item.product)))];
        const products = await Product.find({ _id: { $in: ids } }).select('name images reviews.user').lean();
        const toReview = products
            .filter(p => !(p.reviews || []).some(rev => String(rev.user) === String(user._id)))
            .slice(0, MAX_ITEMS)
            .map(p => ({ id: String(p._id), name: p.name, photo: firstPhoto(p), link: `${site()}/product/${p._id}?review=1` }));
        if (!toReview.length) {
            stats.skipped += 1;
            continue;
        }

        try {
            const html = await ejs.renderFile(path.join(__dirname, '../mails/review-request.ejs'), {
                firstName: String(user.name || '').trim().split(/\s+/)[0] || 'there',
                deliveredOn: order.DeliveredAt
                    ? new Date(order.DeliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
                    : null,
                items: toReview,
                unsubscribeLink: `${site()}/api/v1/review-requests/unsubscribe/${optOutToken(user._id)}`,
            });
            await mailer.sendEmail({
                email: user.email,
                sender: 'noreply',
                subject: toReview.length === 1 ? `How is your ${toReview[0].name}?` : 'How are your new pieces?',
                html,
            });
            stats.sent += 1;
        } catch (error) {
            stats.failed += 1;
            await Order.updateOne({ _id: order._id }, { reviewRequestSentAt: null }).catch(() => {});
            logger.error({ err: error.message, order: order._id }, 'review request email failed');
        }
    }
    return stats;
};

module.exports = { runReviewRequests, optOut, optOutToken, readOptOutToken, WINDOW_DAYS, MAX_ITEMS };
