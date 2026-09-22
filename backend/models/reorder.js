const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const reorderSchema = new mongoose.Schema({
    _id: String,
    originalOrder: {
        type: String,
        ref: 'Order',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    },
});

module.exports = mongoose.model('Reorder', reorderSchema);
