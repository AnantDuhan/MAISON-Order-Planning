const Return = require('../models/return');
const Order = require('../models/order');
const nodeCache = require('node-cache');
const NodeCache = new nodeCache();

exports.requestReturn = async (req, res) => {
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

        const productsInOrder = order.orderItems.map(item => ({
            product: item.product._id,
            quantity: item.quantity
        }));



        // Create a new Return document for the entire order
        const newReturn = new Return({
            order: order._id,
            products: productsInOrder,
            reason: req.body.returnReason,
            requestedAt: new Date(),
            status: 'Completed'
        });

        await newReturn.save();

        // Update the order to reference the single return request
        order.return.push(newReturn);
        order.isReturned = true;
        order.returnReason = req.body.returnReason;
        order.returnRequestedAt = new Date();
        order.refundStatus = 'Initiated';
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Return requested',
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

// Get all return requests
exports.getAllReturns = async (req, res) => {
    try {
        let returns;

        if (NodeCache.has('returns;')) {
            refunds = JSON.parse(JSON.stringify(NodeCache.get('returns')));
        } else {
            returns = await Return.find()
                .populate({
                    path: 'order',
                    select: 'user returnRequestedAt totalPrice',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                .sort('-requestedAt');
            NodeCache.set('returns', JSON.stringify(returns));
        }

        res.status(200).json({ success: true, returns });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
