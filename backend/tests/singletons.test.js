const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test-secret';
const { issueSocketToken, readSocketToken } = require('../utils/socketToken');
const { resolveSession } = require('../middleware/auth');

test('one S3 client is shared by the whole server', () => {
    assert.equal(require('../config/s3'), require('../config/s3'));
});

test('socket tokens identify the user to the socket, short-lived', () => {
    const token = issueSocketToken({ _id: 'u1' }, { mfaVerified: true });
    const read = readSocketToken(token);
    assert.deepEqual([read.id, read.mfa], ['u1', true]);
    const { exp, iat } = jwt.decode(token);
    assert.equal(exp - iat, 300);
    assert.equal(readSocketToken('nonsense'), null);
    assert.equal(readSocketToken(undefined), null);
});

test('a socket token can never be used as a session cookie', async () => {
    const token = issueSocketToken({ _id: 'u1' });
    assert.equal(await resolveSession(token), null);
    // And a session token is not a socket token.
    const session = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET_KEY);
    assert.equal(readSocketToken(session), null);
});
