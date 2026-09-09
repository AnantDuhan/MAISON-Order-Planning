const express = require('express');
const router = express.Router();

const { getCart, syncCart } = require('../controllers/cart');
const { isAuthUser } = require('../middleware/auth');

router.route('/cart').get(isAuthUser, getCart).put(isAuthUser, syncCart);

module.exports = router;
