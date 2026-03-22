const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const reorderSchema = new mongoose.Schema({
    _id: String,
    originalOrder: {
        type: Number,
        ref: 'Order',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Reorder', reorderSchema);
