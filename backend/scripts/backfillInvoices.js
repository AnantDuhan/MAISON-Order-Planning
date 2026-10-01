/**
 * One-off: create invoices for paid orders placed before invoicing existed.
 * Does NOT email anyone (emailStatus: 'skipped'). Safe to re-run — existing
 * invoices are left untouched.
 *
 *   npm run backfill:invoices            # all paid orders
 *   npm run backfill:invoices -- --dry   # count only
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Order = require('../models/order');
const Invoice = require('../models/invoice');
const { createOrderInvoice } = require('../services/invoiceService');

const run = async () => {
    const dryRun = process.argv.includes('--dry');
    connectDB();
    await mongoose.connection.asPromise();

    const invoiced = new Set(await Invoice.distinct('sourceId', { type: 'order' }));
    // Oldest first, so serial numbers follow payment order.
    const cursor = Order.find({ paidAt: { $ne: null } }).sort({ paidAt: 1 }).cursor();

    let created = 0;
    let skipped = 0;
    let failed = 0;
    for await (const order of cursor) {
        if (invoiced.has(String(order._id))) {
            skipped += 1;
            continue;
        }
        if (dryRun) {
            created += 1;
            continue;
        }
        try {
            await createOrderInvoice(order, null, { emailStatus: 'skipped' });
            created += 1;
        } catch (error) {
            failed += 1;
            console.error(`Order ${order._id}: ${error.message}`);
        }
    }

    console.log(`${dryRun ? '[dry run] would create' : 'created'}: ${created}, already invoiced: ${skipped}, failed: ${failed}`);
    await mongoose.disconnect();
};

run().catch(error => {
    console.error(error);
    process.exit(1);
});
