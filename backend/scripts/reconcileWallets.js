/**
 * Rebuild every store credit balance from its ledger and report differences.
 *
 *   npm run wallets:reconcile            # fix any mismatches
 *   npm run wallets:reconcile -- --dry   # report only
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Wallet = require('../models/wallet');
const WalletEntry = require('../models/walletEntry');

const run = async () => {
    const dryRun = process.argv.includes('--dry');
    connectDB();
    await mongoose.connection.asPromise();

    const sums = await WalletEntry.aggregate([{ $group: { _id: '$user', total: { $sum: '$amount' } } }]);
    const ledger = new Map(sums.map(s => [String(s._id), s.total]));
    const wallets = await Wallet.find().lean();
    for (const w of wallets) if (!ledger.has(String(w._id))) ledger.set(String(w._id), 0);

    let mismatched = 0;
    for (const [userId, total] of ledger) {
        const wallet = wallets.find(w => String(w._id) === userId);
        const balance = wallet?.balance || 0;
        const expected = Math.max(0, total);
        if (balance !== expected) {
            mismatched += 1;
            console.log(`user ${userId}: balance ${balance / 100} != ledger ${expected / 100}`);
            if (!dryRun) {
                await Wallet.updateOne({ _id: userId }, { $set: { balance: expected, updatedAt: new Date() } }, { upsert: true });
            }
        }
    }
    console.log(`${ledger.size} wallets checked, ${mismatched} ${dryRun ? 'mismatched' : 'fixed'}`);
    await mongoose.disconnect();
};

run().catch(error => {
    console.error(error);
    process.exit(1);
});
