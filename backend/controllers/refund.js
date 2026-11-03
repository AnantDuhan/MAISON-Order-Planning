const Refund = require('../models/refund');
const Order = require('../models/order');
const cache = require('../utils/cache');
const refundService = require('../services/refundService');
const { refundLifecycle } = require('../lifecycle/refundLifecycle');
const { realOnly } = require('../utils/demoFilter');

// Status changes follow lifecycle/refundLifecycle.js; what moves with them
// (returns, stock, invoice, credit note) is in services/refundService.js.

const sendFailure = (res, error, context) => {
    if (!error.statusCode) console.error(context, error);
    return res.status(error.statusCode || 500).json({
        success: false,
        ...(error.code && { code: error.code }),
        message: error.statusCode ? error.message : 'Server error',
    });
};

exports.initiateRefund = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const refund = await refundService.startRefund(order);
        res.locals.audit = { summary: `Refund of ₹${refund.amount} initiated for order ${order._id}` };

        return res.status(200).json({
            success: true,
            message: 'Refund initiation request sent',
            refund,
            order
        });
    } catch (error) {
        return sendFailure(res, error, 'Initiate refund error:');
    }
};

exports.updateRefundStatus = async (req, res) => {
    try {
        const { refundStatus, refundMethod } = req.body;
        // Refunds go back to the original payment method only (there is no store credit).
        if (refundMethod !== undefined && refundMethod !== 'original') {
            return res.status(400).json({ success: false, message: 'Invalid refund method' });
        }
        if (!refundStatus) {
            return res.status(400).json({ success: false, message: 'Refund status is required' });
        }

        const refund = await Refund.findById(req.params.refundId);
        const order = await Order.findById(req.params.orderId);
        if (!refund || !order || String(refund.order) !== String(order._id)) {
            return res.status(404).json({ success: false, message: 'Refund or Order not found' });
        }

        const before = refund.status;
        const move = await refundService.moveRefund({ order, refund, to: refundStatus, by: 'admin' });
        if (move.changed) {
            res.locals.audit = {
                before: { refundStatus: before },
                after: { refundStatus },
                summary: `Refund for order ${order._id} (₹${refund.amount}): ${before} → ${refundStatus}`,
            };
        }

        res.status(200).json({
            success: true,
            message: move.changed ? `Refund status updated to ${refundStatus}` : `Refund is already ${refundStatus}`,
            refund,
            order,
            nextStatuses: refundLifecycle.next(refund.status, { by: 'admin' }),
        });
    } catch (error) {
        return sendFailure(res, error, 'Update refund error:');
    }
};

exports.getAllRefunds = async (req, res) => {
    try {
        // Demo admin must only see synthetic/demo refund records.
        if (req.user?.isDemo) {
            const demoRefunds = await Refund.find({ isDemo: true })
                .populate({
                    path: 'order',
                    // orderItems: what was refunded (name, image, variant, quantity).
                    select: 'user refundRequestedAt totalPrice orderStatus orderItems',
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
            // Real refunds only; the demo seed script's are isDemo.
            refunds = await Refund.find(realOnly())
                .populate({
                    path: 'order',
                    // orderItems: what was refunded (name, image, variant, quantity).
                    select: 'user refundRequestedAt totalPrice orderStatus orderItems',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                // Refunds have initiatedAt, not requestedAt (that sort did nothing).
                .sort('-initiatedAt')
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