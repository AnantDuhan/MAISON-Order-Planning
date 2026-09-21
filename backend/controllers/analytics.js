const Order = require('../models/order');
const Return = require('../models/return');
const Product = require('../models/product');
const User = require('../models/user');
const Refund = require('../models/refund');
const Subscription = require('../models/plusMembership');

const demoAnalytics = require('../data/demoAnalytics');

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

    // Demo admin receives synthetic analytics only.
    // Never expose production analytics to the demo account.
    if (req.user?.isDemo) {
        return res.status(200).json({
            success: true,
            range,
            granularity: 'month',
            demoMode: true,
            analytics: demoAnalytics
        });
    }

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

/**
 * Lightweight counts for the dashboard cards.
 *
 * Previously the dashboard dispatched getAllOrders / getAllUsers /
 * getAdminProduct / allRefunds / allReturns and counted the arrays in the
 * browser — every order and user document over the wire to render five
 * integers. countDocuments() runs against the index and returns a number.
 */
// GET /api/v1/admin/stats
exports.getAdminStats = async (req, res, next) => {
    try {
        // Demo admin receives synthetic dashboard counts.
        if (req.user?.isDemo) {
            return res.status(200).json({
                success: true,
                demoMode: true,
                stats: {
                    products: 48,
                    orders: 126,
                    users: 84,
                    returns: 9,
                    refunds: 5,
                    outOfStock: 3,
                    inStock: 45,

                    // Demo security metrics.
                    twoFactorEnabled: 72,
                    twoFactorDisabled: 12,
                    twoFactorAdoptionRate: 85.7
                }
            });
        }

        const [
            products,
            orders,
            users,
            returns,
            refunds,
            outOfStock,
            twoFactorEnabled
        ] = await Promise.all([
            Product.estimatedDocumentCount(),
            Order.estimatedDocumentCount(),
            User.estimatedDocumentCount(),
            Return.estimatedDocumentCount(),
            Refund.estimatedDocumentCount(),
            Product.countDocuments({ Stock: 0 }),

            // Users who have enabled 2FA
            User.countDocuments({
                'twoFactorAuth.enabled': true
            })
        ]);

        const twoFactorDisabled = Math.max(0, users - twoFactorEnabled);

        const twoFactorAdoptionRate =
            users > 0
                ? (twoFactorEnabled / users) * 100
                : 0;

        res.status(200).json({
            success: true,
            stats: {
                products,
                orders,
                users,
                returns,
                refunds,
                outOfStock,
                inStock: Math.max(0, products - outOfStock),

                // 2FA analytics
                twoFactorEnabled,
                twoFactorDisabled,
                twoFactorAdoptionRate
            }
        });
    } catch (error) {
        console.error('Admin stats failed:', error);
        res.status(500).json({
            success: false,
            message: 'Could not load stats'
        });
    }
};

exports.getMembershipAnalytics = async (req, res) => {
    try {
        if (req.user?.isDemo) {
            return res.status(200).json({
                success: true,
                demoMode: true,
                analytics: {
                    summary: {
                        total: 52,
                        active: 46,
                        recurringRevenue: 42800
                    },

                    statusBreakdown: [
                        {
                            status: 'Active',
                            count: 46
                        },
                        {
                            status: 'Expired',
                            count: 6
                        }
                    ],

                    planBreakdown: [
                        {
                            planId: 'MAISON Essential',
                            members: 31,
                            active: 28,
                            amount: 600
                        },
                        {
                            planId: 'MAISON Premium',
                            members: 15,
                            active: 13,
                            amount: 1000
                        },
                        {
                            planId: 'MAISON Elite',
                            members: 6,
                            active: 5,
                            amount: 1800
                        }
                    ],

                    recentMembers: [
                        {
                            _id: 'demo-membership-001',
                            user: {
                                name: 'Aarav Mehta',
                                email: 'aarav.demo@example.com'
                            },
                            status: 'Active',
                            planId: 'MAISON Premium',
                            amount: 1000
                        },
                        {
                            _id: 'demo-membership-002',
                            user: {
                                name: 'Isha Kapoor',
                                email: 'isha.demo@example.com'
                            },
                            status: 'Active',
                            planId: 'MAISON Essential',
                            amount: 600
                        },
                        {
                            _id: 'demo-membership-003',
                            user: {
                                name: 'Rohan Sharma',
                                email: 'rohan.demo@example.com'
                            },
                            status: 'Active',
                            planId: 'MAISON Elite',
                            amount: 1800
                        }
                    ]
                }
            });
        }

        const [totals, statusBreakdown, planBreakdown, recentMembers] = await Promise.all([
            Subscription.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: ['$isActive', 1, 0] } },
                        recurringRevenue: {
                            $sum: {
                                $cond: [
                                    '$isActive',
                                    { $cond: [{ $eq: ['$duration', 1] }, '$amount', { $divide: ['$amount', 12] }] },
                                    0,
                                ],
                            },
                        },
                    },
                },
                { $project: { _id: 0, total: 1, active: 1, recurringRevenue: 1 } },
            ]),
            Subscription.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { _id: 0, status: '$_id', count: 1 } },
                { $sort: { count: -1 } },
            ]),
            Subscription.aggregate([
                {
                    $group: {
                        _id: '$planId',
                        members: { $sum: 1 },
                        active: { $sum: { $cond: ['$isActive', 1, 0] } },
                        amount: { $first: '$amount' },
                    },
                },
                { $project: { _id: 0, planId: '$_id', members: 1, active: 1, amount: 1 } },
                { $sort: { active: -1, members: -1 } },
            ]),
            Subscription.find()
                .sort({ createdAt: -1 })
                .limit(12)
                .populate('user', 'name email')
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            analytics: {
                summary: totals[0] || { total: 0, active: 0, recurringRevenue: 0 },
                statusBreakdown,
                planBreakdown,
                recentMembers,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMemberships = async (req, res) => {
    try {
                if (req.user?.isDemo) {
            return res.status(200).json({
                success: true,
                demoMode: true,
                memberships: [
                    {
                        _id: 'demo-membership-001',
                        user: {
                            name: 'Aarav Mehta',
                            email: 'aarav.demo@example.com'
                        },
                        planId: 'MAISON Premium',
                        status: 'Active',
                        amount: 1000
                    },
                    {
                        _id: 'demo-membership-002',
                        user: {
                            name: 'Isha Kapoor',
                            email: 'isha.demo@example.com'
                        },
                        planId: 'MAISON Essential',
                        status: 'Active',
                        amount: 600
                    },
                    {
                        _id: 'demo-membership-003',
                        user: {
                            name: 'Rohan Sharma',
                            email: 'rohan.demo@example.com'
                        },
                        planId: 'MAISON Elite',
                        status: 'Active',
                        amount: 1800
                    },
                    {
                        _id: 'demo-membership-004',
                        user: {
                            name: 'Meera Nair',
                            email: 'meera.demo@example.com'
                        },
                        planId: 'MAISON Essential',
                        status: 'Expired',
                        amount: 600
                    }
                ]
            });
        }

        const memberships = await Subscription.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('user', 'name email')
            .lean();
        res.status(200).json({ success: true, memberships });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
