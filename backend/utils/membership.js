const Subscription = require('../models/plusMembership');
const { tierOf } = require('./membershipPlans');

// What each tier gets. One place, so checkout, returns, rewards and emails agree.
const BENEFITS = {
    essential: { freeShipping: true, returnDays: 14, memberCoupons: true, prioritySupport: true, priorityDispatch: true, restockHeadStart: true, rewardRate: 0, earlyAccess: false },
    plus: { freeShipping: true, returnDays: 14, memberCoupons: true, prioritySupport: true, priorityDispatch: true, restockHeadStart: true, rewardRate: 0.02, earlyAccess: true },
};
const REWARD_CAP_RUPEES = 500;

/** 'essential' | 'plus' for a user whose membership Cashfree reports as ACTIVE, else null. */
const getMembershipTier = async userId => {
    if (!userId) return null;
    const membership = await Subscription.findOne({ user: String(userId), isActive: true, status: 'ACTIVE' })
        .sort({ createdAt: -1 })
        .select('tier planId')
        .lean();
    return membership ? tierOf(membership) : null;
};

/** Any active membership (Essential or Plus). */
const hasActiveMembership = async userId => Boolean(await getMembershipTier(userId));

const benefitsOf = tier => BENEFITS[tier] || null;

module.exports = { BENEFITS, REWARD_CAP_RUPEES, getMembershipTier, hasActiveMembership, benefitsOf };
