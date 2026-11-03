const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// "Email me when this is back in stock". One pending request per email,
// product and variant: a shopper can wait for Black and Sand separately.
// Signed-in shoppers have `user` set; guests leave only an email.
// Notified requests are kept (notifiedAt set) for demand reporting.
const stockAlertSchema = new mongoose.Schema({
    _id: String,
    product: { type: String, ref: 'Product', required: true },
    // The variant waited for, for products with options. null = the product
    // as a whole (products without options, and requests made before
    // variant alerts existed): any unit back in stock counts.
    variant: { type: String, default: null },
    user: { type: String, ref: 'User', default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    createdAt: { type: Date, default: Date.now },
    notifiedAt: { type: Date, default: null },
    // Members hear about a restock first; everyone else is emailed from this time.
    notifyAfter: { type: Date, default: null },
});

// At most one *pending* request per email, product and variant.
stockAlertSchema.index(
    { product: 1, variant: 1, email: 1 },
    { unique: true, partialFilterExpression: { notifiedAt: null }, name: 'pending_per_email_variant' }
);
stockAlertSchema.index({ product: 1, notifiedAt: 1 });
stockAlertSchema.index({ user: 1, notifiedAt: 1 });

// The index before variant alerts: one pending request per user and product.
// It would stop a shopper waiting for two colours, and guests (user null)
// from waiting at all, so it is dropped on startup (config/database.js).
stockAlertSchema.statics.LEGACY_INDEX = 'product_1_user_1';

module.exports = mongoose.model('StockAlert', stockAlertSchema);
