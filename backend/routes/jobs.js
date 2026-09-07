const express = require('express');

const runWeeklyNewsletter = require('../newsletterJob');
const runWishlistReminders = require('../wishlistJob');

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

// Respond immediately (202) and run the batch in the background, so the
// scheduler's request doesn't block on potentially many emails.
const fireAndForget = (job, name) => (req, res) => {
    res.status(202).json({ success: true, job: name, message: 'started' });
    Promise.resolve()
        .then(() => job())
        .catch(err => console.error(`${name} job failed:`, err.message));
};

router.post('/jobs/newsletter', requireCronSecret, fireAndForget(runWeeklyNewsletter, 'newsletter'));
router.post('/jobs/wishlist', requireCronSecret, fireAndForget(runWishlistReminders, 'wishlist'));

module.exports = router;
