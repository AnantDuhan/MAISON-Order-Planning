const express = require('express');
const { isAuthUser, authRoles } = require('../middleware/auth');
const { vitalsLimiter } = require('../middleware/rateLimiter');
const webVitals = require('../services/webVitals');
const logger = require('../config/logger');

const router = express.Router();

// POST /api/v1/vitals   { page, device, metrics: [{ name, value }] }
// From navigator.sendBeacon as the visitor leaves a page. Always 204: the
// browser doesn't wait for or read the answer, and bad input is just dropped.
router.post('/vitals', vitalsLimiter, async (req, res) => {
    try {
        await webVitals.record(req.body);
    } catch (error) {
        logger.warn({ err: error.message }, 'web vitals not stored');
    }
    res.status(204).end();
});

// GET /api/v1/admin/vitals?device=mobile|desktop&days=28
router.get('/admin/vitals', isAuthUser, authRoles('admin'), async (req, res) => {
    const report = await webVitals.report({ device: req.query.device, days: req.query.days });
    res.status(200).json({ success: true, ...report });
});

module.exports = router;
