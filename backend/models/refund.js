const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const refundSchema = new mongoose.Schema({
    _id: String,
    order: {
        type: Number,
        ref: 'Order',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    initiatedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'Initiated'
    },
    completedAt: {
        type: Date
    }
});

module.exports = mongoose.model('Refund', refundSchema);
