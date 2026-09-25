const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const orderSchema = new mongoose.Schema({
    _id: String,
    shippingInfo: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pinCode: {
            type: Number,
            required: true
        },
        phoneNumber: {
            type: Number,
            required: true
        }
    },
    orderItems: [
        {
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            images: [
                {
                    url: {
                        type: String,
                        required: true
                    }
                }
            ],
            product: {
                type: String,
                ref: 'Product',
                required: true
            }
        }
    ],
    user: {
        type: String,
        ref: 'User',
        required: true
    },
    paymentInfo: {
        id: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true
        }
    },
    paidAt: {
        type: Date,
        required: true
    },
    itemsPrice: {
        type: Number,
        default: 0,
        required: true
    },
    shippingPrice: {
        type: Number,
        default: 0,
        required: true
    },
    totalPrice: {
        type: Number,
        default: 0,
        required: true
    },
    orderStatus: {
        type: String,
        required: true,
        default: 'Processing'
    },
    estimatedDeliveryDate: {
        type: Date,
        default: null
    },
    DeliveredAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    return: [
        {
            type: String,
            ref: 'Return'
        }
    ],
    refund: [
        {
            type: String,
            ref: 'Refund',
            required: true
        }
    ],

    // Refund details
    isReturned: {
        type: Boolean,
        default: false
    },
    returnRequestedAt: {
        type: Date
    },
    isRefunded: {
        type: Boolean,
        default: false
    },
    refundRequestedAt: {
        type: Date
    },
    refundStatus: {
        type: String,
        default: 'Not Requested'
    },
    refundInfo: {
        id: String,
        amount: Number,
        status: String,
        createdAt: Date
    },
    // Set when a completed refund put the items back into stock, so it can
    // never happen twice for the same order.
    stockRestoredAt: {
        type: Date,
        default: null
    },
    refundedAt: {
        type: Date
    },
    // Coupon details
    couponUsed: {
        type: Boolean,
        default: false
    },
    couponCode: {
        type: String
    },
    discountedAmount: {
        type: Number,
        default: 0
    },
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    },
    paidAt: {
        type: Date,
        required: true
    },
});

// Indexes for hot query paths (myOrders, admin filters, listings) and to
// prevent duplicate orders per completed payment. The paymentInfo.id index is
// partial so COD / null-payment orders are exempt from the unique constraint.
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index(
    { 'paymentInfo.id': 1 },
    { unique: true, partialFilterExpression: { 'paymentInfo.id': { $type: 'string' } } }
);

module.exports = mongoose.model('Order', orderSchema);
