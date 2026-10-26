const Order = require('../models/order');
const wallet = require('./walletService');
const logger = require('../config/logger');
const { BENEFITS, REWARD_CAP_RUPEES } = require('../utils/membership');
const { MEMBER_RETURN_WINDOW_DAYS } = require('../utils/returnWindow');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Plus store credit an order earns: 2% of what was paid for the items, at most ₹500. */
const rewardFor = order => {
    const rate = BENEFITS[order?.memberTier]?.rewardRate || 0;
    if (!rate) return 0;
    const base = Math.max(0, Number(order.totalPrice || 0) - Number(order.shippingPrice || 0));
    return Math.min(REWARD_CAP_RUPEES, Math.floor(base * rate));
};

/**
 * Credit Plus rewards for orders whose return window has closed without a
 * return, so returned orders never earn credit. Idempotent per order.
 */
const creditDueRewards = async ({ limit = 100, now = new Date() } = {}) => {
    const closedBefore = new Date(now.getTime() - MEMBER_RETURN_WINDOW_DAYS * DAY_MS);
    const orders = await Order.find({
        memberTier: 'plus',
        orderStatus: 'Delivered',
        DeliveredAt: { $lte: closedBefore },
        memberRewardAt: null,
        isReturned: { $ne: true },
        isRefunded: { $ne: true },
        isDemo: { $ne: true },
    }).select('_id user totalPrice shippingPrice memberTier').limit(limit).lean();

    let credited = 0;
    for (const order of orders) {
        const amount = rewardFor(order);
        try {
            if (amount >= 1) {
                await wallet.credit(order.user, amount * 100, {
                    type: 'reward',
                    reference: { type: 'order', id: String(order._id) },
                    note: `Maison Plus: 2% back on order ${order._id}`,
                    idempotencyKey: `member-reward:${order._id}`,
                });
                credited += 1;
            }
            await Order.updateOne({ _id: order._id, memberRewardAt: null }, { memberRewardAt: now, memberRewardAmount: amount });
        } catch (error) {
            logger.error({ order: order._id, err: error.message }, 'member reward failed');
        }
    }
    return { checked: orders.length, credited };
};

module.exports = { rewardFor, creditDueRewards };
