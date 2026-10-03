const test = require('node:test');
const assert = require('node:assert');

process.env.INVOICE_SIGNING_SECRET = 'test-secret-'.padEnd(48, 'x');
process.env.FRONTEND_URL = 'https://maisonorderplanning.in';

const Invoice = require('../models/invoice');
const { financialYear } = require('../utils/invoiceNumber');
const { renderInvoicePdf, invoiceFilename } = require('../utils/invoicePdf');
const {
    computeContentHash,
    computeVerifyToken,
    tokenMatches,
    verifyUrl,
    fingerprint,
} = require('../utils/invoiceSigning');
const { sendEmail } = require('../utils/sendEmail');
const { verifyInvoice } = require('../controllers/invoice');
const { stubs, mockRes } = require('./helpers');

const s = stubs();
test.afterEach(() => s.restore());

const baseInvoice = () => ({
    _id: 'abc12345',
    invoiceNumber: 'MSN/26-27/000001',
    type: 'order',
    sourceId: 'ord00001',
    order: 'ord00001',
    user: 'u1',
    issuedAt: new Date('2026-10-02T10:00:00Z'),
    paymentRef: '4518936510',
    billedTo: { name: 'Test User', email: 'test@example.com', city: 'Coimbatore' },
    lines: [{ description: 'Linen Overshirt', quantity: 2, unitPrice: 2499, amount: 4998 }],
    subtotal: 4998,
    shipping: 0,
    discount: 0,
    tax: 0,
    total: 4998,
    currency: 'INR',
    status: 'issued',
});

const signed = () => {
    const invoice = baseInvoice();
    invoice.contentHash = computeContentHash(invoice);
    return invoice;
};

// ---- Numbering / rendering / email ----------------------------------------

test('financialYear rolls over in April', () => {
    assert.strictEqual(financialYear(new Date('2026-03-31T12:00:00')), '25-26');
    assert.strictEqual(financialYear(new Date('2026-04-01T12:00:00')), '26-27');
    assert.strictEqual(financialYear(new Date('2027-01-15T12:00:00')), '26-27');
});

test('invoiceFilename is filesystem-safe', () => {
    assert.strictEqual(invoiceFilename(baseInvoice()), 'MSN-26-27-000001.pdf');
});

test('renderInvoicePdf produces an edit-restricted PDF when signed', async () => {
    const pdf = await renderInvoicePdf(signed());
    assert.strictEqual(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.includes('/Encrypt'), 'expected permissions dictionary');
});

test('renderInvoicePdf still works for unsigned (legacy) invoices', async () => {
    const pdf = await renderInvoicePdf(baseInvoice());
    assert.strictEqual(pdf.subarray(0, 5).toString(), '%PDF-');
});

test('sendEmail forwards attachments to Resend as base64', async t => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM_NOREPLY = 'Maison <noreply@example.com>';
    process.env.EMAIL_FROM_SUPPORT = 'Maison <support@example.com>';

    let body;
    t.mock.method(global, 'fetch', async (url, init) => {
        body = JSON.parse(init.body);
        return { ok: true, json: async () => ({ id: 'email_1' }) };
    });

    await sendEmail({
        email: 'test@example.com',
        sender: 'support',
        subject: 'Invoice',
        html: '<p>hi</p>',
        attachments: [{ filename: 'a.pdf', content: Buffer.from('%PDF-test') }],
    });

    assert.strictEqual(body.from, 'Maison <support@example.com>');
    assert.deepStrictEqual(body.attachments, [
        { filename: 'a.pdf', content: Buffer.from('%PDF-test').toString('base64') },
    ]);
});

// ---- Signing ----------------------------------------------------------------

test('content hash changes when any billed value changes', () => {
    const original = computeContentHash(baseInvoice());
    const tampered = baseInvoice();
    tampered.total = 49980;
    assert.notStrictEqual(computeContentHash(tampered), original);

    const renamed = baseInvoice();
    renamed.lines[0].description = 'Cashmere Overshirt';
    assert.notStrictEqual(computeContentHash(renamed), original);
});

test('content hash ignores number formatting and lifecycle fields', () => {
    const a = baseInvoice();
    const b = { ...baseInvoice(), total: '4998.00', status: 'refunded', emailStatus: 'sent' };
    assert.strictEqual(computeContentHash(a), computeContentHash(b));
});

test('verify token only matches its own invoice', () => {
    const invoice = signed();
    const token = computeVerifyToken(invoice);
    assert.ok(tokenMatches(invoice, token));
    assert.ok(!tokenMatches({ ...invoice, _id: 'zzz99999' }, token));
    assert.ok(!tokenMatches(invoice, token.replace(/.$/, c => (c === 'A' ? 'B' : 'A'))));
    assert.ok(!tokenMatches(invoice, undefined));
    assert.match(verifyUrl(invoice), /^https:\/\/maisonorderplanning\.in\/verify\/abc12345\.[A-Za-z0-9_-]{22}$/);
    assert.match(fingerprint(invoice), /^[0-9A-F]{4}( [0-9A-F]{4}){3}$/);
});

// ---- Immutability -------------------------------------------------------------

test('billed fields cannot be updated through the model', async () => {
    await assert.rejects(
        Invoice.updateOne({ _id: 'abc12345' }, { $set: { total: 1 } }).exec(),
        /immutable/
    );
    await assert.rejects(
        Invoice.findOneAndUpdate({ _id: 'abc12345' }, { 'lines.0.amount': 1 }).exec(),
        /immutable/
    );
    await assert.rejects(Invoice.deleteOne({ _id: 'abc12345' }).exec(), /cannot be deleted/);
});

test('saving a modified billed field is rejected', async () => {
    const doc = Invoice.hydrate(signed());
    doc.total = 1;
    await assert.rejects(doc.save(), /immutable/);
});

// ---- Public verification endpoint -------------------------------------------

const verify = async (ref, invoice) => {
    s.set(Invoice, 'findById', async () => (invoice ? Invoice.hydrate(invoice) : null));
    const res = mockRes();
    await verifyInvoice({ params: { ref } }, res);
    return res;
};

test('verify: genuine invoice returns masked, minimal details', async () => {
    const invoice = signed();
    const res = await verify(`${invoice._id}.${computeVerifyToken(invoice)}`, invoice);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.valid, true);
    assert.strictEqual(res.body.status, 'issued');
    assert.strictEqual(res.body.invoice.billedTo, 'T*** U***');
    assert.strictEqual(res.body.invoice.total, 4998);
    assert.strictEqual(res.body.invoice.email, undefined);
    assert.strictEqual(res.body.invoice.paymentRef, undefined);
});

test('verify: wrong token is indistinguishable from a missing invoice', async () => {
    const invoice = signed();
    const forged = await verify(`${invoice._id}.${'A'.repeat(22)}`, invoice);
    const missing = await verify(`zzz99999.${'A'.repeat(22)}`, null);
    assert.strictEqual(forged.statusCode, 404);
    assert.deepStrictEqual(forged.body, missing.body);
});

test('verify: a row edited in the database fails the integrity check', async () => {
    const invoice = signed();
    const token = computeVerifyToken(invoice);
    invoice.total = 1; // edited directly in Mongo; stored hash no longer matches
    const res = await verify(`${invoice._id}.${token}`, invoice);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.valid, false);
    assert.strictEqual(res.body.status, 'integrity-failed');
});

test('verify: malformed refs are rejected without a lookup', async () => {
    let looked = false;
    s.set(Invoice, 'findById', async () => { looked = true; return null; });
    const res = mockRes();
    await verifyInvoice({ params: { ref: '../../etc/passwd' } }, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(looked, false);
});

// ---- Credit notes -----------------------------------------------------------

const Counter = require('../models/counter');
const { createCreditNote } = require('../services/invoiceService');

test('credit note reverses the original invoice and is hashed with v2', async () => {
    const original = { ...signed(), _id: 'inv00001', user: 'u1' };
    s.set(Invoice, 'findOne', async filter => (filter.type === 'order' ? original : null));
    s.set(Counter, 'findOneAndUpdate', async () => ({ seq: 7 }));
    let created;
    s.set(Invoice, 'create', async doc => { created = doc; return doc; });

    await createCreditNote({ _id: 'ord00001', user: 'u1' }, { _id: 'ref00001', amount: 4998 },
        { refundMethod: 'store-credit' });

    assert.match(created.invoiceNumber, /^MCN\/\d{2}-\d{2}\/000007$/);
    assert.equal(created.type, 'credit-note');
    assert.equal(created.sourceId, 'ref00001');
    assert.equal(created.creditNoteFor, 'inv00001');
    assert.equal(created.creditNoteForNumber, original.invoiceNumber);
    assert.deepEqual(created.lines.map(l => l.amount), [4998]);
    assert.equal(created.total, 4998);
    assert.equal(created.hashVersion, 2);
    assert.equal(computeContentHash(created), created.contentHash);

    // v2 covers the refund method: changing it breaks the hash.
    assert.notEqual(computeContentHash({ ...created, refundMethod: 'original' }), created.contentHash);
});

test('a partial refund becomes a single credit line', async () => {
    const original = { ...signed(), _id: 'inv00001', user: 'u1' };
    s.set(Invoice, 'findOne', async filter => (filter.type === 'order' ? original : null));
    s.set(Counter, 'findOneAndUpdate', async () => ({ seq: 8 }));
    let created;
    s.set(Invoice, 'create', async doc => { created = doc; return doc; });

    await createCreditNote({ _id: 'ord00001', user: 'u1' }, { _id: 'ref00002', amount: 1000 });
    assert.equal(created.lines.length, 1);
    assert.equal(created.total, 1000);
    assert.equal(created.shipping, 0);
});

test('v1 invoices keep verifying after the hash format moved to v2', () => {
    const legacy = baseInvoice(); // no hashVersion = v1
    const hash = computeContentHash(legacy);
    assert.equal(computeContentHash({ ...legacy, hashVersion: 1, refundMethod: 'original' }), hash);
});
