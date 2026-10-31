const express = require('express');
const router = express.Router();

const { generateCoupon, getAllCoupons, getAdminCoupons, updateCoupon } = require('../controllers/coupon');
const { authRoles, isAuthUser, optionalAuth } = require('../middleware/auth');
const { auditIfAdmin } = require('../middleware/audit');

router.post('/coupon', auditIfAdmin, isAuthUser, authRoles('admin'), generateCoupon);
// Customers see active coupons only; admins (after MFA) see all of them.
router.get('/coupons/all', optionalAuth, getAllCoupons);
// Admin list with usage (orders, revenue, discount given, last used).
router.get('/admin/coupons', isAuthUser, authRoles('admin'), getAdminCoupons);
router.put('/admin/coupon/:id', auditIfAdmin, isAuthUser, authRoles('admin'), updateCoupon);

module.exports = router;
