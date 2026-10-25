const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const Subscription = require('../models/plusMembership');
const { hasActiveMembership } = require('../utils/membership');

const s = stubs();
afterEach(() => s.restore());

test('only an ACTIVE, isActive membership counts', async () => {
    let query;
    s.set(Subscription, 'exists', async q => { query = q; return { _id: 'm1' }; });
    assert.equal(await hasActiveMembership('u1'), true);
    assert.deepEqual(query, { user: 'u1', isActive: true, status: 'ACTIVE' });
});

test('no membership, or no user, means no member shipping', async () => {
    s.set(Subscription, 'exists', async () => null);
    assert.equal(await hasActiveMembership('u1'), false);
    assert.equal(await hasActiveMembership(undefined), false);
});
