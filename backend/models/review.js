// import mongoose from 'mongoose';
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

const reviewSchema = new mongoose.Schema({
    _id: String,
    user: {
        type: String,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        required: true,
    },
    product: {
        type: String,
        ref: 'Product',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Review', reviewSchema);
