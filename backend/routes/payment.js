const express = require('express');
const {
    processPayment,
    sendStripeApiKey,
} = require('../controllers/payment');
const router = express.Router();
const { isAuthUser } = require('../middleware/auth');

router.route('/payment').post(isAuthUser, processPayment);

router.route('/stripeapikey').get(isAuthUser, sendStripeApiKey);

module.exports = router;
