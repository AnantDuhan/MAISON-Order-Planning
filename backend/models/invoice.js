const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// An invoice is an immutable snapshot of what was billed at the moment of
// payment. Line items and buyer details are copied in (not referenced) so that
// later edits to products, prices or the user's profile never change an
// invoice that has already been issued.
const invoiceSchema = new mongoose.Schema({
    _id: String,
    invoiceNumber: { type: String, required: true, unique: true }, // MSN/26-27/000123
    type: { type: String, enum: ['order', 'membership'], required: true },
    // order._id for orders, Cashfree cf_payment_id for membership charges
    sourceId: { type: String, required: true },
    order: { type: String, ref: 'Order' },
    membership: { type: String, ref: 'Subscription' },
    user: { type: String, ref: 'User', required: true },
    billedTo: {
        name: String,
        email: String,
        address: String,
        city: String,
        state: String,
        country: String,
        pinCode: String,
        phone: String,
    },
    lines: [
        {
            _id: false,
            description: { type: String, required: true },
            quantity: { type: Number, required: true },
            unitPrice: { type: Number, required: true },
            amount: { type: Number, required: true },
        },
    ],
    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    couponCode: String,
    paymentRef: String,
    issuedAt: { type: Date, default: Date.now },
    emailStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending',
    },
    emailAttempts: { type: Number, default: 0 },
    lastEmailError: String,
    isDemo: { type: Boolean, default: false },
});

// Exactly one invoice per order / per membership charge, even when a hook
// fires twice (double submit, webhook retry, backfill re-run).
invoiceSchema.index({ type: 1, sourceId: 1 }, { unique: true });
invoiceSchema.index({ user: 1, issuedAt: -1 });
invoiceSchema.index({ emailStatus: 1, issuedAt: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
