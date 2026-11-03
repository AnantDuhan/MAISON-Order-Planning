/**
 * Public order tracking: "Track your order" with an order number and email,
 * or a signed link from an order email (utils/orderAccess.js).
 */
const Order = require('../models/order');
const {
    normalizeEmail,
    signOrderViewToken,
    verifyOrderViewToken,
    orderContact,
    trackingView,
} = require('../utils/orderAccess');

// Order ids are short lowercase nanoids; anything else can't be an order.
const ORDER_ID = /^[a-z0-9]{6,32}$/;

// One answer for "no such order" and "wrong email", so the form can't be
// used to find out which order numbers exist.
const NOT_FOUND = "We couldn't find an order with those details. Check the order number in your confirmation email.";

const cleanOrderId = value =>
    typeof value === 'string' ? value.trim().replace(/^#/, '').toLowerCase() : '';

const loadOrder = id =>
    Order.findOne({ _id: id, isDemo: { $ne: true } }).populate('user', 'name email').lean();

// POST /api/v1/order/track   { orderId, email }
exports.lookupOrder = async (req, res) => {
    const orderId = cleanOrderId(req.body?.orderId);
    const email = normalizeEmail(req.body?.email);
    if (!ORDER_ID.test(orderId) || !email) {
        return res.status(400).json({ success: false, message: 'Enter your order number and the email you used to order.' });
    }

    const order = await loadOrder(orderId);
    const contact = order && orderContact(order);
    if (!contact || contact.email !== email) {
        return res.status(404).json({ success: false, message: NOT_FOUND });
    }

    res.status(200).json({
        success: true,
        token: signOrderViewToken(order._id),
        order: trackingView(order),
    });
};

// GET /api/v1/order/track/:id   (token in ?t= or the X-Order-Token header)
exports.getTrackedOrder = async (req, res) => {
    const orderId = cleanOrderId(req.params.id);
    const token = req.get('x-order-token') || req.query.t;
    if (!ORDER_ID.test(orderId) || !verifyOrderViewToken(token, orderId)) {
        return res.status(404).json({ success: false, message: 'This tracking link has expired. Look up your order with its number and email instead.' });
    }

    const order = await loadOrder(orderId);
    if (!order) return res.status(404).json({ success: false, message: NOT_FOUND });

    res.status(200).json({ success: true, order: trackingView(order) });
};
