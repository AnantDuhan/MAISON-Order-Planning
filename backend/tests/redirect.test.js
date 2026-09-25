const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mockRes } = require('./helpers');
const { openOrder } = require('../controllers/redirect');

test('renders the smart-redirect page for a valid order id', () => {
    const res = mockRes();
    openOrder({ params: { id: 'kzsmhij4' } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /href="https:\/\/shop\.example\/order\/kzsmhij4"/);
});

test('rejects ids that could inject markup (reflected XSS)', () => {
    for (const id of ['"><script>alert(1)</script>', "abc'onmouseover=x", 'a b', '../x']) {
        const res = mockRes();
        openOrder({ params: { id } }, res);
        assert.equal(res.statusCode, 400, id);
        assert.doesNotMatch(String(res.body), /<script>alert/);
    }
});
