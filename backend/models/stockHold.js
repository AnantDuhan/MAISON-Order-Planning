const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// Stock set aside for one checkout attempt, between "Pay" and the order being
// created. Product.Stock is already decremented while a hold is active; the
// hold remembers what to give back if the payment never completes.
//
//   active   -> consumed  (order created from this payment)
//   active   -> released  (expired, abandoned, or payment session failed)
const stockHoldSchema = new mongoose.Schema({
    _id: String,
    user: { type: String, ref: 'User', required: true, index: true },
    // The Cashfree order id this hold was created for (one hold per attempt).
    cashfreeOrderId: { type: String, required: true, unique: true },
    items: [
        {
            _id: false,
            product: { type: String, ref: 'Product', required: true },
            variant: String,
            quantity: { type: Number, required: true, min: 1 },
        },
    ],
    status: {
        type: String,
        enum: ['active', 'consumed', 'released'],
        default: 'active',
    },
    expiresAt: { type: Date, required: true },
    // Store credit (rupees) taken for this checkout; given back if released.
    walletApplied: { type: Number, default: 0 },
    order: { type: String, ref: 'Order' },
    releaseReason: String,
    createdAt: { type: Date, default: Date.now },
    consumedAt: Date,
    releasedAt: Date,
});

stockHoldSchema.index({ status: 1, expiresAt: 1 });
// Keep finished holds for 30 days for debugging, then let Mongo drop them.
stockHoldSchema.index(
    { releasedAt: 1 },
    { expireAfterSeconds: 30 * 24 * 3600, partialFilterExpression: { status: 'released' } }
);

module.exports = mongoose.model('StockHold', stockHoldSchema);
