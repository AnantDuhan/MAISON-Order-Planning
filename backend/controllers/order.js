const Order = require('../models/order');
const Product = require('../models/product');
const sendEmail = require('../utils/sendEmail');
const { sendEmailInBackground } = require('../utils/sendEmail');
const User = require('../models/user');
const Coupon = require('../models/coupon');
const nodeCache = require('node-cache');
const NodeCache = new nodeCache({ useClones: false });
const Reorder = require('../models/reorder');
const generateId = require('../utils/generateId');
const ejs = require('ejs');
const path = require('path');
const { getCashfreeOrder } = require('../utils/cashfree');

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

// create new order
exports.newOrder = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        const {
            shippingInfo,
            orderItems,
            paymentInfo,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
            couponCode
        } = req.body;

        const coupon = await Coupon.findOne({ code: couponCode });

        if (paymentInfo?.provider === 'cashfree') {
            if (!paymentInfo.id || !paymentInfo.id.startsWith(`order_${req.user._id}_`)) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot use this payment for the order',
                });
            }
            const cashfreeOrder = await getCashfreeOrder(paymentInfo.id);
            if (
                cashfreeOrder.order_status !== 'PAID'
            ) {
                return res.status(402).json({
                    success: false,
                    message: 'Cashfree payment has not been completed',
                });
            }
            paymentInfo.status = 'PAID';
            paymentInfo.id = cashfreeOrder.cf_order_id || paymentInfo.id;
        }

        let discountedTotalPrice = totalPrice;
        if (coupon) {
            if (
                totalPrice >= coupon.minOrderAmount &&
                totalPrice <= coupon.maxOrderAmount
            ) {
                discountedTotalPrice =
                    totalPrice - (totalPrice * coupon.discountPercent) / 100;
            }
        }

        // Modify the orderItems to include the image data
        const orderItemsWithImages = await Promise.all(
            orderItems.map(async item => {
                const product = await Product.findById(item.product);
                if (!product) {
                    const error = new Error(`Product ${item.product} not found`);
                    error.statusCode = 404;
                    throw error;
                }

                return {
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    images: product.images,
                    product: item.product
                };
            })
        );

        const order = await Order.create({
            _id: generateId(),
            shippingInfo,
            orderItems: orderItemsWithImages,
            paymentInfo,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice: discountedTotalPrice,
            paidAt: Date.now(),
            user: req.user._id,
            couponUsed: coupon ? true : false,
            couponCode: couponCode
        });

        const randomDays = Math.floor(Math.random() * 8); // Generate random number between 0 and 7
        const currentDate = new Date();
        const estimatedDeliveryDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() + randomDays
        ); // Add random days

        const emailMessage = await ejs.renderFile(
            path.join(__dirname, '../mails/order-confirmation.ejs'),
            {
                order,
                user,
                status: 'placed',
                estimatedDeliveryDate: estimatedDeliveryDate.toDateString()
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
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// get single order
exports.getSingleOrder = async (req, res, next) => {
    let order;
    const cacheKey = `order:${req.params.id}`;

    if (NodeCache.has(cacheKey)) {
        order = NodeCache.get(cacheKey);
    } else {
        order = await Order.findById(req.params.id).populate(
            'user',
            'name email'
        ).lean();
        NodeCache.set(cacheKey, order);
    }

    if (!order) {
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

    if (NodeCache.has(cacheKey)) {
        orders = NodeCache.get(cacheKey);
    } else {
        orders = await Order.find({
            user: req.user._id
        }).lean();
        NodeCache.set(cacheKey, orders);
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

        // 1. Check if it's in the cache
        if (NodeCache.has('orders')) {
            orders = NodeCache.get('orders');
        } else {
            // 2. If not in cache, get from DB
            orders = await Order.find().lean();
            
            NodeCache.set('orders', orders);
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
        const order = await Order.findById(orderId);

        const user = await User.findById(req.user._id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order📦 not found with this Id'
            });
        }

        if (order.orderStatus === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'You have already delivered this order'
            });
        }

        if (req.body.status === 'Shipped') {
            await Promise.all(
                order.orderItems.map(item => updateStock(item.product, item.quantity))
            );
        }

        order.orderStatus = req.body.status;

        if (req.body.status === 'Delivered') {
            order.DeliveredAt = Date.now();
            order.estimatedDeliveryDate = null;
        }

        // Save the updated order
        await order.save({ validateBeforeSave: false });

        // Push the new status to anyone viewing this order in real time.
        const io = req.app.get('socketio');
        if (io) {
            io.to(`order:${orderId}`).emit('orderStatusUpdate', {
                orderId,
                orderStatus: order.orderStatus
            });
        }

        // Clear the cache for the updated order
        NodeCache.del(orderId);
        NodeCache.del(`order:${orderId}`);
        NodeCache.del('orders');
        NodeCache.del(`orders:${order.user}`);

        const randomDays = Math.floor(Math.random() * 8); // Generate random number between 0 and 7
        const currentDate = new Date();
        const estimatedDeliveryDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() + randomDays
        ); // Add random days

        const emailMessage = await ejs.renderFile(
            path.join(__dirname, '../mails/order-confirmation.ejs'),
            {
                order,
                user,
                status: order.orderStatus,
                estimatedDeliveryDate: estimatedDeliveryDate.toDateString()
            }
        );
        sendEmailInBackground({
            email: user.email,
            subject: `Your Order📦 Status Update: ${order.orderStatus}`,
            html: emailMessage
        });

        res.status(200).json({
            success: true,
            message: 'WhatsApp & Email sent successfully',
            order
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

async function getOrderFromCache(orderId) {
    // Check if order data is in the cache
    const cacheKey = `order:${orderId}`;
    let order = NodeCache.get(cacheKey);

    // If not in the cache, fetch from the database
    if (!order) {
        order = await Order.findById(orderId);

        // Cache the order data for future use
        if (order) {
            NodeCache.set(cacheKey, order);
        }
    }

    return order;
}

async function updateStock(id, quantity) {
    const product = await Product.findById(id);
    if (!product) {
        const error = new Error(`Product ${id} not found for order stock update`);
        error.statusCode = 404;
        throw error;
    }
    product.Stock -= quantity;
    await product.save({ validateBeforeSave: false });
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

    await order.remove();

    res.status(200).json({
        success: true,
        message: 'Order📦 deleted successfully'
    });
};

// Re-place a past order as a fresh order for the same user.
// POST /api/v1/order/reorder/:orderId
exports.reorder = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        const originalOrder = await Order.findById(orderId);

        if (!originalOrder) {
            return res.status(404).json({
                success: false,
                message: 'Original order not found'
            });
        }

        // A user may only reorder their own order.
        if (String(originalOrder.user) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'You are not allowed to reorder this order'
            });
        }

        // Clone the purchasable content into a brand-new order. `_id` is a
        // required String across all models, so it must be generated
        // explicitly. Status/refund/return flags reset to a fresh order.
        const newOrder = await Order.create({
            _id: generateId(),
            shippingInfo: originalOrder.shippingInfo,
            orderItems: originalOrder.orderItems,
            user: req.user._id,
            paymentInfo: originalOrder.paymentInfo,
            paidAt: Date.now(),
            itemsPrice: originalOrder.itemsPrice,
            shippingPrice: originalOrder.shippingPrice,
            totalPrice: originalOrder.totalPrice,
            orderStatus: 'Processing'
        });

        // Audit trail linking the new order back to the one it was copied from.
        await Reorder.create({
            _id: generateId(),
            originalOrder: originalOrder._id
        });

        res.status(200).json({
            success: true,
            order: newOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};
