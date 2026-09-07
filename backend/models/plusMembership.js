const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const subscription = new mongoose.Schema({
    _id: String,
    subscriptionId: {
        type: String,
        required: true
    },
    cashfreeSubscriptionId: String,
    subscriptionSessionId: String,
    planId: String,
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
        type: String,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: 'INITIALIZED'
    },
    nextPaymentDate: Date,
    activationEmailSent: {
        type: Boolean,
        default: false
    },
    activatedAt: Date,
    createdAt: Date
});

module.exports = mongoose.model('Subscription', subscription);
