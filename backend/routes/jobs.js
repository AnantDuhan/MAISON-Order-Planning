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

module.exports = router;
