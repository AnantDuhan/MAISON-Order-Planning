const Return = require('../models/return');
const Refund = require('../models/refund');
const Order = require('../models/order');
const generateId = require('../utils/generateId');
const cache = require('../utils/cache');

exports.initiateRefund = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.orderStatus !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Order has not been delivered yet'
            });
        }

        if (!order.return || order.return.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No returns found for this order'
            });
        }

        if (
            order.isRefunded ||
            order.refundStatus === 'Processing'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Order refund has already been initiated or processed'
            });
        }

        /*
         * Find return requests associated with this order.
         * Only Pending/Approved returns are eligible for refund.
         */
        const returnRequests = await Return.find({
            _id: { $in: order.return },
            status: { $in: ['Pending', 'Approved'] }
        });

        if (returnRequests.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No pending or approved return found for this order'
            });
        }

        /*
         * IMPORTANT:
         * Create ONE refund per order, not one refund per return.
         *
         * The previous implementation created order.totalPrice
         * for every eligible return document, which could result in
         * multiple refunds for the same order.
         */
        const refundAmount = order.totalPrice;

        const newRefund = new Refund({
            _id: generateId(),
            order: order._id,
            amount: refundAmount,
            initiatedAt: new Date(),
            status: 'Initiated'
        });

        await newRefund.save();

        /*
         * Attach the single refund to the order.
         */
        if (!Array.isArray(order.refund)) {
            order.refund = [];
        }

        order.refund.push(newRefund._id);

        /*
         * Mark all eligible return requests as Initiated.
         */
        const resolvedAt = new Date();

        await Return.updateMany(
            {
                _id: {
                    $in: returnRequests.map(returnDoc => returnDoc._id)
                }
            },
            {
                $set: {
                    status: 'Initiated',
                    resolvedAt
                }
            }
        );

        /*
         * Update order refund state.
         */
        order.refundStatus = 'Processing';
        order.refundRequestedAt = resolvedAt;

        await order.save();

        /*
         * Clear shared cache so the admin panel gets
         * the latest refund/order information.
         */
        await cache.del(
            'refunds',
            'orders',
            `order:${order._id}`,
            `orders:${order.user}`
        );

        return res.status(200).json({
            success: true,
            message: 'Refund initiation request sent',
            refund: newRefund,
            order
        });

    } catch (error) {
        console.error('Initiate refund error:', error);

        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


exports.updateRefundStatus = async (req, res) => {
    try {
        const { refundStatus } = req.body;
        const refundId = req.params.refundId;
        const orderId = req.params.orderId;

        const refund = await Refund.findById(refundId);
        const order = await Order.findById(orderId);

        if (!refund || !order) {
            return res.status(404).json({
                success: false,
                message: 'Refund or Order not found'
            });
        }

        if (!refundStatus) {
            return res.status(400).json({
                success: false,
                message: 'Refund status is required'
            });
        }

        const validStatuses = ['Initiated', 'Pending', 'Approved', 'Rejected', 'Refunded'];
        if (!validStatuses.includes(refundStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid refund status'
            });
        }

        // MOCK GATEWAY: We removed Stripe. We just update the database directly.
        if (refundStatus === 'Refunded') {
            order.isRefunded = true;
            order.refundedAt = new Date(); 
        }

        // Dynamically update based on what the Admin selected in the dropdown
        order.refundStatus = refundStatus;
        await order.save();

        refund.status = refundStatus;
        if (refundStatus === 'Refunded') {
            refund.completedAt = new Date();
        }
        await refund.save();

        // CLEAR shared CACHE so the DataGrid in React updates immediately
        await cache.del('refunds', 'orders', `order:${order._id}`, `orders:${order.user}`);

        res.status(200).json({
            success: true,
            message: `Refund status updated to ${refundStatus}`,
            refund,
            order
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.getAllRefunds = async (req, res) => {
    try {
        // Demo admin must only see synthetic/demo refund records.
        if (req.user?.isDemo) {
            const demoRefunds = await Refund.find({ isDemo: true })
                .populate({
                    path: 'order',
                    select: 'user refundRequestedAt totalPrice orderStatus',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                .sort('-initiatedAt')
                .limit(100)
                .lean();

            return res.status(200).json({
                success: true,
                demoMode: true,
                refunds: demoRefunds
            });
        }

        // Real admin flow
        let refunds = await cache.getJSON('refunds');

        if (!refunds) {
            refunds = await Refund.find()
                .populate({
                    path: 'order',
                    select: 'user refundRequestedAt totalPrice orderStatus',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                .sort('-requestedAt')
                .lean();

            await cache.setJSON('refunds', refunds);
        }

        return res.status(200).json({
            success: true,
            refunds
        });
    } catch (error) {
        console.error('Error fetching refunds:', error);

        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};