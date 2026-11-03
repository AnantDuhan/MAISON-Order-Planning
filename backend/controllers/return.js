const Return = require('../models/return');
const Order = require('../models/order');
const generateId = require('../utils/generateId');
const cache = require('../utils/cache');
const returnEmails = require('../services/returnEmails');
const { windowDaysFor, returnDeadline, isWithinReturnWindow } = require('../utils/returnWindow');
const { realOnly } = require('../utils/demoFilter');
const { returnLifecycle } = require('../lifecycle/returnLifecycle');

// What an admin can move each return to, for the status menu. Computed per
// request (not cached) so it always matches the rules in force.
const withNextStatuses = returns => returns.map(ret => ({
    ...ret,
    statusLabel: returnLifecycle.label(ret.status),
    nextStatuses: returnLifecycle.next(ret.status, { by: 'admin' }),
}));

exports.requestReturn = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        // Only the customer who placed the order may request a return.
        if (!order || String(order.user) !== String(req.user._id)) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.isReturned || (order.return && order.return.length > 0)) {
            return res.status(409).json({
                success: false,
                message: 'A return has already been requested for this order'
            });
        }

        const reason = typeof req.body.returnReason === 'string' ? req.body.returnReason.trim().slice(0, 120) : '';
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Please choose a reason for the return'
            });
        }
        const details = typeof req.body.returnDetails === 'string' ? req.body.returnDetails.trim().slice(0, 500) : '';

        if (order.orderStatus !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Order has not been delivered yet'
            });
        }

        if (!isWithinReturnWindow(order)) {
            const closed = returnDeadline(order).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
            return res.status(400).json({
                success: false,
                code: 'RETURN_WINDOW_CLOSED',
                message: `Returns for this order were accepted within ${windowDaysFor(order)} days of delivery. The window closed on ${closed}.`
            });
        }

        const productsInOrder = order.orderItems.map(item => ({
            _id: generateId(),
            product: item.product?._id || item.product,
            quantity: item.quantity
        }));

        if (productsInOrder.some(item => !item.product)) {
            return res.status(400).json({
                success: false,
                message: 'This order contains an item without a product reference'
            });
        }

        // Create a new Return document for the entire order
        const newReturn = new Return({
            _id: generateId(),
            order: order._id,
            products: productsInOrder,
            reason,
            ...(details && { details }),
            requestedAt: new Date(),
            status: returnLifecycle.initial
        });

        await newReturn.save();

        // Update the order to reference the single return request
        order.return.push(newReturn._id);
        order.isReturned = true;
        order.returnReason = reason;
        order.returnRequestedAt = new Date();
        order.refundStatus = 'Initiated';
        // Status fields only; don't re-validate the whole historical order.
        await order.save({ validateBeforeSave: false });

        await cache.del('returns', 'orders', `order:${order._id}`, `orders:${order.user}`);

        // Confirm by email; never blocks or fails the request.
        returnEmails.sendReturnEmail('received', order, { reason, details }).catch(() => {});

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
// Get all return requests
exports.getAllReturns = async (req, res) => {
    try {
        // Demo admin must only see synthetic/demo return records.
        if (req.user?.isDemo) {
            const demoReturns = await Return.find({ isDemo: true })
                .populate({
                    path: 'order',
                    // orderItems: name, image and variant of each piece, as bought.
                    select: 'user returnRequestedAt totalPrice orderStatus orderItems',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                .populate({
                    path: 'products.product',
                    select: 'name price images'
                })
                .sort('-requestedAt')
                .limit(100)
                .lean();

            return res.status(200).json({
                success: true,
                demoMode: true,
                returns: withNextStatuses(demoReturns)
            });
        }

        // Real admin flow
        let returns = await cache.getJSON('returns');

        if (!returns) {
            // Real returns only; the demo seed script's are isDemo.
            returns = await Return.find(realOnly())
                .populate({
                    path: 'order',
                    // orderItems: name, image and variant of each piece, as bought.
                    select: 'user returnRequestedAt totalPrice orderStatus orderItems',
                    populate: {
                        path: 'user',
                        select: 'name email'
                    }
                })
                .populate({
                    path: 'products.product',
                    select: 'name price images'
                })
                .sort('-requestedAt')
                .lean();

            await cache.setJSON('returns', returns);
        }

        return res.status(200).json({
            success: true,
            returns: withNextStatuses(returns)
        });
    } catch (error) {
        console.error('Error fetching returns:', error);

        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Admins decide on a request (Approved / Rejected). Moves into and out of
// "Refund started" and to Completed follow the refund (services/refundService.js).
exports.updateReturnStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const returnRequest = await Return.findById(req.params.id);

        if (!returnRequest) {
            return res.status(404).json({
                success: false,
                message: 'Return request not found'
            });
        }

        const before = returnRequest.status;
        const move = returnLifecycle.transition(returnRequest, status, { by: 'admin' });

        if (move.changed) {
            res.locals.audit = {
                before: { status: before },
                after: { status },
                summary: `Return ${returnRequest._id}: ${before} → ${status}`,
            };
            await returnRequest.save();
            await cache.del('returns', 'orders', `order:${returnRequest.order}`);

            // Tell the customer when a decision is made (once per decision).
            const kind = { Approved: 'approved', Rejected: 'declined' }[status];
            if (kind) {
                const order = await Order.findById(returnRequest.order).select('_id user guest totalPrice refundInfo').lean();
                returnEmails.sendReturnEmail(kind, order, { reason: returnRequest.reason, details: returnRequest.details }).catch(() => {});
            }
        }

        res.status(200).json({
            success: true,
            message: move.changed ? `Return status updated to ${status}` : `Return is already ${status}`,
            returnRequest,
            nextStatuses: returnLifecycle.next(returnRequest.status, { by: 'admin' }),
        });
    } catch (error) {
        if (!error.statusCode) console.error(error);
        res.status(error.statusCode || 500).json({
            success: false,
            ...(error.code && { code: error.code }),
            message: error.statusCode ? error.message : 'Server error'
        });
    }
};
