const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        image: String,
        size: String,
        variant: String,
    variantLabel: String,
    quantity: {
            type: Number,
            required: true,
            min: 1
        }
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema({
    _id: String,
    user: {
        type: String,
        ref: 'User',
        required: true,
        unique: true
    },
    items: {
        type: [cartItemSchema],
        default: []
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Abandoned-cart reminders (services/cartRecoveryService.js). A "cycle" is
    // one period of inactivity, identified by the cart's updatedAt when the
    // first reminder went out; editing the cart starts a new cycle.
    recovery: {
        cycle: Date,
        emailsSent: { type: Number, default: 0 },
        lastEmailAt: Date,
        clickedAt: Date,
        recoveredAt: Date,
        recoveredOrder: String,
        recoveredValue: Number
    }
});

cartSchema.index({ updatedAt: 1 });
cartSchema.index({ 'recovery.lastEmailAt': 1 });

module.exports = mongoose.model('Cart', cartSchema);
