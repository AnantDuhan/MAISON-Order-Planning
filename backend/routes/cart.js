const express = require('express');
const router = express.Router();

const {
    getCart,
    syncCart,
    recoverCart,
    unsubscribeCartReminders,
    cartRecoveryStats,
} = require('../controllers/cart');
const { isAuthUser, authRoles } = require('../middleware/auth');

router.route('/cart').get(isAuthUser, getCart).put(isAuthUser, syncCart);

// Links from abandoned-cart emails (signed tokens, no login needed).
router.get('/cart/recover/:token', recoverCart);
router.get('/cart/reminders/unsubscribe/:token', unsubscribeCartReminders);

router.get('/admin/cart-recovery', isAuthUser, authRoles('admin'), cartRecoveryStats);

module.exports = router;
