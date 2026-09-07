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

module.exports = router;
