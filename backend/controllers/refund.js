const Return = require('../models/return');
const Refund = require('../models/refund');
const Order = require('../models/order');
const Product = require('../models/product');
const generateId = require('../utils/generateId');
const cache = require('../utils/cache');
// Used through the module object so tests can stub them.
const invoiceService = require('../services/invoiceService');
const inventory = require('../services/inventoryService');
const wallet = require('../services/walletService');
const featureFlags = require('../services/featureFlags');

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
        res.locals.audit = { summary: `Refund of ₹${refundAmount} initiated for order ${order._id}` };

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

        // Status fields only; don't re-validate the whole historical order.
        await order.save({ validateBeforeSave: false });

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
        const { refundStatus, refundMethod } = req.body;
        if (refundMethod !== undefined && !['original', 'store-credit'].includes(refundMethod)) {
            return res.status(400).json({ success: false, message: 'Invalid refund method' });
        }
        if (refundMethod === 'store-credit' && !(await featureFlags.isEnabled('storeCredit'))) {
            return res.status(409).json({ success: false, message: 'Store credit is turned off in Features. Refund to the original payment method, or turn store credit back on.' });
        }
        const refundId = req.params.refundId;
        const orderId = req.params.orderId;

        const refund = await Refund.findById(refundId);
        const order = await Order.findById(orderId);

        if (!refund || !order || String(refund.order) !== String(order._id)) {
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

        // A completed refund is final: money has gone back to the customer.
        if (order.isRefunded && refundStatus !== 'Refunded') {
            return res.status(409).json({
                success: false,
                message: 'This order has already been refunded'
            });
        }

        res.locals.audit = {
            before: { refundStatus: refund.status },
            after: { refundStatus },
            summary: `Refund for order ${order._id} (₹${refund.amount}): ${refund.status} → ${refundStatus}`,
        };

        // MOCK GATEWAY: We removed Stripe. We just update the database directly.
        if (refundStatus === 'Refunded' && !order.isRefunded) {
            // Store credit used on the order always goes back as store credit;
            // the rest goes where the admin chose.
            const method = refundMethod || refund.method || 'original';
            const amount = Number(refund.amount) || 0;
            const toWallet = method === 'store-credit'
                ? amount
                : Math.min(Number(order.storeCreditApplied) || 0, amount);
            if (toWallet > 0) {
                await wallet.credit(order.user?._id || order.user, wallet.toPaise(toWallet), {
                    type: 'refund',
                    reference: { type: 'refund', id: String(refund._id) },
                    note: `Refund for order ${order._id}`,
                    idempotencyKey: `refund:${refund._id}`,
                    createdBy: req.user && { id: String(req.user._id), name: req.user.name },
                });
            }
            refund.method = method;
            refund.storeCreditAmount = toWallet;
        }
        if (refundStatus === 'Refunded') {
            order.isRefunded = true;
            order.refundedAt = order.refundedAt || new Date();

            // The refund covers the whole order, so every item goes back into
            // stock — but only if stock was taken out (on Shipped), and only once.
            const stockWasTaken = Boolean(order.stockCommittedAt)
                || ['Shipped', 'Delivered'].includes(order.orderStatus);
            if (stockWasTaken && !order.stockRestoredAt) {
                await restoreStock(order.orderItems);
                order.stockRestoredAt = new Date();
            }
        }

        // Dynamically update based on what the Admin selected in the dropdown
        order.refundStatus = refundStatus;
        // Status fields only; don't re-validate the whole historical order.
        await order.save({ validateBeforeSave: false });

        refund.status = refundStatus;
        if (refundStatus === 'Refunded') {
            refund.completedAt = new Date();
        }
        await refund.save();

        // The invoice stays genuine but now verifies as refunded, so it can't be
        // presented as proof of an open purchase (or used for a second refund).
        if (refundStatus === 'Refunded') {
            await invoiceService.setOrderInvoiceStatus(order._id, 'refunded').catch(error =>
                console.error(`Could not mark invoice refunded for order ${order._id}:`, error.message));
            // Credit note reversing the invoice, emailed to the customer.
            invoiceService.issueCreditNoteInBackground(order, refund, { refundMethod: refund.method || 'original' });
        }

        // CLEAR shared CACHE so the DataGrid in React updates immediately
        await cache.del(
            'refunds',
            'orders',
            `order:${order._id}`,
            `orders:${order.user}`,
            ...order.orderItems.map(item => `product:${item.product}`)
        );

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

// Restock goes through the inventory service so back-in-stock waiters are
// notified and low-stock flags reset.
async function restoreStock(orderItems = []) {
    await inventory.restoreStock(orderItems.map(item => ({
        product: String(item.product),
        ...(item.variant && { variant: String(item.variant) }),
        quantity: item.quantity,
    })));
}

exports.restoreStock = restoreStock;

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