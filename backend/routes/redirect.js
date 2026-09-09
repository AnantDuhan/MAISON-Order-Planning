const express = require('express');
const router = express.Router();

const { openOrder } = require('../controllers/redirect');

router.route('/go/order/:id').get(openOrder);

module.exports = router;
