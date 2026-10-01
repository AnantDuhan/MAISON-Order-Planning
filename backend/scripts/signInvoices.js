/**
 * One-off: add contentHash (and status) to invoices issued before invoice
 * signing existed, so they get a verification QR code too.
 *
 * Writes through the raw collection on purpose: the model's immutability guard
 * blocks setting contentHash, and this is the one sanctioned place it is set
 * after creation — and only where it is missing.
 *
 *   npm run sign:invoices            # sign unsigned invoices
 *   npm run sign:invoices -- --dry   # count only
 *   npm run sign:invoices -- --check # recompute every hash and report mismatches
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Invoice = require('../models/invoice');
const { computeContentHash } = require('../utils/invoiceSigning');

const run = async () => {
    const dryRun = process.argv.includes('--dry');
    const checkOnly = process.argv.includes('--check');
    connectDB();
    await mongoose.connection.asPromise();

    if (checkOnly) {
        let ok = 0;
        let bad = 0;
        let unsigned = 0;
        for await (const invoice of Invoice.find().cursor()) {
            if (!invoice.contentHash) unsigned += 1;
            else if (computeContentHash(invoice) === invoice.contentHash) ok += 1;
            else {
                bad += 1;
                console.error(`MISMATCH ${invoice.invoiceNumber} (${invoice._id})`);
            }
        }
        console.log(`intact: ${ok}, mismatched: ${bad}, unsigned: ${unsigned}`);
        await mongoose.disconnect();
        process.exit(bad ? 2 : 0);
    }

    let signed = 0;
    for await (const invoice of Invoice.find({ contentHash: { $exists: false } }).cursor()) {
        if (!dryRun) {
            await Invoice.collection.updateOne(
                { _id: invoice._id, contentHash: { $exists: false } },
                { $set: { contentHash: computeContentHash(invoice), status: invoice.status || 'issued' } }
            );
        }
        signed += 1;
    }

    console.log(`${dryRun ? '[dry run] would sign' : 'signed'}: ${signed}`);
    await mongoose.disconnect();
};

run().catch(error => {
    console.error(error);
    process.exit(1);
});
