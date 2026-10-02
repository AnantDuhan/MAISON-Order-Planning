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
const { sendOrderConfirmationWithInvoice } = require('../services/invoiceService');
const inventory = require('../services/inventoryService');
const shipments = require('../services/shipmentService');
const cartRecovery = require('../services/cartRecoveryService');
const wallet = require('../services/walletService');
const { renderPackingSlip } = require('../utils/packingSlipPdf');
const logger = require('../config/logger');

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

        if (!user) {
            return res.status(401).json({ success: false, message: 'Please log in to place an order' });
        }

        if (user.isDemo) {
            return res.status(403).json({
                success: false,
                isDemoUser: true,
                message: "Demo accounts cannot place real orders. This is a demonstration account.",
            });
        }

        const { shippingInfo, orderItems, paymentInfo, couponCode } = req.body;

        const provider = paymentInfo?.provider;
        if (!['cashfree', 'wallet'].includes(provider) || typeof paymentInfo.id !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'A completed payment is required to place an order',
            });
        }
        if (!paymentInfo.id.startsWith(`order_${req.user._id}_`)) {
            return res.status(403).json({
                success: false,
                message: 'You cannot use this payment for the order',
            });
        }

        // Stock isn't checked here: it was held for this payment at checkout
        // (and may now read 0 because this customer holds the last unit).
        const pricing = await priceOrder(orderItems, couponCode, { checkStock: false });

        // Store credit taken at checkout is recorded on the checkout's hold.
        const hold = await inventory.getHold(paymentInfo.id);
        if (hold && String(hold.user) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'You cannot use this payment for the order' });
        }
        const walletApplied = hold?.walletApplied || 0;

        let paymentId;
        if (provider === 'wallet') {
            // Paid entirely with store credit: no gateway involved.
            if (!hold) {
                return res.status(402).json({ success: false, message: 'Checkout not found. Please try again.' });
            }
            if (Math.abs(walletApplied - pricing.totalPrice) > 0.01) {
                return res.status(409).json({
                    success: false,
                    message: 'Store credit does not cover this order. Please go through checkout again.',
                });
            }
            paymentId = `wallet_${paymentInfo.id}`;
        } else {
            const cashfreeOrder = await getCashfreeOrder(paymentInfo.id);
            if (cashfreeOrder.order_status !== 'PAID') {
                return res.status(402).json({
                    success: false,
                    message: 'Cashfree payment has not been completed',
                });
            }
            const dueOnline = Math.round((pricing.totalPrice - walletApplied) * 100) / 100;
            if (Math.abs(Number(cashfreeOrder.order_amount) - dueOnline) > 0.01) {
                return res.status(409).json({
                    success: false,
                    message: 'The amount paid does not match the order total. Please contact support.',
                });
            }
            paymentId = String(cashfreeOrder.cf_order_id || paymentInfo.id);
        }

        // Prevent duplicate orders for the same completed payment
        // (protects against double-submit / client retries).
        const existingOrder = await Order.findOne({ 'paymentInfo.id': paymentId }).select('_id');
        if (existingOrder) {
            return res.status(200).json({ success: true, order: existingOrder, deduped: true });
        }

        const estimatedDeliveryDate = randomDeliveryDate();
        const orderId = generateId();

        // Take the stock that was held when the customer started paying. If the
        // hold expired meanwhile, take it now; if it has gone, the order is
        // still created (the customer has paid) and flagged for admin review.
        const stock = await inventory.commitForOrder({
            cashfreeOrderId: paymentInfo.id,
            orderId,
            items: pricing.orderItems,
        });
        if (stock.shortfall) {
            logger.error({ orderId, payment: paymentId, reason: stock.message },
                'order paid but stock ran out — needs admin review');
        }

        // If the hold had expired, its store credit was given back: take it again.
        let paymentShortfall = 0;
        if (stock.source === 'late' && walletApplied > 0) {
            try {
                await wallet.retakeForCheckout({ userId: req.user._id, checkoutId: paymentInfo.id, amountRupees: walletApplied });
            } catch (error) {
                if (provider === 'wallet') {
                    if (stock.committed) await inventory.restoreStock(pricing.orderItems).catch(() => {});
                    return res.status(409).json({
                        success: false,
                        message: 'Your checkout expired and the store credit is no longer available. Nothing was charged.',
                    });
                }
                paymentShortfall = walletApplied;
                logger.error({ orderId, payment: paymentId, walletApplied },
                    'order paid online but store credit could not be re-applied — needs admin review');
            }
        }

        let order;
        try {
            order = await Order.create({
                _id: orderId,
                shippingInfo,
                orderItems: pricing.orderItems,
                paymentInfo: { id: paymentId, status: 'PAID', provider },
                storeCreditApplied: walletApplied - paymentShortfall,
                paymentShortfall,
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
                stockCommittedAt: stock.committed ? new Date() : null,
                stockShortfall: stock.shortfall,
            });
        } catch (error) {
            // Don't keep stock for an order that doesn't exist.
            if (stock.committed) await inventory.restoreStock(pricing.orderItems).catch(() => {});
            throw error;
        }

        await invalidateOrderCaches(order._id, req.user._id);

        // Credit a recent cart reminder, if there was one.
        cartRecovery.markRecovered(req.user._id, order).catch(() => {});

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

        // Generates the invoice and sends the confirmation with the PDF attached,
        // after the response has gone out.
        sendOrderConfirmationWithInvoice({
            order,
            user,
            sender: "support",
            subject: `Your Order📦 has been placed successfully`,
            html: emailMessage
        });

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        logger.error({ err: error, userId: req.user?._id }, 'Order creation failed');
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
        const { status, courier, awb, trackingUrl } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order📦 not found with this Id'
            });
        }

        const auditBefore = { orderStatus: order.orderStatus, awb: order.shipment?.awb, courier: order.shipment?.courier };
        const allowed = NEXT_STATUS[order.orderStatus] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change an order from ${order.orderStatus} to ${status}`
            });
        }

        // Orders placed since checkout holds took their stock at payment time.
        // Older orders (no stockCommittedAt) still take it here, exactly once.
        if (status === 'Shipped' && !order.stockCommittedAt) {
            await Promise.all(
                order.orderItems.map(item => updateStock(item.product, item.quantity))
            );
        }

        if (status === 'Shipped' && !order.stockCommittedAt) {
            order.stockCommittedAt = new Date();
        }

        if (status === 'Shipped') {
            shipments.applyShipped(order, { courier, awb, trackingUrl });
        }
        if (status === 'Delivered') {
            // Keep the timeline complete when an admin marks delivery by hand.
            order.shipment = order.shipment || { events: [] };
            order.shipment.events = [...(order.shipment.events || []),
                { status: 'Delivered', at: new Date(), source: 'admin' }];
            order.shipment.lastStatus = 'Delivered';
            order.shipment.lastEventAt = new Date();
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
        res.locals.audit = {
            before: auditBefore,
            after: { orderStatus: order.orderStatus, awb: order.shipment?.awb, courier: order.shipment?.courier },
            summary: `Order ${order._id}: ${auditBefore.orderStatus} → ${order.orderStatus}`,
        };

        // Push the new status to the owner viewing this order in real time.
        const io = req.app.get('socketio');
        if (io) {
            io.to(`order:${orderId}`).emit('orderStatusUpdate', {
                orderId,
                orderStatus: order.orderStatus,
                shipment: order.shipment
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
                sender: "support",
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

    // An unshipped order's stock goes back on the shelf.
    if (order.stockCommittedAt && !order.stockRestoredAt && !order.isRefunded
        && order.orderStatus === 'Processing') {
        await inventory.restoreStock(order.orderItems);
    }

    await order.deleteOne();
    await invalidateOrderCaches(order._id, order.user);
    res.locals.audit = {
        before: { orderStatus: order.orderStatus, totalPrice: order.totalPrice, user: String(order.user) },
        summary: `Deleted order ${order._id} (₹${order.totalPrice}, ${order.orderStatus})`,
    };

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

// ---- Shipment tracking -------------------------------------------------------

// POST /api/v1/admin/order/:id/tracking   { status, location?, note?, at? }
exports.addTrackingEvent = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order📦 not found with this Id' });
        }
        const result = await shipments.addTrackingEvent(order, req.body || {}, {
            source: 'admin',
            io: req.app?.get('socketio'),
        });
        res.locals.audit = { summary: `Tracking: ${req.body?.status}${req.body?.location ? ` at ${req.body.location}` : ''}` };
        res.status(200).json({
            success: true,
            added: result.added,
            delivered: result.delivered,
            shipment: order.shipment,
            orderStatus: order.orderStatus,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : 'Could not add the tracking event',
        });
    }
};

// PATCH /api/v1/admin/order/:id/shipment   { courier?, awb?, trackingUrl? }
exports.updateShipment = async (req, res) => {
    const { courier, awb, trackingUrl } = req.body || {};
    const order = await shipments.updateShipmentDetails(req.params.id, { courier, awb, trackingUrl });
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order📦 not found with this Id' });
    }
    res.status(200).json({ success: true, shipment: order.shipment });
};

// GET /api/v1/admin/order/:id/packing-slip
exports.packingSlip = async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'name').lean();
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order📦 not found with this Id' });
    }
    const pdf = await renderPackingSlip(order);
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdf.length,
        'Content-Disposition': `inline; filename="packing-slip-${order._id}.pdf"`,
        'Cache-Control': 'private, no-store',
    });
    res.send(pdf);
};
