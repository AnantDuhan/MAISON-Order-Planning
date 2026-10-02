const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// An invoice is an immutable snapshot of what was billed at the moment of
// payment. Line items and buyer details are copied in (not referenced) so that
// later edits to products, prices or the user's profile never change an
// invoice that has already been issued.
const invoiceSchema = new mongoose.Schema({
    _id: String,
    invoiceNumber: { type: String, required: true, unique: true }, // MSN/26-27/000123
    type: { type: String, enum: ['order', 'membership', 'credit-note'], required: true },
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

    // ---- Credit notes ----------------------------------------------------------
    // A credit note reverses (part of) an issued invoice. The original invoice
    // is never edited; it is linked from here and shows as refunded.
    creditNoteFor: { type: String, ref: 'Invoice', index: true, sparse: true },
    creditNoteForNumber: String,
    refund: { type: String, ref: 'Refund' },
    refundMethod: { type: String, enum: ['original', 'store-credit'] },
    reason: String,
    // Store credit used to pay this invoice (part of total).
    storeCreditApplied: { type: Number, default: 0 },

    // ---- Authenticity --------------------------------------------------------
    hashVersion: { type: Number, default: 1 },
    // SHA-256 of the canonical billed content (utils/invoiceSigning.js).
    contentHash: { type: String, index: true },
    // Lifecycle. The billed content never changes; only this does. A refunded
    // invoice stays genuine but shows as refunded on the public verify page.
    status: {
        type: String,
        enum: ['issued', 'refunded', 'cancelled'],
        default: 'issued',
    },
    statusUpdatedAt: Date,
});

// ---- Immutability -----------------------------------------------------------
// Everything that was billed is frozen once the invoice exists. Corrections are
// made by changing `status` (and, later, issuing a credit note) — never by
// editing the invoice. contentHash may be set once by scripts/signInvoices.js
// (which writes through the raw collection) for invoices issued before hashing.
const LOCKED_FIELDS = [
    'invoiceNumber', 'type', 'sourceId', 'order', 'membership', 'user', 'billedTo',
    'lines', 'subtotal', 'shipping', 'discount', 'tax', 'total', 'currency',
    'couponCode', 'paymentRef', 'issuedAt', 'isDemo', 'contentHash', 'hashVersion',
    'creditNoteFor', 'creditNoteForNumber', 'refund', 'refundMethod', 'reason', 'storeCreditApplied',
];

const immutableError = () =>
    new Error('Issued invoices are immutable. Change the status or issue a credit note instead.');

const touchesLockedField = update => {
    if (!update) return false;
    const keys = [];
    for (const [key, value] of Object.entries(update)) {
        if (key.startsWith('$')) {
            if (value && typeof value === 'object') keys.push(...Object.keys(value));
        } else {
            keys.push(key);
        }
    }
    return keys.some(key => LOCKED_FIELDS.some(f => key === f || key.startsWith(`${f}.`)));
};

invoiceSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'],
    function () {
        if (touchesLockedField(this.getUpdate())) throw immutableError();
    });

invoiceSchema.pre('save', function () {
    if (this.isNew) return;
    if (LOCKED_FIELDS.some(field => this.isModified(field))) throw immutableError();
});

// Invoices are a financial record: they are never deleted through the app.
invoiceSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
    throw new Error('Invoices cannot be deleted. Mark them cancelled instead.');
});

invoiceSchema.statics.LOCKED_FIELDS = LOCKED_FIELDS;

// Exactly one invoice per order / per membership charge, even when a hook
// fires twice (double submit, webhook retry, backfill re-run).
invoiceSchema.index({ type: 1, sourceId: 1 }, { unique: true });
invoiceSchema.index({ user: 1, issuedAt: -1 });
invoiceSchema.index({ emailStatus: 1, issuedAt: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
