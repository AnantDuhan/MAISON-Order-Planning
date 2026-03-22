const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const returnProductSchema = new mongoose.Schema({
    _id: String,
    product: {
        type: Number,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
});

const returnSchema = new mongoose.Schema({
    _id: String,
    order: {
        type: Number,
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
