const express = require('express');
const {
    createCashfreeOrder,
    verifyCashfreePayment,
    cashfreeWebhook,
} = require('../controllers/payment');
const { requireFeature } = require('../services/featureFlags');
const router = express.Router();
const { isAuthUser } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');

// Starting checkout is switchable; verifying payments already in progress is not.
router.route('/cashfree/order').post(isAuthUser, requireFeature('checkout'), demoGuard('real-payment'), createCashfreeOrder);
router.route('/cashfree/order/:orderId/verify').get(isAuthUser, verifyCashfreePayment);
router.route('/cashfree/webhook').post(cashfreeWebhook);

module.exports = router;
