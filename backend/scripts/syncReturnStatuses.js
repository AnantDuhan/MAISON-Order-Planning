/**
 * One-off: bring stored returns in line with lifecycle/returnLifecycle.js.
 *
 * Before the lifecycles, a completed refund left its return at "Initiated"
 * (refund started) for good. This moves those returns to "Completed", using
 * the refund's completion time. Safe to re-run: it only touches returns that
 * are still "Initiated" on orders that are refunded.
 *
 * USAGE
 *   node backend/scripts/syncReturnStatuses.js            # dry run
 *   node backend/scripts/syncReturnStatuses.js --apply
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../config/config.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '../config/.env'), quiet: true });

const Order = require('../models/order');
const Return = require('../models/return');

const run = async () => {
    const apply = process.argv.includes('--apply');
    if (!process.env.DB_HOSTED_URI) {
        console.error('No DB_HOSTED_URI found in env. Aborting.');
        process.exit(1);
    }
    await mongoose.connect(process.env.DB_HOSTED_URI);

    const refunded = await Order.find({ isRefunded: true, 'return.0': { $exists: true } })
        .select('_id return refundedAt').lean();
    let moved = 0;
    for (const order of refunded) {
        const stuck = await Return.find({ _id: { $in: order.return }, status: 'Initiated' }).select('_id').lean();
        if (!stuck.length) continue;
        console.log(`order ${order._id}: ${stuck.map(r => r._id).join(', ')} → Completed`);
        moved += stuck.length;
        if (apply) {
            await Return.updateMany(
                { _id: { $in: stuck.map(r => r._id) }, status: 'Initiated' },
                { $set: { status: 'Completed', resolvedAt: order.refundedAt || new Date() } }
            );
        }
    }

    console.log(`\n${moved} return(s) ${apply ? 'moved' : 'would move (dry run; pass --apply)'}.`);
    await mongoose.disconnect();
};

run().catch(error => {
    console.error('Sync failed:', error);
    process.exit(1);
});
