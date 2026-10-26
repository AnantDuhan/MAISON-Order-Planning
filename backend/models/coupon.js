const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const couponSchema = new mongoose.Schema({
    _id: String,
    code: {
        type: String,
        required: true,
        unique: true
    },
    discount: {
        type: Number,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    },
    // Only Maison members (Essential or Plus) can use it.
    membersOnly: {
        type: Boolean,
        default: false
    },
});

module.exports = mongoose.model('Coupon', couponSchema);
