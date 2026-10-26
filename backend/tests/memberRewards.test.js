const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const Order = require('../models/order');
const wallet = require('../services/walletService');
const { rewardFor, creditDueRewards } = require('../services/memberRewards');

const s = stubs();
afterEach(() => s.restore());

test('Plus earns 2% of the items, capped at ₹500; Essential and non-members earn nothing', () => {
    assert.equal(rewardFor({ memberTier: 'plus', totalPrice: 19999, shippingPrice: 0 }), 399);
    assert.equal(rewardFor({ memberTier: 'plus', totalPrice: 164900, shippingPrice: 0 }), 500);
    assert.equal(rewardFor({ memberTier: 'essential', totalPrice: 19999 }), 0);
    assert.equal(rewardFor({ memberTier: null, totalPrice: 19999 }), 0);
});

test('rewards are credited once the 14-day window has closed, idempotently per order', async () => {
    let query;
    s.set(Order, 'find', q => { query = q; return { select() { return this; }, limit() { return this; }, lean: async () => [{ _id: 'o1', user: 'u1', totalPrice: 19999, shippingPrice: 0, memberTier: 'plus' }] }; });
    const credits = [];
    s.set(wallet, 'credit', async (user, paise, opts) => { credits.push({ user, paise, key: opts.idempotencyKey, type: opts.type }); });
    const marks = [];
    s.set(Order, 'updateOne', async (filter, change) => { marks.push({ filter, change }); });

    const now = new Date('2026-11-20T00:00:00Z');
    const result = await creditDueRewards({ now });
    assert.deepEqual(result, { checked: 1, credited: 1 });
    assert.equal(query.DeliveredAt.$lte.toISOString(), '2026-11-06T00:00:00.000Z');
    assert.equal(query.isReturned.$ne, true);
    assert.deepEqual(credits, [{ user: 'u1', paise: 39900, key: 'member-reward:o1', type: 'reward' }]);
    assert.equal(marks[0].change.memberRewardAmount, 399);
});
