const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');
const mailer = require('../utils/sendEmail');
const service = require('../services/reviewRequestService');

const s = stubs();
afterEach(() => s.restore());

const NOW = new Date('2026-11-10T10:00:00Z');
const daysAgo = n => new Date(NOW.getTime() - n * 864e5);

function setup({ orders, user, products, claimOk = true, sendFails = false }) {
    let query;
    const updates = [];
    const sent = [];
    s.set(Order, 'find', q => { query = q; return { select: () => ({ limit: () => ({ lean: async () => orders }) }) }; });
    s.set(Order, 'updateOne', async (filter, update) => { updates.push([filter, update]); return { modifiedCount: claimOk ? 1 : 0 }; });
    s.set(User, 'findById', () => ({ select: () => ({ lean: async () => user }) }));
    s.set(Product, 'find', () => ({ select: () => ({ lean: async () => products }) }));
    s.set(mailer, 'sendEmail', async mail => { if (sendFails) throw new Error('smtp down'); sent.push(mail); });
    return { getQuery: () => query, updates, sent };
}

const user = { _id: 'u1', name: 'Priya Sharma', email: 'priya@example.com', isEmailVerified: true };
const order = { _id: 'o1', user: 'u1', DeliveredAt: daysAgo(5), orderItems: [{ product: 'p1' }, { product: 'p2' }, { product: 'p1' }] };

test('asks about delivered orders from 4 to 14 days ago, once, never returned or refunded ones', async () => {
    const t = setup({ orders: [], user, products: [] });
    await service.runReviewRequests({ now: NOW });
    const q = t.getQuery();
    assert.equal(q.orderStatus, 'Delivered');
    assert.equal(q.reviewRequestSentAt, null);
    assert.deepEqual(q.DeliveredAt, { $lte: daysAgo(4), $gte: daysAgo(14) });
    assert.deepEqual(q.isReturned, { $ne: true });
    assert.deepEqual(q.isRefunded, { $ne: true });
    assert.equal(q.returnRequestedAt, null);
});

test('one email per order, listing only products the customer has not reviewed', async () => {
    const t = setup({
        orders: [order], user,
        products: [
            { _id: 'p1', name: 'Apple iPhone 18 Pro', images: [{ url: 'https://img/p1.webp' }], reviews: [] },
            { _id: 'p2', name: 'Leather Case', images: [], reviews: [{ user: 'u1' }] },
        ],
    });
    const stats = await service.runReviewRequests({ now: NOW });
    assert.equal(stats.sent, 1);
    assert.equal(t.sent.length, 1);
    assert.equal(t.sent[0].email, 'priya@example.com');
    assert.equal(t.sent[0].subject, 'How is your Apple iPhone 18 Pro?');
    assert.match(t.sent[0].html, /product\/p1\?review=1&amp;rating=5/);
    assert.doesNotMatch(t.sent[0].html, /Leather Case/);
    assert.match(t.sent[0].html, /Hello Priya/);
    assert.match(t.sent[0].html, /review-requests\/unsubscribe\//);
    // Claimed before sending.
    assert.deepEqual(t.updates[0], [{ _id: 'o1', reviewRequestSentAt: null }, { reviewRequestSentAt: NOW }]);
});

test('nothing is sent to opted-out, unverified or demo customers, or when everything is reviewed', async () => {
    for (const u of [{ ...user, reviewRequestsOptOut: true }, { ...user, isEmailVerified: false }, { ...user, isDemo: true }]) {
        const t = setup({ orders: [order], user: u, products: [{ _id: 'p1', name: 'X', reviews: [] }] });
        await service.runReviewRequests({ now: NOW });
        assert.equal(t.sent.length, 0);
        s.restore();
    }
    const t = setup({ orders: [order], user, products: [{ _id: 'p1', name: 'X', reviews: [{ user: 'u1' }] }] });
    const stats = await service.runReviewRequests({ now: NOW });
    assert.equal(t.sent.length, 0);
    assert.equal(stats.skipped, 1);
});

test('an order already claimed by another run is not emailed again', async () => {
    const t = setup({ orders: [order], user, products: [{ _id: 'p1', name: 'X', reviews: [] }], claimOk: false });
    await service.runReviewRequests({ now: NOW });
    assert.equal(t.sent.length, 0);
});

test('a failed send is put back for the next run', async () => {
    const t = setup({ orders: [order], user, products: [{ _id: 'p1', name: 'X', reviews: [] }], sendFails: true });
    const stats = await service.runReviewRequests({ now: NOW });
    assert.equal(stats.failed, 1);
    assert.deepEqual(t.updates.at(-1), [{ _id: 'o1' }, { reviewRequestSentAt: null }]);
});

test('the unsubscribe link opts out only with a valid signature', async () => {
    const updates = [];
    s.set(User, 'updateOne', async (f, u) => { updates.push([f, u]); return {}; });
    assert.equal(await service.optOut(service.optOutToken('u1')), true);
    assert.deepEqual(updates[0], [{ _id: 'u1' }, { reviewRequestsOptOut: true }]);
    assert.equal(await service.optOut(service.optOutToken('u1').slice(0, -2) + 'xx'), false);
    assert.equal(await service.optOut('garbage'), false);
    assert.equal(updates.length, 1);
});
