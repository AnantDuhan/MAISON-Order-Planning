const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// One document per switch the admin has changed. Features nobody has touched
// have no document and use their default (services/featureFlags.js).
const featureFlagSchema = new mongoose.Schema({
    _id: String, // the feature key, e.g. "returns"
    enabled: { type: Boolean, required: true },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { id: String, name: String },
});

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
