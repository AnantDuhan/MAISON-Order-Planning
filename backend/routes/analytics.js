const express = require('express');
const { getAnalytics, getAdminStats, getMembershipAnalytics, getMemberships } = require('../controllers/analytics');
const { isAuthUser, authRoles } = require('../middleware/auth');

const router = express.Router();

router
    .route('/admin/analytics')
    .get(isAuthUser, authRoles('admin'), getAnalytics);

router
    .route('/admin/stats')
    .get(isAuthUser, authRoles('admin'), getAdminStats);

router
    .route('/admin/membership-analytics')
    .get(isAuthUser, authRoles('admin'), getMembershipAnalytics);

router
    .route('/admin/memberships')
    .get(isAuthUser, authRoles('admin'), getMemberships);

// GET /api/v1/admin/insights?days=30  running out soon, profitability, cart recovery
const insights = require('../services/insights');
router.get('/admin/insights', isAuthUser, authRoles('admin'), async (req, res) => {
    // The demo admin never sees real sales.
    if (req.user?.isDemo) {
        return res.status(200).json({
            success: true,
            demoMode: true,
            runningOut: [],
            profitability: { days: 30, totals: { revenue: 0, margin: 0, revenueWithCost: 0, marginRate: null }, products: [], missingCost: [] },
            recovery: null,
        });
    }
    const result = await insights.dashboardInsights({ days: req.query.days });
    res.status(200).json({ success: true, ...result });
});

module.exports = router;
