const express = require('express');
const { getAnalytics } = require('../controllers/analytics');
const { isAuthUser, authRoles } = require('../middleware/auth');

const router = express.Router();

router
    .route('/admin/analytics')
    .get(isAuthUser, authRoles('admin'), getAnalytics);

module.exports = router;
