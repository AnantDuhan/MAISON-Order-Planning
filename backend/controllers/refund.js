const Return = require('../models/return');
const Refund = require('../models/refund');
const Order = require('../models/order');
const stripe = require('stripe')(
    'sk_test_51K9RkSSDvITsgzEymgWGmrPCCP0Iu8b8j2AtRaZbnuXqwSLkQMSnTc6a6gQmRRzT60nP0KMhApPEpASMOPP3GgGh00rlK3KQm2'
);
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

        // Check if there are any returns associated with this order
        if (order.return.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No returns found for this order'
            });
        }

        // Check if the order has already been refunded
        if (order.isRefunded) {
            return res.status(400).json({
                success: false,
                message: 'Order has already been refunded'
            });
        }

        const refunds = [];
        const updatedReturns = [];

        // Create new Refund documents and update Return documents
        for (const returnDoc of order.return) {
            if (returnDoc.status === 'Pending') {
                // Set the refund amount to the order's total price
                const refundAmount = order.totalPrice;

                // Create a new Refund document with the refund amount
                const newRefund = new Refund({
                    order: order._id,
                    amount: refundAmount
                });
                refunds.push(newRefund);

                // Push the new refund object's _id into the refund array in order model
                order.refund.push(newRefund._id);

                // Update the Return document
                returnDoc.status = 'Initiated';
                returnDoc.resolvedAt = new Date();
                updatedReturns.push(returnDoc);
            }
        }

        // Save the new Refund documents and update the Return documents
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

        const newRefund = new Refund({
            order: order._id,
            amount: order.totalPrice,
            initiatedAt: new Date(),
            status: 'Initiated'
        });

        await newRefund.save();
        order.refund.push(newRefund._id);

        // Update the order refund status and refund requested timestamp
        order.isRefunded = true;
        order.refundStatus = 'Processing';
        order.refundRequestedAt = new Date();
        await order.save();

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

            if (!refund) {
                return res.status(404).json({
                    success: false,
                    message: 'Refund not found'
                });
            }

            if (!refundStatus) {
                return res.status(400).json({
                    success: false,
                    message: 'Refund status is required'
                });
            }

            if (
                refundStatus !== 'Pending' &&
                refundStatus !== 'Approved' &&
                refundStatus !== 'Rejected' &&
                refundStatus !== 'Refunded'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid refund status'
                });
            }

            if (refundStatus === 'Refunded') {
                await stripe.refunds.create({
                    payment_intent: order.paymentInfo.id,
                    amount: Math.round(order.totalPrice)
                });
            }

            // Update order with refund info
            order.isRefunded = true;
            order.refundStatus = 'Refunded';
            order.refund.push(refund._id); // Push the refund _id to the refunds array
            order.refundedAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later
            await order.save();

            refund.status = 'Refunded';
            await refund.save();

            res.status(200).json({
                success: true,
                message: 'Refund status updated successfully',
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

        if (NodeCache.has('refunds;')) {
            refunds = JSON.parse(JSON.stringify(NodeCache.get('refunds')));
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
            NodeCache.set('refunds', JSON.stringify(refunds));
        }

        res.status(200).json({ success: true, refunds });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
