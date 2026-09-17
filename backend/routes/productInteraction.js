const express = require('express');
const { trackProductInteraction } = require('../controllers/productInteraction');
const { isAuthUser } = require('../middleware/auth');

const router = express.Router();

router.route("/interaction").post(isAuthUser, trackProductInteraction);
module.exports = router;