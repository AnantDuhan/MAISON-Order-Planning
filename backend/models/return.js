const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const returnProductSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
});

const returnSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.ObjectId,
        ref: 'Order',
        required: true
    },
    products: [returnProductSchema], // An array of returned products
    reason: {
        type: String,
        required: true
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
    }
});

module.exports = mongoose.model('Return', returnSchema);
