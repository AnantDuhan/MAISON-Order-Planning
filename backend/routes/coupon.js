const express = require('express');
const router = express.Router();

const { generateCoupon, getAllCoupons } = require('../controllers/coupon');
const { authRoles, isAuthUser, optionalAuth } = require('../middleware/auth');

router.post('/coupon', isAuthUser, authRoles('admin'), generateCoupon);
// Customers see active coupons only; admins (after MFA) see all of them.
router.get('/coupons/all', optionalAuth, getAllCoupons);

module.exports = router;
