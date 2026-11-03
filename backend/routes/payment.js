const express = require('express');
const {
    createCashfreeOrder,
    verifyCashfreePayment,
    createGuestCashfreeOrder,
    verifyGuestCashfreePayment,
    cashfreeWebhook,
} = require('../controllers/payment');
const { requireFeature } = require('../services/featureFlags');
const router = express.Router();
const { isAuthUser } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');
const { guestCheckoutLimiter } = require('../middleware/rateLimiter');

// Starting checkout is switchable; verifying payments already in progress is not.
router.route('/cashfree/order').post(isAuthUser, requireFeature('checkout'), demoGuard('real-payment'), createCashfreeOrder);
router.route('/cashfree/order/:orderId/verify').get(isAuthUser, verifyCashfreePayment);
// Guest checkout: no account; a signed guest token ties the steps together.
router.route('/cashfree/guest/order').post(guestCheckoutLimiter, requireFeature('checkout'), requireFeature('guestCheckout'), createGuestCashfreeOrder);
router.route('/cashfree/guest/order/:orderId/verify').get(verifyGuestCashfreePayment);
router.route('/cashfree/webhook').post(cashfreeWebhook);

module.exports = router;
