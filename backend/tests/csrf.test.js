const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../app');

const request = (method, headers = {}) => new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
        const req = http.request({
            port: server.address().port,
            method,
            path: '/api/v1/csrf-test-path',
            headers,
        }, res => {
            res.resume();
            res.on('end', () => {
                server.close();
                resolve(res.statusCode);
            });
        });
        req.on('error', error => {
            server.close();
            reject(error);
        });
        req.end();
    });
});

test('rejects state-changing cookie requests from untrusted origins', async () => {
    const status = await request('POST', {
        cookie: 'token=session',
        origin: 'https://attacker.example',
    });
    assert.equal(status, 403);
});

test('rejects state-changing cookie requests without an origin or referer', async () => {
    const status = await request('POST', { cookie: 'token=session' });
    assert.equal(status, 403);
});

test('allows state-changing cookie requests from an allowed origin', async () => {
    const status = await request('POST', {
        cookie: 'token=session',
        origin: 'https://maisonorderplanning.in',
    });
    assert.equal(status, 404);
});

test('uses the referer when a state-changing cookie request has no origin', async () => {
    const status = await request('POST', {
        cookie: 'token=session',
        referer: 'https://maisonorderplanning.in/admin/coupons',
    });
    assert.equal(status, 404);
});

test('does not block safe requests or unauthenticated cross-origin requests', async () => {
    const safeStatus = await request('GET', {
        cookie: 'token=session',
        origin: 'https://attacker.example',
    });
    const anonymousStatus = await request('POST', {
        origin: 'https://attacker.example',
    });
    assert.equal(safeStatus, 404);
    assert.equal(anonymousStatus, 404);
});
