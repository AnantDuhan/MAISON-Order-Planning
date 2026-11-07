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

// Newsletter and wishlist reminders: answer 202 straight away and send the
// batch in the background, so the scheduler's request doesn't time out on a
// long send. A second call while a batch is still sending is ignored.
const runWeeklyNewsletter = require('../newsletterJob');
const runWishlistReminders = require('../wishlistJob');

const batchJobs = { newsletter: runWeeklyNewsletter, wishlist: runWishlistReminders };
const running = new Set();

const startBatch = name => (req, res) => {
    if (running.has(name)) {
        return res.status(202).json({ success: true, job: name, message: 'already running' });
    }
    running.add(name);
    res.status(202).json({ success: true, job: name, message: 'started' });
    Promise.resolve()
        .then(() => batchJobs[name]())
        .then(() => console.log(`Job ${name} completed`))
        .catch(err => console.error(`Job ${name} failed:`, err.message))
        .finally(() => running.delete(name));
};

router.post('/jobs/newsletter', requireCronSecret, startBatch('newsletter'));
router.post('/jobs/wishlist', requireCronSecret, startBatch('wishlist'));

// Re-send invoice emails that failed or never went out (a small batch per call).
const { retryPendingInvoiceEmails } = require('../services/invoiceService');
const inventory = require('../services/inventoryService');
const cartRecovery = require('../services/cartRecoveryService');

// Abandoned-cart reminders (24h and 72h after the cart was last touched).
// Membership: restock emails for non-members once the members' 6-hour head
// start is over (run hourly).
router.post('/jobs/back-in-stock', requireCronSecret, async (req, res, next) => {
    try {
        const sent = await inventory.sendDueRestockAlerts();
        res.status(200).json({ success: true, job: 'back-in-stock', sent });
    } catch (err) {
        next(err);
    }
});
// "How is it?" review requests, a few days after delivery (run daily).
const reviewRequests = require('../services/reviewRequestService');
router.post('/jobs/review-requests', requireCronSecret, async (req, res, next) => {
    try {
        const result = await reviewRequests.runReviewRequests({ limit: 200 });
        res.status(200).json({ success: true, job: 'review-requests', ...result });
    } catch (err) {
        next(err);
    }
});

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