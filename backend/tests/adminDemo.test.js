const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mockRes } = require('./helpers');

const demoAnalytics = require('../data/demoAnalytics');
const { PLANS, planLabel } = require('../utils/membershipPlans');
const { getAnalytics, getMembershipAnalytics } = require('../controllers/analytics');

const demoAdmin = { _id: 'demo-admin', role: 'admin', isDemo: true };

test('plan ids read as plan names, including ids from earlier prices', () => {
    assert.equal(planLabel(PLANS['essential-yearly'].planId), 'Maison Essential · Yearly');
    assert.equal(planLabel(PLANS['plus-monthly'].planId), 'Maison Plus · Monthly');
    assert.equal(planLabel('maison-plus-yearly-1499'), 'Maison Plus · Yearly');
    assert.equal(planLabel('legacy-plan'), 'legacy-plan');
});

test('demo analytics follow the selected range and end today', () => {
    const now = new Date('2026-10-31T12:00:00+05:30');
    const days = { '7d': 7, '30d': 30, '90d': 90 };
    for (const [range, n] of Object.entries(days)) {
        const { revenueSeries } = demoAnalytics(range, now);
        assert.equal(revenueSeries.length, n, range);
        assert.equal(revenueSeries.at(-1).period, '2026-10-31', range);
    }
    const year = demoAnalytics('12m', now).revenueSeries;
    assert.equal(year.length, 12);
    assert.equal(year.at(-1).period, '2026-10');
});

test('demo analytics totals add up and are stable for the same day', () => {
    const now = new Date('2026-10-31T12:00:00Z');
    const a = demoAnalytics('30d', now);
    assert.equal(a.summary.revenue, a.revenueSeries.reduce((s, p) => s + p.revenue, 0));
    assert.equal(a.summary.orders, a.statusBreakdown.reduce((s, p) => s + p.count, 0));
    assert.deepEqual(demoAnalytics('30d', now), a);
    assert.deepEqual(a.categoryRevenue.map(c => c.category).sort(), ['Accessories', 'Clothes', 'Electronics', 'Home & Living', 'Shoes']);
});

test('demo dashboard uses daily buckets for short ranges, monthly for long ones', async () => {
    for (const [range, granularity] of [['7d', 'day'], ['90d', 'day'], ['12m', 'month']]) {
        const res = mockRes();
        await getAnalytics({ user: demoAdmin, query: { range } }, res);
        assert.equal(res.body.granularity, granularity, range);
        assert.equal(res.body.demoMode, true);
    }
});

test('demo memberships show the real plans and prices', async () => {
    const res = mockRes();
    await getMembershipAnalytics({ user: demoAdmin }, res);
    const plans = res.body.analytics.planBreakdown;
    assert.deepEqual(plans.map(p => p.planId).sort(), Object.values(PLANS).map(p => p.planId).sort());
    assert.ok(plans.every(p => p.label.startsWith('Maison ')));
    assert.deepEqual(plans.map(p => p.amount).sort((a, b) => a - b), Object.values(PLANS).map(p => p.amount).sort((a, b) => a - b));
});
