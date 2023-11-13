const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const orderSchema = new mongoose.Schema({
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
                type: mongoose.Schema.ObjectId,
                ref: 'Product',
                required: true
            }
        }
    ],
    user: {
        type: mongoose.Schema.ObjectId,
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
    DeliveredAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    return: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Return'
        }
    ],
    refund: [
        {
            type: mongoose.Schema.ObjectId,
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
    }
});

module.exports = mongoose.model('Order', orderSchema);
