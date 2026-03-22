const mongoose = require('mongoose');
const Order = require('../models/order'); // Update the path to your model

async function migrate() {
    try {
        // Connect to your MongoDB database
        mongoose.connect('mongodb://localhost:27017/e-commerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Fetch all orders
        const orders = await Order.find();

        // Update each order with new fields
        for (const order of orders) {
            order.isReturned = false;
            order.returnReason = null;
            order.returnRequestedAt = null;
            order.isRefunded = false;
            order.refundAmount = 0;
            order.refundRequestedAt = null;
            order.refundedAt = null;
            order.refundStatus = null;
            order.refundInfo = {
                id: null,
                amount: 0,
                status: null,
                createdAt: null
            };
            order.couponUsed = false;
            order.couponCode = null;
            order.discountedAmount = 0;
            await order.save();
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        // Disconnect from the database when done
        mongoose.disconnect();
    }
}

// Run the migration
migrate();
