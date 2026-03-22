const express = require('express');
const router = express.Router();

const { generateCoupon, getAllCoupons } = require('../controllers/coupon');
const { authRoles, isAuthUser } = require('../middleware/auth');

router.post('/coupon', isAuthUser, authRoles('admin'), generateCoupon);
router.get('/coupons/all', getAllCoupons);

module.exports = router;
