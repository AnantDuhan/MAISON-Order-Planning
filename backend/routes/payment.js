const express = require('express');
const {
    createCashfreeOrder,
    verifyCashfreePayment,
    cashfreeWebhook,
    sendStripeApiKey,
} = require('../controllers/payment');
const router = express.Router();
const { isAuthUser } = require('../middleware/auth');

router.route('/cashfree/order').post(isAuthUser, createCashfreeOrder);
router.route('/cashfree/order/:orderId/verify').get(isAuthUser, verifyCashfreePayment);
router.route('/cashfree/webhook').post(cashfreeWebhook);

router.route('/stripeapikey').get(isAuthUser, sendStripeApiKey);

module.exports = router;
