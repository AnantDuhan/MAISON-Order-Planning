const express = require('express');
const { trackProductInteraction } = require('../controllers/productInteraction');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.route("/interaction").post(optionalAuth, trackProductInteraction);
module.exports = router;