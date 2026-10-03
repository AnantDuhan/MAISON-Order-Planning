const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// Store credit balance per user, in paise. A projection of the ledger
// (WalletEntry): every change to `balance` has a matching entry, and
// walletService.reconcile() can rebuild it from the entries.
const walletSchema = new mongoose.Schema({
    _id: String, // user id
    balance: { type: Number, default: 0, min: 0 },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Wallet', walletSchema);
