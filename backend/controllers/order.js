const Order = require('../models/order');
const Product = require('../models/product');
const sendEmail = require('../utils/sendEmail');
// const accountSid = process.env.ACCOUNT_SID;
// const authToken = process.env.AUTH_TOKEN;
// const client = require('twilio')(accountSid, authToken);
const User = require('../models/user');
const Coupon = require('../models/Coupon');
const stripe = require('stripe')(
    'sk_test_51K9RkSSDvITsgzEymgWGmrPCCP0Iu8b8j2AtRaZbnuXqwSLkQMSnTc6a6gQmRRzT60nP0KMhApPEpASMOPP3GgGh00rlK3KQm2'
);
const nodeCache = require('node-cache');
const NodeCache = new nodeCache();

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

            let discountedTotalPrice = totalPrice;
            if (coupon) {
                if (
                    totalPrice >= coupon.minOrderAmount &&
                    totalPrice <= coupon.maxOrderAmount
                ) {
                    discountedTotalPrice =
                        totalPrice -
                        (totalPrice * coupon.discountPercent) / 100;
                }
            }

            // Modify the orderItems to include the image data
            const orderItemsWithImages = await Promise.all(
                orderItems.map(async item => {
                    const product = await Product.findById(item.product);
                    if (product) {
                        return {
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            images: product.images, // Include the images from the product
                            product: item.product
                        };
                    }
                })
            );

            const order = await Order.create({
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

            const imageUrl = order.orderItems.image;

            const emailMessage = `<html>
    <body>
        <p>Hello ${user.name}!</p>
        <p>Your order📦 has been placed successfully. Your estimated Date of delivery is ${estimatedDeliveryDate.toDateString()}.</p>
        <img src="${imageUrl}" alt="Ordered Items">
        <p>Thank you for ordering. For more please visit our website <a href="http://www.orderplanning.com">www.orderplanning.com</a>.</p>
        <p>Here's the image of your ordered items:</p>
        <p>Happy Shopping.😊</p>
    </body>
    </html>`;

            // For WhatsApp, use the same message without HTML tags
//             const whatsappMessage = `Hello ${user.name}!\n
//    Your order📦 has been placed successfully. Your estimated Date of delivery is ${estimatedDeliveryDate.toDateString()}.\n
//    Your Order Details:
//    Order ID: ${order._id}
//    Items:
//       ${order.orderItems
//           .map(
//               item =>
//                   `${item.name} - Quantity: ${item.quantity} - Price: ₹${item.price}`
//           )
//           .join('\n')}
//    Total Price: ₹${order.totalPrice}

//    Thank you for ordering. For more please visit our website http://www.orderplanning.com.\n
//    Happy Shopping.😊`;

//             await client.messages.create({
//                 body: whatsappMessage,
//                 from: 'whatsapp:+14155238886',
//                 to: `whatsapp:+91${order.shippingInfo.phoneNumber}`,
//                 mediaUrl: [imageUrl]
//             });

            await sendEmail({
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
    if (NodeCache.has('order')) {
        order = JSON.parse(JSON.stringify(NodeCache.get('order')));
    } else {
        order = await Order.findById(req.params.id).populate(
            'user',
            'name email'
        );
        NodeCache.set('order', JSON.stringify(order));
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

    if (NodeCache.has('orders')) {
        orders = JSON.parse(JSON.stringify(NodeCache.get('orders')));
    } else {
        orders = await Order.find({
            user: req.user._id
        });;
        NodeCache.set('orders', JSON.stringify(orders));
    }

    res.status(200).json({
        success: true,
        orders
    });
};

// get all orders --admin
exports.getAllOrders = async (req, res, next) => {
    let orders;
    let totalAmount = 0;

    if (NodeCache.has('orders')) {
        orders = JSON.parse(JSON.stringify(NodeCache.get('orders')));
    } else {
        orders = await Order.find();
        NodeCache.set('orders', JSON.stringify(orders));
    }

    orders.forEach(order => {
        totalAmount += order.totalPrice;
    });

    res.status(200).json({
        success: true,
        totalAmount,
        orders
    });
};

// update order status --admin
exports.updateOrder = async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const order = await getOrderFromCache(orderId);

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
            order.orderItems.forEach(async o => {
                await updateStock(o.product, o.quantity);
            });
        }

        order.orderStatus = req.body.status;

        if (req.body.status === 'Delivered') {
            order.DeliveredAt = Date.now();
            order.estimatedDeliveryDate = null;
        }

        // Save the updated order
        await order.save({ validateBeforeSave: false });

        // Clear the cache for the updated order
        NodeCache.del(orderId);

        const randomDays = Math.floor(Math.random() * 8); // Generate random number between 0 and 7
        const currentDate = new Date();
        const estimatedDeliveryDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate() + randomDays
        ); // Add random days

        const imageUrl = order.orderItems.image;

        const emailMessage = `<html>
    <body>
        <p>Hello ${user.name}!</p>
        <p>Your order📦 ${order._id} has been ${
            order.orderStatus
        }. Your estimated Date of delivery is ${estimatedDeliveryDate.toDateString()}.</p>
        <img src="${imageUrl}" alt="Ordered Items">
        <p>Thank you for ordering. For more please visit our website <a href="http://www.orderplanning.com">www.orderplanning.com</a>.</p>
        <p>Here's the image of your ordered items:</p>
        <p>Happy Shopping.😊</p>
    </body>
    </html>`;

        // For WhatsApp, use the same message without HTML tags
        //     const whatsappMessage = `Hello ${user.name}!\n
        // Your order📦 ${order._id} has been ${
        //         order.orderStatus
        //     }. Your estimated Date of delivery is ${estimatedDeliveryDate.toDateString()}.\n
        // Your Order Details:
        // Order ID: ${order._id}
        // Items:
        // ${order.orderItems
        //     .map(
        //         item =>
        //             `${item.name} - Quantity: ${item.quantity} - Price: ₹${item.price}`
        //     )
        //     .join('\n')}
        // Total Price: ₹${order.totalPrice}
        // Thank you for ordering. For more please visit our website http://www.orderplanning.com.\n
        // Happy Shopping.😊`;

        //     await client.messages.create({
        //         mediaUrl: [imageUrl],
        //         body: whatsappMessage,
        //         from: 'whatsapp:+14155238886',
        //         to: `whatsapp:+91${order.shippingInfo.phoneNumber}`
        //     });

        await sendEmail({
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
    let order = NodeCache.get(orderId);

    // If not in the cache, fetch from the database
    if (!order) {
        order = await Order.findById(orderId);

        // Cache the order data for future use
        if (order) {
            NodeCache.set(orderId, order);
        }
    }

    return order;
}

async function updateStock(id, quantity) {
    const product = await Product.findById(id);
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
