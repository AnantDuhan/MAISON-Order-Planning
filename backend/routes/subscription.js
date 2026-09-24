const express = require('express');
const { isAuthUser } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');
const {
    getMembershipPlans,
    membershipReturn,
    getCurrentMembership,
    createMembershipSubscription,
    getMembershipStatus,
    cancelMembership,
    membershipWebhook,
} = require('../controllers/subscription');

const router = express.Router();

router.get('/membership/plans', getMembershipPlans);
router.get('/membership/return', membershipReturn);
router.post('/membership/return', membershipReturn);
router.get('/membership/current', isAuthUser, getCurrentMembership);
router.post('/membership', isAuthUser, demoGuard('membership'), createMembershipSubscription);
router.get('/membership/:subscriptionId', isAuthUser, getMembershipStatus);
router.post('/membership/:subscriptionId/cancel', isAuthUser, demoGuard('membership'), cancelMembership);
router.post('/membership/webhook', membershipWebhook);

module.exports = router;