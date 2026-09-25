const express = require('express');
const {
    createCashfreeOrder,
    verifyCashfreePayment,
    cashfreeWebhook,
} = require('../controllers/payment');
const router = express.Router();
const { isAuthUser } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');

router.route('/cashfree/order').post(isAuthUser, demoGuard('real-payment'), createCashfreeOrder);
router.route('/cashfree/order/:orderId/verify').get(isAuthUser, verifyCashfreePayment);
router.route('/cashfree/webhook').post(cashfreeWebhook);

module.exports = router;
