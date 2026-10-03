const express = require('express');
const { isAuthUser, authRoles } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');
const { getFeatures, getAdminFeatures, updateFeature } = require('../controllers/features');

const router = express.Router();

router.get('/features', getFeatures);
router.get('/admin/features', isAuthUser, authRoles('admin'), getAdminFeatures);
router.patch('/admin/features/:key', isAuthUser, authRoles('admin'), demoGuard('feature-flags'), updateFeature);

module.exports = router;
