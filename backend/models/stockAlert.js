const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// "Email me when this is back in stock" — one pending request per user and
// product. Notified requests are kept (notifiedAt set) for demand reporting.
const stockAlertSchema = new mongoose.Schema({
    _id: String,
    product: { type: String, ref: 'Product', required: true },
    user: { type: String, ref: 'User', required: true },
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    notifiedAt: { type: Date, default: null },
});

// At most one *pending* request per user per product.
stockAlertSchema.index(
    { product: 1, user: 1 },
    { unique: true, partialFilterExpression: { notifiedAt: null } }
);
stockAlertSchema.index({ product: 1, notifiedAt: 1 });

module.exports = mongoose.model('StockAlert', stockAlertSchema);
