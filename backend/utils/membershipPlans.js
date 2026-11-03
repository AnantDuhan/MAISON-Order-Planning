// Maison memberships: two tiers, three ways to pay.
// Keep in step with frontend/src/utils/membershipTiers.js.
//
// The Cashfree plan id includes the amount, so changing a price (via env)
// creates a new plan instead of colliding with an existing one at the old
// price. Existing members keep the plan they signed up on.

// A whole number of rupees from env, or the default. A typo ("₹249",
// "249.5", "") must not become a plan id like maison-plus-monthly-NaN.
const amountFrom = (name, fallback) => {
    const raw = process.env[name];
    if (raw === undefined || String(raw).trim() === '') return fallback;
    const value = Number(String(raw).trim());
    if (Number.isInteger(value) && value > 0) return value;
    console.error(`${name}="${raw}" is not a whole number of rupees; using ${fallback}.`);
    return fallback;
};

const essentialYearly = amountFrom('CASHFREE_ESSENTIAL_YEARLY_AMOUNT', 600);
const plusMonthly = amountFrom('CASHFREE_PLUS_MONTHLY_AMOUNT', 199);
const plusYearly = amountFrom('CASHFREE_PLUS_YEARLY_AMOUNT', 1799);

// The names before Essential/Plus existed. They are not read any more; say so
// rather than silently charging the defaults.
['CASHFREE_MONTHLY_AMOUNT', 'CASHFREE_YEARLY_AMOUNT'].forEach(name => {
    if (process.env[name]) {
        console.warn(`${name} is set but no longer used. Set CASHFREE_ESSENTIAL_YEARLY_AMOUNT, CASHFREE_PLUS_MONTHLY_AMOUNT and CASHFREE_PLUS_YEARLY_AMOUNT instead.`);
    }
});

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