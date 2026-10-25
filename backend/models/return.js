const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const returnProductSchema = new mongoose.Schema({
    _id: String,
    product: {
        type: String,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    },
});

const returnSchema = new mongoose.Schema({
    _id: String,
    order: {
        type: String,
        ref: 'Order',
        required: true
    },
    products: [returnProductSchema], // An array of returned products
    reason: {
        type: String,
        required: true
    },
    // Optional free text from the customer ("the left hinge is cracked").
    details: {
        type: String,
        maxlength: 500
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'Pending'
    },
    resolvedAt: {
        type: Date
    },
    approvedAt: {
        type: Date
    }
});

module.exports = mongoose.model('Return', returnSchema);
