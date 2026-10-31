const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const securityHeaders = require('../middleware/securityHeaders');
const { publicProduct } = require('../controllers/product');

const request = (app, path) => new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
        http.get({ port: server.address().port, path }, res => {
            let body = '';
            res.on('data', c => { body += c; });
            res.on('end', () => { server.close(); resolve({ status: res.statusCode, headers: res.headers, body }); });
        }).on('error', err => { server.close(); reject(err); });
    });
});

test('public product details drop admin-only fields', () => {
    const doc = {
        _id: 'p1', name: 'Ring', price: 100, Stock: 2, category: 'Rings',
        user: 'admin123', isDemo: false, lowStockThreshold: 3, lowStockAlertedAt: new Date(), __v: 4,
        reviews: [{ user: { _id: 'u1', name: 'A', avatar: null }, rating: 5 }],
    };
    const out = publicProduct({ toObject: () => ({ ...doc }) });
    ['user', 'isDemo', 'lowStockThreshold', 'lowStockAlertedAt', '__v'].forEach(k => assert.equal(k in out, false, k));
    assert.equal(out.name, 'Ring');
    assert.equal(out.Stock, 2);
    assert.deepEqual(out.reviews[0].user, { _id: 'u1', name: 'A', avatar: null });
    // Plain cached objects too, without changing the original.
    const cached = { ...doc };
    assert.equal('user' in publicProduct(cached), false);
    assert.equal(cached.user, 'admin123');
});

test('API responses get an enforced strict CSP; pages keep the page policy', async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/api/v1/thing', (req, res) => res.json({ ok: true }));
    app.get('/sitemap.xml', (req, res) => res.type('application/xml').send('<urlset/>'));
    app.get('/page', (req, res) => res.send('<p>hi</p>'));

    const api = await request(app, '/api/v1/thing');
    assert.equal(api.headers['content-security-policy'], securityHeaders.API_POLICY);
    assert.equal(api.headers['content-security-policy-report-only'], undefined);
    assert.match(api.headers['content-security-policy'], /default-src 'none'/);

    const sitemap = await request(app, '/sitemap.xml');
    assert.equal(sitemap.headers['content-security-policy'], securityHeaders.API_POLICY);

    const page = await request(app, '/page');
    assert.notEqual(page.headers['content-security-policy'] || page.headers['content-security-policy-report-only'], undefined);
    assert.notEqual(page.headers['content-security-policy'], securityHeaders.API_POLICY);
});

test('unknown routes answer with a JSON 404, not Express\'s HTML page', async () => {
    const app = require('../app');
    for (const path of ['/api/v1/does-not-exist', '/api/nope', '/no-such-page']) {
        const res = await request(app, path);
        assert.equal(res.status, 404, path);
        assert.match(res.headers['content-type'], /application\/json/, path);
        assert.deepEqual(JSON.parse(res.body), { success: false, message: 'Not found' }, path);
        assert.doesNotMatch(res.body, /Cannot GET|<pre>/);
    }
});
