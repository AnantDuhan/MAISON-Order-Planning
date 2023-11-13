const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const subscription = new mongoose.Schema({
    subscriptionId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    createdAt: Date
});

module.exports = mongoose.model('Subscription', subscription);
