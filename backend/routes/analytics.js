const express = require('express');
const { getAnalytics, getAdminStats } = require('../controllers/analytics');
const { isAuthUser, authRoles } = require('../middleware/auth');

const router = express.Router();

router
    .route('/admin/analytics')
    .get(isAuthUser, authRoles('admin'), getAnalytics);

router
    .route('/admin/stats')
    .get(isAuthUser, authRoles('admin'), getAdminStats);

module.exports = router;
