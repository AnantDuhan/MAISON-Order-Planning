const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const Cart = require('../models/cart');
const User = require('../models/user');
const Order = require('../models/order');
const Product = require('../models/product');
const recovery = require('../services/cartRecoveryService');

const s = stubs();
afterEach(() => s.restore());

const HOUR = 3600 * 1000;
const NOW = Date.parse('2026-10-03T12:00:00Z');
const cartIdle = (hours, recoveryState = {}) => ({
    _id: 'c1',
    user: 'u1',
    items: [{ product: 'lamp', name: 'Lamp', price: 400, quantity: 2 }],
    updatedAt: new Date(NOW - hours * HOUR),
    recovery: recoveryState,
});

test('reminder schedule: 24h, then 72h, then nothing', () => {
    assert.equal(recovery.reminderDue(cartIdle(10), NOW), 0);
    assert.equal(recovery.reminderDue(cartIdle(25), NOW), 1);

    const cycle = new Date(NOW - 30 * HOUR);
    const afterFirst = { ...cartIdle(30), recovery: { cycle, emailsSent: 1 } };
    assert.equal(recovery.reminderDue(afterFirst, NOW), 0); // too soon for #2

    const at73 = { ...cartIdle(73), recovery: { cycle: new Date(NOW - 73 * HOUR), emailsSent: 1 } };
    assert.equal(recovery.reminderDue(at73, NOW), 2);

    const done = { ...cartIdle(100), recovery: { cycle: new Date(NOW - 100 * HOUR), emailsSent: 2 } };
    assert.equal(recovery.reminderDue(done, NOW), 0);

    assert.equal(recovery.reminderDue(cartIdle(8 * 24), NOW), 0); // gave up after 7 days
    assert.equal(recovery.reminderDue({ ...cartIdle(30), items: [] }, NOW), 0);
});

test('editing the cart starts a new reminder cycle', () => {
    // Reminders went out for an older version of the cart.
    const cart = { ...cartIdle(26), recovery: { cycle: new Date(NOW - 200 * HOUR), emailsSent: 2 } };
    assert.equal(recovery.reminderDue(cart, NOW), 1);
});

test('signed links: tamper-proof and kind-specific', () => {
    process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test-secret';
    const token = recovery.makeToken('cart', 'c1');
    assert.equal(recovery.readToken('cart', token), 'c1');
    assert.equal(recovery.readToken('optout', token), null);
    assert.equal(recovery.readToken('cart', token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')), null);
    assert.equal(recovery.readToken('cart', 'garbage'), null);
});

const lean = v => ({ select: () => ({ lean: async () => v }), lean: async () => v });

test('no reminder for opted-out, demo or unverified users, or after an order', async () => {
    const cart = cartIdle(30);
    for (const user of [
        { email: 'a@x.com', cartRemindersOptOut: true },
        { email: 'a@x.com', isDemo: true },
        { email: 'a@x.com', isEmailVerified: false },
    ]) {
        s.set(User, 'findById', () => lean(user));
        assert.equal(await recovery.sendReminder(cart, 1), 'skipped:user');
    }
    s.set(User, 'findById', () => lean({ email: 'a@x.com', isEmailVerified: true }));
    s.set(Order, 'exists', async () => ({ _id: 'o1' }));
    assert.equal(await recovery.sendReminder(cart, 1), 'skipped:ordered');
});

test('a reminder is claimed before sending, so overlapping runs send once', async t => {
    process.env.RESEND_API_KEY = 'k';
    process.env.EMAIL_FROM_NOREPLY = 'n@x.com';
    process.env.EMAIL_FROM_SUPPORT = 's@x.com';
    const cart = cartIdle(30);
    s.set(User, 'findById', () => lean({ name: 'Asha', email: 'a@x.com', isEmailVerified: true }));
    s.set(Order, 'exists', async () => null);
    s.set(Product, 'find', () => lean([{ _id: 'lamp', name: 'Lamp', price: 450, Stock: 2, images: [] }]));
    let claims = 0;
    s.set(Cart, 'updateOne', async () => ({ modifiedCount: ++claims === 1 ? 1 : 0 }));
    const sent = [];
    t.mock.method(global, 'fetch', async (url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, json: async () => ({ id: 'e' }) };
    });

    const results = await Promise.all([recovery.sendReminder(cart, 1), recovery.sendReminder(cart, 1)]);
    assert.deepEqual(results.sort(), ['sent', 'skipped:claimed']);
    assert.equal(sent.length, 1);
    // Today's price, not the one stored in the cart.
    assert.match(sent[0].html, /900/);
    assert.match(sent[0].html, /Stop bag reminders/);
});
