const express = require('express');

const router = express.Router();

/**
 * Trigger the scheduled email jobs over HTTP so an external scheduler
 * (GitHub Actions, cron-job.org, Render Cron, …) can drive them. This makes
 * the jobs reliable on hosts that sleep idle instances — the incoming request
 * both wakes the service and runs the job — and works with multiple instances
 * (the job only fires when called).
 *
 * Protected by a shared secret sent in the `x-cron-secret` header, matched
 * against process.env.CRON_SECRET.
 */
const requireCronSecret = (req, res, next) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return res.status(503).json({ success: false, message: 'CRON_SECRET is not configured' });
    }
    if (req.get('x-cron-secret') !== secret) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

// Enqueue the batch onto the BullMQ email queue and return immediately (202).
// The separate worker (backend/worker.js) runs it, with retries and
// back-pressure — the web process never blocks on the batch. This also keeps
// the job from running once per instance under horizontal scaling.
const emailQueue = require('../queues/email.queue');

const enqueue = name => async (req, res, next) => {
    try {
        await emailQueue.add(name, {}, {
            removeOnComplete: true,
            removeOnFail: 50,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });
        res.status(202).json({ success: true, job: name, message: 'queued' });
    } catch (err) {
        next(err);
    }
};

router.post('/jobs/newsletter', requireCronSecret, enqueue('newsletter'));
router.post('/jobs/wishlist', requireCronSecret, enqueue('wishlist'));

// Re-send invoice emails that failed or never went out. Runs inline (bounded
// to a small batch) so it does not depend on the BullMQ worker being deployed.
const { retryPendingInvoiceEmails } = require('../services/invoiceService');
const inventory = require('../services/inventoryService');
const cartRecovery = require('../services/cartRecoveryService');

// Abandoned-cart reminders (24h and 72h after the cart was last touched).
router.post('/jobs/abandoned-carts', requireCronSecret, async (req, res, next) => {
    try {
        const result = await cartRecovery.runAbandonedCartReminders({ limit: 200 });
        res.status(200).json({ success: true, job: 'abandoned-carts', ...result });
    } catch (err) {
        next(err);
    }
});

// Return stock from checkouts that were started but never paid.
router.post('/jobs/stock-holds', requireCronSecret, async (req, res, next) => {
    try {
        const result = await inventory.releaseExpiredHolds({ limit: 200 });
        res.status(200).json({ success: true, job: 'stock-holds', ...result });
    } catch (err) {
        next(err);
    }
});

router.post('/jobs/invoice-retry', requireCronSecret, async (req, res, next) => {
    try {
        const result = await retryPendingInvoiceEmails({ limit: 20 });
        res.status(200).json({ success: true, job: 'invoice-retry', ...result });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
