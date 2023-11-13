const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const refundSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.ObjectId,
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
