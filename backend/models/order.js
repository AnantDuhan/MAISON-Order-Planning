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
            // Order lines only need the image URL. No _id of their own: older
            // orders (and seeded demo orders) stored the product's string image
            // ids here, which failed ObjectId casting and made every later
            // save of those orders (return request, refund) fail validation.
            images: [
                {
                    _id: false,
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
        // 'cashfree' or 'wallet' (paid entirely with store credit)
        provider: String,
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
    taxPrice: {
        type: Number,
        default: 0
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
    // Store credit (rupees) used towards totalPrice; the rest was paid online.
    storeCreditApplied: {
        type: Number,
        default: 0
    },
    // Store credit that should have covered part of this order but could no
    // longer be taken when the order was placed (rupees). Needs admin review.
    paymentShortfall: {
        type: Number,
        default: 0
    },
    // Courier shipment and its tracking timeline (services/shipmentService.js).
    shipment: {
        courier: String,
        awb: { type: String, index: true, sparse: true },
        trackingUrl: String,
        shippedAt: Date,
        lastStatus: String,
        lastEventAt: Date,
        events: [
            {
                _id: false,
                status: {
                    type: String,
                    enum: ['Shipped', 'In transit', 'Out for delivery', 'Delivery attempted',
                        'Delayed', 'Delivered', 'Returning to sender'],
                    required: true
                },
                location: String,
                note: String,
                at: { type: Date, required: true },
                source: { type: String, enum: ['admin', 'courier'], default: 'admin' },
                rawStatus: String
            }
        ]
    },
        // Set when this order's stock was taken (at payment for new orders, at
    // shipping for orders placed before checkout holds existed).
    stockCommittedAt: {
        type: Date,
        default: null
    },
    // The customer paid but stock had run out by then (hold expired and
    // someone else bought the last unit). Needs an admin decision.
    stockShortfall: {
        type: Boolean,
        default: false,
        index: true
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
