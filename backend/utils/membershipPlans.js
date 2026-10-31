// Maison memberships: two tiers, three ways to pay.
// Keep in step with frontend/src/utils/membershipTiers.js.
//
// The Cashfree plan id includes the amount, so changing a price (via env)
// creates a new plan instead of colliding with an existing one at the old
// price. Existing members keep the plan they signed up on.

const essentialYearly = Number(process.env.CASHFREE_ESSENTIAL_YEARLY_AMOUNT || 600);
const plusMonthly = Number(process.env.CASHFREE_PLUS_MONTHLY_AMOUNT || 199);
const plusYearly = Number(process.env.CASHFREE_PLUS_YEARLY_AMOUNT || 1799);

const PLANS = {
    'essential-yearly': {
        key: 'essential-yearly',
        tier: 'essential',
        interval: 'yearly',
        planId: `maison-essential-yearly-${essentialYearly}`,
        name: 'Maison Essential',
        amount: essentialYearly,
        duration: 12,
        intervalType: 'YEAR',
    },
    'plus-monthly': {
        key: 'plus-monthly',
        tier: 'plus',
        interval: 'monthly',
        planId: `maison-plus-monthly-${plusMonthly}`,
        name: 'Maison Plus',
        amount: plusMonthly,
        duration: 1,
        intervalType: 'MONTH',
    },
    'plus-yearly': {
        key: 'plus-yearly',
        tier: 'plus',
        interval: 'yearly',
        planId: `maison-plus-yearly-${plusYearly}`,
        name: 'Maison Plus',
        amount: plusYearly,
        duration: 12,
        intervalType: 'YEAR',
    },
};

// Older requests sent { interval: 'monthly' | 'yearly' } for the single plan.
const LEGACY_INTERVAL = { monthly: 'plus-monthly', yearly: 'plus-yearly' };

const planFor = ({ plan, interval } = {}) => PLANS[plan] || PLANS[LEGACY_INTERVAL[interval]] || null;

/** Tier of a stored membership. Memberships from before tiers existed are Plus. */
const tierOf = membership => {
    if (!membership) return null;
    if (membership.tier === 'essential' || membership.tier === 'plus') return membership.tier;
    return /essential/i.test(String(membership.planId || '')) ? 'essential' : 'plus';
};

/**
 * Readable name for a stored planId: "Maison Plus · Monthly". Handles ids
 * from earlier prices ("maison-plus-monthly-149") and from before tiers
 * existed ("maison-yearly", which was Plus, like tierOf says); anything
 * unrecognised is returned as-is.
 */
const planLabel = planId => {
    const id = String(planId || '');
    const known = Object.values(PLANS).find(p => p.planId === id);
    const m = known ? [null, known.tier, known.interval] : /^maison-(?:(essential|plus)-)?(monthly|yearly)(?:-\d+)?$/.exec(id);
    if (!m) return id || 'Unknown plan';
    const tier = m[1] === 'essential' ? 'Maison Essential' : 'Maison Plus';
    return `${tier} · ${m[2] === 'monthly' ? 'Monthly' : 'Yearly'}`;
};

module.exports = { PLANS, planFor, tierOf, planLabel };
