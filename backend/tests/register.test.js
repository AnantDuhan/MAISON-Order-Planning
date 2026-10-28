const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs, mockRes } = require('./helpers');

const User = require('../models/user');
const { registerUser } = require('../controllers/user');

const s = stubs();
afterEach(() => s.restore());

const register = async body => {
    let created;
    s.set(User, 'create', async doc => {
        created = doc;
        return { ...doc, getEmailVerificationToken: () => 'token', save: async () => {} };
    });
    const res = mockRes();
    await registerUser({ body, file: undefined }, res);
    return { res, created };
};

test('sign-up works without a photo, using the default avatar', async () => {
    const { res, created } = await register({ name: 'Priya', email: 'Priya@Example.com', password: 'secret12', whatsappNumber: '' });
    assert.equal(res.statusCode, 201);
    assert.equal(created.avatar, '/Profile.png');
    // An empty number is left out, so it can't collide on the unique index.
    assert.equal('whatsappNumber' in created, false);
});

test('a WhatsApp number typed with +91 and spaces is stored the way phone login matches it', async () => {
    const { created } = await register({ name: 'R', email: 'r@x.com', password: 'secret12', whatsappNumber: '+91 98765-43210' });
    assert.equal(created.whatsappNumber, '9876543210');
});

test('an invalid number is refused with a clear message', async () => {
    const { res, created } = await register({ name: 'R', email: 'r@x.com', password: 'secret12', whatsappNumber: '12' });
    assert.equal(res.statusCode, 400);
    assert.equal(created, undefined);
});
