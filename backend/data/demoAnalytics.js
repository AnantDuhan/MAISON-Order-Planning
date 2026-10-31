// Synthetic analytics for the demo admin (never real data).
//
// Built for the selected range and today's date, in the same shape and
// buckets as the real report (daily up to 90 days, monthly for 12m/all), so
// the demo dashboard behaves like the real one: the range buttons change the
// chart, and the dates are always recent. Numbers come from a seeded
// generator, so the same day and range always show the same figures.

const { PLANS, planLabel } = require('../utils/membershipPlans');

const DAY = 24 * 60 * 60 * 1000;

// Small deterministic PRNG (mulberry32), seeded per bucket.
const rand = seed => {
    let t = (seed + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const seedOf = str => [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const DAYS = { '7d': 7, '30d': 30, '90d': 90 };

/** Revenue buckets for a range, ending today. */
const buildSeries = (range, now) => {
    if (DAYS[range]) {
        return Array.from({ length: DAYS[range] }, (_, i) => {
            const d = new Date(now.getTime() - (DAYS[range] - 1 - i) * DAY);
            const key = dayKey(d);
            const r = rand(seedOf(key));
            const weekend = [0, 6].includes(d.getDay()) ? 1.35 : 1;
            const orders = Math.max(1, Math.round((2 + r * 5) * weekend));
            return { period: key, revenue: Math.round(orders * (1700 + rand(seedOf(key + 'v')) * 1400) / 10) * 10, orders };
        });
    }
    const months = range === 'all' ? 18 : 12;
    return Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        const key = monthKey(d);
        // A growing store whose latest month matches the daily figures
        // (about 145 orders), with a festive lift in October and November.
        const growth = 0.5 + (i / (months - 1)) * 0.5;
        const festive = [9, 10].includes(d.getMonth()) ? 1.15 : 1;
        const orders = Math.round((115 + rand(seedOf(key)) * 30) * growth * festive);
        return { period: key, revenue: Math.round(orders * (2100 + rand(seedOf(key + 'v')) * 600) / 10) * 10, orders };
    });
};

// Shares of revenue by department (matches the store's default departments)
// and the best sellers within them.
const DEPARTMENTS = [
    ['Accessories', 0.31],
    ['Electronics', 0.27],
    ['Clothes', 0.22],
    ['Home & Living', 0.12],
    ['Shoes', 0.08],
];
const BEST_SELLERS = [
    ['Studio Headphones', 8990, 0.17],
    ['Verdure Filigree Necklace & Chandbali Set', 4990, 0.12],
    ['Soleil Medallion Set', 3490, 0.09],
    ['Everyday Linen Shirt', 2490, 0.08],
    ['Halo Cushion Pendant', 2290, 0.06],
];
// The reasons shoppers pick in the return flow.
const RETURN_REASONS = [
    ['Doesn\'t suit me', 0.32],
    ['Damaged or defective', 0.22],
    ['Not as described', 0.18],
    ['Changed my mind', 0.16],
    ['Wrong item sent', 0.12],
];

const split = (total, shares) => {
    const parts = shares.map(s => Math.round(total * s));
    parts[0] += total - parts.reduce((a, b) => a + b, 0); // keep the sum exact
    return parts;
};

/** Dashboard analytics for the demo admin, for `range` as of `now`. */
const demoAnalytics = (range = '30d', now = new Date()) => {
    const revenueSeries = buildSeries(range, now);
    const revenue = revenueSeries.reduce((a, p) => a + p.revenue, 0);
    const orders = revenueSeries.reduce((a, p) => a + p.orders, 0);
    const units = Math.round(orders * 1.6);
    const returned = Math.max(1, Math.round(orders * 0.06));

    const [delivered, shipped, processing] = split(orders, [0.68, 0.17, 0.15]);
    const unitsByDept = split(units, DEPARTMENTS.map(([, s]) => s));
    const returnsByReason = split(returned, RETURN_REASONS.map(([, s]) => s)).map((n, i) => (i === 0 ? Math.max(1, n) : n));

    return {
        summary: {
            revenue,
            orders,
            units,
            discountGiven: Math.round(revenue * 0.045),
            returned,
            avgOrderValue: orders ? Math.round((revenue / orders) * 100) / 100 : 0,
            returnRate: orders ? Math.round((returned / orders) * 10000) / 100 : 0,
        },
        revenueSeries,
        statusBreakdown: [
            { status: 'Delivered', count: delivered },
            { status: 'Shipped', count: shipped },
            { status: 'Processing', count: processing },
        ].filter(s => s.count > 0),
        topProducts: BEST_SELLERS.map(([name, price, share]) => {
            const productUnits = Math.max(1, Math.round((revenue * share) / price));
            return { name, revenue: productUnits * price, units: productUnits };
        }),
        categoryRevenue: DEPARTMENTS.map(([category, share], i) => ({
            category,
            revenue: Math.round(revenue * share),
            units: unitsByDept[i],
        })),
        returnReasons: RETURN_REASONS.map(([reason], i) => ({ reason, count: returnsByReason[i] })).filter(r => r.count > 0),
        couponUsage: [
            ['WELCOME10', 10, 0.14],
            ['PLUS15', 15, 0.08],
            ['FESTIVE12', 12, 0.06],
        ].map(([code, pct, share]) => {
            const couponRevenue = Math.round(revenue * share);
            return {
                code,
                orders: Math.max(1, Math.round(orders * share)),
                revenue: couponRevenue,
                discount: Math.round((couponRevenue * pct) / (100 - pct)),
            };
        }),
    };
};

/** Membership analytics for the demo admin, using the real plans and prices. */
const demoMembershipAnalytics = (now = new Date()) => {
    const plans = [
        [PLANS['essential-yearly'], 31, 28],
        [PLANS['plus-monthly'], 14, 12],
        [PLANS['plus-yearly'], 9, 8],
    ];
    const planBreakdown = plans.map(([plan, members, active]) => ({
        planId: plan.planId,
        label: planLabel(plan.planId),
        members,
        active,
        amount: plan.amount,
    }));
    const total = planBreakdown.reduce((a, p) => a + p.members, 0);
    const active = planBreakdown.reduce((a, p) => a + p.active, 0);
    // Monthly recurring revenue: monthly plans count in full, yearly ones as 1/12.
    const recurringRevenue = Math.round(plans.reduce(
        (a, [plan, , activeCount]) => a + activeCount * (plan.duration === 1 ? plan.amount : plan.amount / 12),
        0
    ));
    const member = (id, name, email, plan, daysAgo) => ({
        _id: `demo-membership-${id}`,
        user: { name, email },
        status: 'ACTIVE',
        isActive: true,
        planId: plan.planId,
        planLabel: planLabel(plan.planId),
        amount: plan.amount,
        createdAt: new Date(now.getTime() - daysAgo * DAY).toISOString(),
    });

    return {
        summary: { total, active, recurringRevenue },
        statusBreakdown: [
            // Cashfree's status values, as stored on real memberships.
            { status: 'ACTIVE', count: active },
            { status: 'CANCELLED', count: total - active },
        ],
        planBreakdown,
        recentMembers: [
            member('001', 'Aarav Mehta', 'aarav.demo@example.com', PLANS['plus-yearly'], 1),
            member('002', 'Isha Kapoor', 'isha.demo@example.com', PLANS['essential-yearly'], 3),
            member('003', 'Rohan Sharma', 'rohan.demo@example.com', PLANS['plus-monthly'], 6),
            member('004', 'Meera Iyer', 'meera.demo@example.com', PLANS['essential-yearly'], 9),
        ],
    };
};

module.exports = demoAnalytics;
module.exports.demoAnalytics = demoAnalytics;
module.exports.demoMembershipAnalytics = demoMembershipAnalytics;
