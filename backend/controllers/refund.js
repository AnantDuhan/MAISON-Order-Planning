const Return = require('../models/return');
const Refund = require('../models/refund');
const Order = require('../models/order');
const nodeCache = require('node-cache');

const NodeCache = new nodeCache();

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

        if (order.isRefunded || order.refundStatus === 'Processing') {
            return res.status(400).json({
                success: false,
                message: 'Order refund has already been initiated or processed'
            });
        }

        const refunds = [];
        const updatedReturns = [];

        for (const returnDoc of order.return) {
            if (returnDoc.status === 'Pending') {
                const refundAmount = order.totalPrice;

                const newRefund = new Refund({
                    order: order._id,
                    amount: refundAmount,
                    initiatedAt: new Date(),
                    status: 'Initiated'
                });
                refunds.push(newRefund);

                order.refund.push(newRefund._id);

                returnDoc.status = 'Initiated';
                returnDoc.resolvedAt = new Date();
                updatedReturns.push(returnDoc);
            }
        }

        if (refunds.length > 0) {
            await Refund.insertMany(refunds);
            await Return.bulkWrite(
                updatedReturns.map(returnDoc => ({
                    updateOne: {
                        filter: { _id: returnDoc._id },
                        update: {
                            $set: {
                                status: returnDoc.status,
                                resolvedAt: returnDoc.resolvedAt
                            }
                        }
                    }
                }))
            );
        }

        // Update the order refund status
        order.refundStatus = 'Processing';
        order.refundRequestedAt = new Date();
        await order.save();

        // CLEAR CACHE so the admin panel updates instantly
        NodeCache.del('refunds');
        NodeCache.del('orders');

        res.status(200).json({
            success: true,
            message: 'Refund initiation request sent',
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
        await refund.save();

        // CLEAR CACHE so the DataGrid in React updates immediately
        NodeCache.del('refunds');
        NodeCache.del('orders');

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
        let refunds;

        // FIXED CACHE BUG: Removed the semicolon typo and stopped stringifying arrays
        if (NodeCache.has('refunds')) {
            refunds = NodeCache.get('refunds');
        } else {
            refunds = await Refund.find()
                .populate({
                    path: 'order',
                    select: 'user refundRequestedAt totalPrice',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                .sort('-requestedAt');
                
            NodeCache.set('refunds', refunds);
        }

        res.status(200).json({ success: true, refunds });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};