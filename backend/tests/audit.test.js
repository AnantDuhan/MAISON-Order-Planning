const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { stubs } = require('./helpers');

const AuditLog = require('../models/auditLog');
const { auditAdminWrites, diff, redact } = require('../middleware/audit');

const s = stubs();
afterEach(() => s.restore());

// A tiny app mounted the same way as app.js: audit in front of /api/v1/admin
// and /admin, routes on routers under /api/v1.
function buildApp(handler) {
    const app = express();
    app.use(express.json());
    app.use(['/api/v1/admin', '/admin'], auditAdminWrites);
    const router = express.Router();
    router.put('/admin/order/:id', (req, res, next) => { req.user = { _id: 'a1', name: 'Admin', role: 'admin' }; next(); }, handler);
    router.get('/admin/order/:id', (req, res) => res.json({ ok: true }));
    app.use('/api/v1', router);
    return app;
}

const call = (app, method, path, body) => new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
        const req = http.request({
            port: server.address().port, method, path,
            headers: { 'content-type': 'application/json', 'user-agent': 'test' },
        }, res => {
            res.resume();
            res.on('end', () => setTimeout(() => { server.close(); resolve(res.statusCode); }, 20));
        });
        req.on('error', reject);
        req.end(body ? JSON.stringify(body) : undefined);
    });
});

test('records a successful admin write with actor, action, entity and diff', async () => {
    const entries = [];
    s.set(AuditLog, 'create', async doc => { entries.push(doc); return doc; });
    const app = buildApp((req, res) => {
        res.locals.audit = { before: { orderStatus: 'Processing' }, after: { orderStatus: 'Shipped' } };
        res.json({ success: true });
    });

    await call(app, 'PUT', '/api/v1/admin/order/o123', { status: 'Shipped', awb: 'X1', password: 'nope' });

    assert.equal(entries.length, 1);
    const [entry] = entries;
    assert.equal(entry.action, 'order.status');
    assert.equal(entry.path, '/api/v1/admin/order/:id');
    assert.deepEqual(entry.entity, { type: 'order', id: 'o123' });
    assert.equal(entry.actor.name, 'Admin');
    assert.deepEqual(entry.changes, [{ field: 'orderStatus', from: 'Processing', to: 'Shipped' }]);
    assert.equal(entry.request.awb, 'X1');
    assert.equal(entry.request.password, '[redacted]');
});

test('failed requests and reads are not recorded', async () => {
    const entries = [];
    s.set(AuditLog, 'create', async doc => { entries.push(doc); return doc; });
    const failing = buildApp((req, res) => res.status(409).json({ success: false }));
    await call(failing, 'PUT', '/api/v1/admin/order/o1', { status: 'Shipped' });
    await call(failing, 'GET', '/api/v1/admin/order/o1');
    assert.equal(entries.length, 0);
});

test('audit entries cannot be modified or deleted', async () => {
    await assert.rejects(AuditLog.updateOne({ _id: 'x' }, { action: 'y' }).exec(), /cannot be changed/);
    await assert.rejects(AuditLog.deleteMany({}).exec(), /cannot be changed/);
});

test('diff reports only changed fields; redact hides secrets at any depth', () => {
    assert.deepEqual(diff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }), [
        { field: 'b', from: 2, to: 3 },
        { field: 'c', from: undefined, to: 4 },
    ]);
    assert.deepEqual(redact({ user: { otp: '1234', name: 'A' } }), { user: { otp: '[redacted]', name: 'A' } });
});

const { mockRes } = require('./helpers');
const { getAuditLog } = require('../controllers/audit');

test('audit query: demo admins only see demo entries; paging cursor', async () => {
    let usedFilter;
    const rows = Array.from({ length: 3 }, (_, i) => ({ _id: `e${i}`, at: new Date(Date.UTC(2026, 9, 3 - i)) }));
    s.set(AuditLog, 'find', filter => {
        usedFilter = filter;
        return { sort: () => ({ limit: () => ({ select: () => ({ lean: async () => rows }) }) }) };
    });
    const res = mockRes();
    await getAuditLog({ query: { limit: '2', entityType: 'order' }, user: { isDemo: true } }, res);
    assert.equal(usedFilter.isDemo, true);
    assert.equal(usedFilter['entity.type'], 'order');
    assert.equal(res.body.entries.length, 2);
    assert.deepEqual(res.body.nextCursor, rows[1].at);
});
