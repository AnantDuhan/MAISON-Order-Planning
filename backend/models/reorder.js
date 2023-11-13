const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const reorderSchema = new mongoose.Schema({
    originalOrder: {
        type: mongoose.Schema.ObjectId,
        ref: 'Order',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Reorder', reorderSchema);
