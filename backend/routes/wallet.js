const express = require('express');
const { isAuthUser, authRoles } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');
const { myWallet, getUserWallet, adjustUserWallet } = require('../controllers/wallet');

const router = express.Router();

router.get('/wallet/me', isAuthUser, myWallet);
router.get('/admin/wallet/:userId', isAuthUser, authRoles('admin'), getUserWallet);
router.post('/admin/wallet/:userId/adjust', isAuthUser, authRoles('admin'), demoGuard('wallet-adjust'), adjustUserWallet);

module.exports = router;
