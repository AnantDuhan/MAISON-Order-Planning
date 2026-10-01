const mongoose = require('mongoose');

// Generic atomic counters (e.g. invoice serials per financial year).
const counterSchema = new mongoose.Schema({
    _id: String,
    seq: { type: Number, default: 0 },
});

module.exports = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
