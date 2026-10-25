const Subscription = require('../models/plusMembership');

/** True when the user has a Maison Plus membership that Cashfree reports as ACTIVE. */
const hasActiveMembership = async userId => {
    if (!userId) return false;
    const found = await Subscription.exists({ user: String(userId), isActive: true, status: 'ACTIVE' });
    return Boolean(found);
};

module.exports = { hasActiveMembership };
