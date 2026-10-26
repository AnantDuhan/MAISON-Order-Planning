const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const Subscription = require('../models/plusMembership');
const { getMembershipTier, hasActiveMembership } = require('../utils/membership');
const { planFor, tierOf, PLANS } = require('../utils/membershipPlans');

const s = stubs();
afterEach(() => s.restore());

const found = doc => ({ sort() { return this; }, select() { return this; }, lean: async () => doc });

test('plans: Essential ₹600/year, Plus ₹199/month or ₹1,799/year, ids carry the price', () => {
    assert.equal(PLANS['essential-yearly'].amount, 600);
    assert.equal(PLANS['plus-monthly'].amount, 199);
    assert.equal(PLANS['plus-yearly'].amount, 1799);
    assert.equal(PLANS['plus-yearly'].planId, 'maison-plus-yearly-1799');
    assert.equal(planFor({ interval: 'yearly' }).key, 'plus-yearly'); // older clients
    assert.equal(planFor({ plan: 'essential-yearly' }).tier, 'essential');
    assert.equal(planFor({ plan: 'nope' }), null);
});

test('memberships from before tiers count as Plus', () => {
    assert.equal(tierOf({ planId: 'maison-yearly' }), 'plus');
    assert.equal(tierOf({ planId: 'maison-essential-yearly-600' }), 'essential');
    assert.equal(tierOf({ tier: 'essential', planId: 'maison-yearly' }), 'essential');
});

test('only an ACTIVE membership gives a tier', async () => {
    let query;
    s.set(Subscription, 'findOne', q => { query = q; return found({ planId: 'maison-essential-yearly-600', tier: 'essential' }); });
    assert.equal(await getMembershipTier('u1'), 'essential');
    assert.deepEqual(query, { user: 'u1', isActive: true, status: 'ACTIVE' });
    assert.equal(await hasActiveMembership('u1'), true);

    s.set(Subscription, 'findOne', () => found(null));
    assert.equal(await getMembershipTier('u1'), null);
    assert.equal(await getMembershipTier(undefined), null);
});
