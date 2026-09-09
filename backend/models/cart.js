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
    }
});

module.exports = mongoose.model('Cart', cartSchema);
