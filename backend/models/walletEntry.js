const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// One immutable line in a customer's store credit ledger. Amounts are paise:
// positive = credit, negative = debit. idempotencyKey makes every operation
// safe to retry (refund:<id>, checkout:<id>, ...).
const walletEntrySchema = new mongoose.Schema({
    _id: String,
    user: { type: String, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: {
        type: String,
        enum: ['refund', 'checkout', 'checkout-reversal', 'adjustment'],
        required: true,
    },
    reference: {
        type: { type: String },
        id: String,
    },
    note: String,
    createdBy: { id: String, name: String },
    idempotencyKey: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

walletEntrySchema.index({ user: 1, createdAt: -1 });

const immutable = () => {
    throw new Error('Wallet ledger entries cannot be changed or deleted');
};
walletEntrySchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne',
    'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete'], immutable);
walletEntrySchema.pre('save', function () {
    if (!this.isNew) immutable();
});

module.exports = mongoose.model('WalletEntry', walletEntrySchema);
