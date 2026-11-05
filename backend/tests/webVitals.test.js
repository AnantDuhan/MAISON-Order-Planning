const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { stubs } = require('./helpers');

const WebVital = require('../models/webVital');
const webVitals = require('../services/webVitals');

const s = stubs();
afterEach(() => s.restore());

test('a beacon is stored only with a known page, device and sane values, one of each metric', () => {
    const docs = webVitals.cleanBatch({
        page: 'product',
        device: 'mobile',
        metrics: [
            { name: 'LCP', value: 2310.6 },
            { name: 'LCP', value: 9999 },          // second LCP in one view: dropped
            { name: 'CLS', value: 0.04567 },
            { name: 'INP', value: -5 },            // negative: dropped
            { name: 'TTFB', value: 'fast' },       // not a number: dropped
            { name: 'FID', value: 10 },            // not a metric we keep
            { name: 'FCP', value: 9e9 },           // a background tab, not a real paint
        ],
    });
    assert.deepEqual(docs, [
        { metric: 'LCP', value: 2311, page: 'product', device: 'mobile' },
        { metric: 'CLS', value: 0.046, page: 'product', device: 'mobile' },
    ]);
    assert.deepEqual(webVitals.cleanBatch({ page: '/admin', device: 'mobile', metrics: [{ name: 'LCP', value: 1 }] }), []);
    assert.deepEqual(webVitals.cleanBatch({ page: 'home', device: 'fridge', metrics: [{ name: 'LCP', value: 1 }] }), []);
    assert.deepEqual(webVitals.cleanBatch(null), []);
});

test('p75 is the nearest-rank 75th percentile and ratings follow Google\'s thresholds', () => {
    assert.equal(webVitals.p75([1, 2, 3, 4]), 3);
    assert.equal(webVitals.p75([10]), 10);
    assert.equal(webVitals.p75([]), null);
    assert.equal(webVitals.rate('LCP', 2500), 'good');
    assert.equal(webVitals.rate('LCP', 2501), 'needs-improvement');
    assert.equal(webVitals.rate('INP', 501), 'poor');
    assert.equal(webVitals.rate('CLS', 0.1), 'good');
});

test('the report shows a number only with enough visits, overall and per kind of page', async () => {
    const lcpHome = Array.from({ length: 30 }, (_, i) => 1000 + i * 100); // 1000…3900
    let match;
    s.set(WebVital, 'aggregate', async pipeline => {
        match = pipeline[0].$match;
        return [
            { _id: { metric: 'LCP', page: 'home' }, values: lcpHome },
            { _id: { metric: 'LCP', page: 'product' }, values: [5000, 6000] },
            { _id: { metric: 'CLS', page: 'home' }, values: [0.01, 0.02] },
        ];
    });
    const now = new Date('2026-11-05T00:00:00Z');
    const report = await webVitals.report({ device: 'desktop', days: '999', now });

    assert.equal(match.device, 'desktop');
    assert.equal(report.days, 30);
    assert.equal(match.createdAt.$gte.toISOString(), '2026-10-06T00:00:00.000Z');

    const lcp = report.overall.find(m => m.metric === 'LCP');
    assert.equal(lcp.samples, 32);
    assert.equal(lcp.p75, 3300); // 24th of 32 sorted values: 1000 + 23 × 100
    assert.equal(lcp.rating, 'needs-improvement');
    const cls = report.overall.find(m => m.metric === 'CLS');
    assert.equal(cls.p75, null); // 2 visits: not enough
    assert.equal(cls.samples, 2);

    assert.deepEqual(report.byPage.map(p => p.page), ['home', 'product']);
    assert.equal(report.byPage[1].metrics.find(m => m.metric === 'LCP').p75, null);
});

test('unknown device falls back to phones', async () => {
    let match;
    s.set(WebVital, 'aggregate', async pipeline => { match = pipeline[0].$match; return []; });
    const report = await webVitals.report({ device: 'toaster' });
    assert.equal(match.device, 'mobile');
    assert.ok(report.overall.every(m => m.samples === 0 && m.p75 === null));
});
