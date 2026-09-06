const Order = require('../models/order');
const Return = require('../models/return');

/**
 * Admin analytics.
 *
 * Everything here is computed with aggregation pipelines so the client
 * receives pre-bucketed numbers instead of the full collections.
 *
 * NOTE ON IDS: Order._id / Product._id are declared as String while the
 * reference fields (orderItems[].product, Return.order) are declared as
 * Number. To stay correct whichever way a given document was persisted,
 * every join below compares { $toString: ... } on both sides rather than
 * relying on the declared types matching.
 */

/** Resolve the { $gte } date for a window like '7d' | '30d' | '90d' | '12m' | 'all'. */
const rangeToDate = range => {
    const now = new Date();
    switch (range) {
        case '7d':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '90d':
            return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case '12m':
            return new Date(now.getFullYear(), now.getMonth() - 11, 1);
        case 'all':
            return null;
        case '30d':
        default:
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
};

// GET /api/v1/admin/analytics?range=30d
exports.getAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range || '30d';
    const since = rangeToDate(range);

    // Monthly buckets for the long window, daily otherwise.
    const groupByMonth = range === '12m' || range === 'all';

    const dateMatch = since ? { createdAt: { $gte: since } } : {};

    const dateKey = groupByMonth
        ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

    const [
        revenueSeries,
        totals,
        statusBreakdown,
        topProducts,
        categoryRevenue,
        returnReasons,
        couponUsage,
    ] = await Promise.all([
        // ── Revenue over time ────────────────────────────────
        Order.aggregate([
            { $match: dateMatch },
            {
                $group: {
                    _id: dateKey,
                    revenue: { $sum: '$totalPrice' },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, period: '$_id', revenue: 1, orders: 1 } },
        ]),

        // ── Headline totals (revenue, orders, AOV, units) ────
        Order.aggregate([
            { $match: dateMatch },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$totalPrice' },
                    orders: { $sum: 1 },
                    units: { $sum: { $sum: '$orderItems.quantity' } },
                    discountGiven: { $sum: { $ifNull: ['$discountedAmount', 0] } },
                    returned: { $sum: { $cond: ['$isReturned', 1, 0] } },
                },
            },
            {
                $project: {
                    _id: 0,
                    revenue: 1,
                    orders: 1,
                    units: 1,
                    discountGiven: 1,
                    returned: 1,
                    avgOrderValue: {
                        $cond: [
                            { $gt: ['$orders', 0] },
                            { $divide: ['$revenue', '$orders'] },
                            0,
                        ],
                    },
                },
            },
        ]),

        // ── Order status funnel ──────────────────────────────
        Order.aggregate([
            { $match: dateMatch },
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
            { $project: { _id: 0, status: '$_id', count: 1 } },
            { $sort: { count: -1 } },
        ]),

        // ── Top products by revenue (name is denormalised on
        //    the order, so no join is required here) ─────────
        Order.aggregate([
            { $match: dateMatch },
            { $unwind: '$orderItems' },
            {
                $group: {
                    _id: '$orderItems.name',
                    revenue: {
                        $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] },
                    },
                    units: { $sum: '$orderItems.quantity' },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, name: '$_id', revenue: 1, units: 1 } },
        ]),

        // ── Revenue by category (string-safe join) ───────────
        Order.aggregate([
            { $match: dateMatch },
            { $unwind: '$orderItems' },
            {
                $lookup: {
                    from: 'products',
                    let: { pid: { $toString: '$orderItems.product' } },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [{ $toString: '$_id' }, '$$pid'] },
                            },
                        },
                        { $project: { category: 1 } },
                    ],
                    as: 'productDoc',
                },
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            { $arrayElemAt: ['$productDoc.category', 0] },
                            'Uncategorised',
                        ],
                    },
                    revenue: {
                        $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] },
                    },
                    units: { $sum: '$orderItems.quantity' },
                },
            },
            { $sort: { revenue: -1 } },
            { $project: { _id: 0, category: '$_id', revenue: 1, units: 1 } },
        ]),

        // ── Top return reasons ───────────────────────────────
        Return.aggregate([
            ...(since ? [{ $match: { requestedAt: { $gte: since } } }] : []),
            { $group: { _id: '$reason', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, reason: '$_id', count: 1 } },
        ]),

        // ── Coupon usage ─────────────────────────────────────
        Order.aggregate([
            { $match: { ...dateMatch, couponUsed: true } },
            {
                $group: {
                    _id: '$couponCode',
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totalPrice' },
                    discount: { $sum: { $ifNull: ['$discountedAmount', 0] } },
                },
            },
            { $sort: { orders: -1 } },
            { $limit: 6 },
            { $project: { _id: 0, code: '$_id', orders: 1, revenue: 1, discount: 1 } },
        ]),
    ]);

    const summary = totals[0] || {
        revenue: 0,
        orders: 0,
        units: 0,
        discountGiven: 0,
        returned: 0,
        avgOrderValue: 0,
    };

    summary.returnRate =
        summary.orders > 0 ? (summary.returned / summary.orders) * 100 : 0;

    res.status(200).json({
        success: true,
        range,
        granularity: groupByMonth ? 'month' : 'day',
        analytics: {
            summary,
            revenueSeries,
            statusBreakdown,
            topProducts,
            categoryRevenue,
            returnReasons,
            couponUsage,
        },
    });
  } catch (error) {
    console.error('Analytics aggregation failed:', error);
    res.status(500).json({
        success: false,
        message: 'Could not build analytics',
    });
  }
};
