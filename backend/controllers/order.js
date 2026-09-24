const Order = require('../models/order');
const Product = require('../models/product');
const { sendEmailInBackground } = require('../utils/sendEmail');
const User = require('../models/user');
const cache = require('../utils/cache');
const Reorder = require('../models/reorder');
const generateId = require('../utils/generateId');
const ejs = require('ejs');
const path = require('path');
const { getCashfreeOrder } = require('../utils/cashfree');
const { sendPushNotification } = require('../utils/pushNotifications');
const { priceOrder } = require('../utils/orderPricing');

// Valid forward transitions for an order. Anything else is rejected.
const NEXT_STATUS = {
    Processing: ['Shipped'],
    Shipped: ['Delivered'],
    Delivered: [],
};

const invalidateOrderCaches = (orderId, userId) =>
    cache.del(orderId && `order:${orderId}`, 'orders', userId && `orders:${userId}`);

const randomDeliveryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + Math.floor(Math.random() * 8)); // 0-7 days out
    return d;
};

const canViewOrder = (order, user) =>
    user && (String(order.user?._id || order.user) === String(user._id) || user.role === 'admin');

// create new order
// Prices, totals and the coupon discount are all recomputed on the server and
// the Cashfree payment must be PAID for exactly that amount.
exports.newOrder = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user.isDemo) {
            return res.status(403).json({
                success: false,
                isDemoUser: true,
                message: "Demo accounts cannot place real orders. This is a demonstration account.",
            });
        }

        const { shippingInfo, orderItems, paymentInfo, couponCode } = req.body;

        if (paymentInfo?.provider !== 'cashfree' || typeof paymentInfo.id !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'A completed Cashfree payment is required to place an order',
            });
        }
        if (!paymentInfo.id.startsWith(`order_${req.user._id}_`)) {
            return res.status(403).json({
                success: false,
                message: 'You cannot use this payment for the order',
            });
        }

        const pricing = await priceOrder(orderItems, couponCode);

        const cashfreeOrder = await getCashfreeOrder(paymentInfo.id);
        if (cashfreeOrder.order_status !== 'PAID') {
            return res.status(402).json({
                success: false,
                message: 'Cashfree payment has not been completed',
            });
        }
        if (Math.abs(Number(cashfreeOrder.order_amount) - pricing.totalPrice) > 0.01) {
            return res.status(409).json({
                success: false,
                message: 'The amount paid does not match the order total. Please contact support.',
            });
        }

        const paymentId = String(cashfreeOrder.cf_order_id || paymentInfo.id);

        // Prevent duplicate orders for the same completed payment
        // (protects against double-submit / client retries).
        const existingOrder = await Order.findOne({ 'paymentInfo.id': paymentId }).select('_id');
        if (existingOrder) {
            return res.status(200).json({ success: true, order: existingOrder, deduped: true });
        }

        const estimatedDeliveryDate = randomDeliveryDate();

        const order = await Order.create({
            _id: generateId(),
            shippingInfo,
            orderItems: pricing.orderItems,
            paymentInfo: { id: paymentId, status: 'PAID' },
            itemsPrice: pricing.itemsPrice,
            taxPrice: pricing.taxPrice,
            shippingPrice: pricing.shippingPrice,
            totalPrice: pricing.totalPrice,
            discountedAmount: pricing.discount,
            paidAt: Date.now(),
            user: req.user._id,
            couponUsed: Boolean(pricing.coupon),
            couponCode: pricing.coupon ? pricing.coupon.code : undefined,
            estimatedDeliveryDate,
        });

        await invalidateOrderCaches(order._id, req.user._id);

        sendPushNotification(
            user.pushToken,
            'Order Placed',
            `We've received your order. Estimated delivery: ${estimatedDeliveryDate.toDateString()}.`,
            { orderId: order._id, type: 'order-status' }
        ).catch(() => {});

        const emailMessage = await ejs.renderFile(
            path.join(__dirname, '../mails/order-confirmation.ejs'),
            {
                order,
                user,
                status: 'placed',
                estimatedDeliveryDate: estimatedDeliveryDate.toDateString(),
                orderLink: `${process.env.BACKEND_URL}/go/order/${order._id}`
            }
        );

        sendEmailInBackground({
            email: user.email,
            subject: `Your Order📦 has been placed successfully`,
            html: emailMessage
        });

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Could not place the order'
        });
    }
};

// get single order
exports.getSingleOrder = async (req, res, next) => {
    let order;
    const cacheKey = `order:${req.params.id}`;

    order = await cache.getJSON(cacheKey);
    if (!order) {
        order = await Order.findById(req.params.id).populate(
            'user',
            'name email'
        ).lean();
        if (order) await cache.setJSON(cacheKey, order, 600);
    }

    // Return 404 (not 403) for other users' orders so ids can't be probed.
    if (!order || !canViewOrder(order, req.user)) {
        return res.status(404).json({
            success: false,
            message: 'Order📦 not found with this Id'
        });
    }

    res.status(200).json({
        success: true,
        order
    });
};

// get logged in user order
exports.myOrders = async (req, res, next) => {
    let orders;
    const cacheKey = `orders:${req.user._id}`;

    orders = await cache.getJSON(cacheKey);
    if (!orders) {
        orders = await Order.find({
            user: req.user._id
        }).lean();
        await cache.setJSON(cacheKey, orders);
    }

    res.status(200).json({
        success: true,
        orders
    });
};

exports.getAllOrders = async (req, res, next) => {
    try {
        let orders;
        let totalAmount = 0;

        if (req.user?.isDemo) {
            const demoOrders = await Order.find({ isDemo: true })
                .sort({ createdAt: -1 })
                .limit(100);

            return res.status(200).json({
                success: true,
                demoMode: true,
                orders: demoOrders
            });
        }

        orders = await cache.getJSON('orders');
        if (!orders) {
            orders = await Order.find().sort({ createdAt: -1 }).lean();
            await cache.setJSON('orders', orders);
        }

        // 3. Calculate total amount safely
        if (orders && Array.isArray(orders)) {
            orders.forEach(order => {
                totalAmount += order.totalPrice;
            });
        } else {
            // Safety fallback if cache gets corrupted
            orders = []; 
        }

        res.status(200).json({
            success: true,
            totalAmount,
            orders
        });
        
    } catch (error) {
        console.error("Error fetching all orders:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// update order status --admin
exports.updateOrder = async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order📦 not found with this Id'
            });
        }

        const allowed = NEXT_STATUS[order.orderStatus] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change an order from ${order.orderStatus} to ${status}`
            });
        }

        // Stock leaves the warehouse exactly once, on Processing -> Shipped.
        if (status === 'Shipped') {
            await Promise.all(
                order.orderItems.map(item => updateStock(item.product, item.quantity))
            );
        }

        order.orderStatus = status;
        let estimatedDeliveryDate = null;
        if (status === 'Delivered') {
            order.DeliveredAt = Date.now();
            order.estimatedDeliveryDate = null;
        } else {
            estimatedDeliveryDate = order.estimatedDeliveryDate || randomDeliveryDate();
            order.estimatedDeliveryDate = estimatedDeliveryDate;
        }

        await order.save({ validateBeforeSave: false });

        // Push the new status to the owner viewing this order in real time.
        const io = req.app.get('socketio');
        if (io) {
            io.to(`order:${orderId}`).emit('orderStatusUpdate', {
                orderId,
                orderStatus: order.orderStatus
            });
        }

        await invalidateOrderCaches(orderId, order.user);

        // Notify the customer who placed the order (not the admin making the change).
        const orderOwner = await User.findById(order.user);
        if (orderOwner) {
            sendPushNotification(
                orderOwner.pushToken,
                'Order Update',
                `Your order is now ${order.orderStatus}.`,
                { orderId: order._id, type: 'order-status' }
            ).catch(() => {});

            const emailMessage = await ejs.renderFile(
                path.join(__dirname, '../mails/order-confirmation.ejs'),
                {
                    order,
                    user: orderOwner,
                    status: order.orderStatus,
                    estimatedDeliveryDate: estimatedDeliveryDate ? estimatedDeliveryDate.toDateString() : '',
                    orderLink: `${process.env.BACKEND_URL}/go/order/${order._id}`
                }
            );
            sendEmailInBackground({
                email: orderOwner.email,
                subject: `Your Order📦 Status Update: ${order.orderStatus}`,
                html: emailMessage
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order updated and customer notified',
            order
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Internal Server Error'
        });
    }
};

async function updateStock(id, quantity) {
    const result = await Product.updateOne(
        { _id: id, Stock: { $gte: quantity } },
        { $inc: { Stock: -quantity } }
    );
    if (result.matchedCount === 0) {
        const error = new Error(`Not enough stock for product ${id} to ship this order`);
        error.statusCode = 409;
        throw error;
    }
}

// delete Order -- Admin
exports.deleteOrder = async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order📦 not found with this Id'
        });
    }

    await order.deleteOne();
    await invalidateOrderCaches(order._id, order.user);

    res.status(200).json({
        success: true,
        message: 'Order📦 deleted successfully'
    });
};

// Reorder: return the items of a past order (at current prices, in stock)
// so the client can put them back in the cart and go through checkout.
// It deliberately does NOT create an order — the old one's payment can't be
// reused.
// POST /api/v1/order/reorder/:orderId
exports.reorder = async (req, res, next) => {
    try {
        const originalOrder = await Order.findById(req.params.orderId).lean();

        // Same 404 for missing and not-yours so ids can't be probed.
        if (!originalOrder || String(originalOrder.user) !== String(req.user._id)) {
            return res.status(404).json({
                success: false,
                message: 'Original order not found'
            });
        }

        const ids = originalOrder.orderItems.map(item => String(item.product));
        const products = await Product.find({ _id: { $in: ids } }).select('name price Stock images');
        const byId = new Map(products.map(p => [String(p._id), p]));

        const items = [];
        const unavailable = [];
        for (const item of originalOrder.orderItems) {
            const product = byId.get(String(item.product));
            if (!product || product.Stock < 1) {
                unavailable.push({ product: String(item.product), name: item.name });
                continue;
            }
            items.push({
                product: String(product._id),
                quantity: Math.min(item.quantity, product.Stock),
            });
        }

        await Reorder.create({
            _id: generateId(),
            originalOrder: originalOrder._id
        });

        res.status(200).json({
            success: true,
            items,
            unavailable
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};
