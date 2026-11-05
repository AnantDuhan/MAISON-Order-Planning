/**
 * Core Web Vitals from real visitors (frontend utils/webVitals.js) and the
 * admin report: the 75th percentile per metric, as Google judges a site.
 */
const WebVital = require('../models/webVital');

// Google's thresholds: good up to the first number, poor above the second.
const THRESHOLDS = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
};
const METRICS = Object.keys(THRESHOLDS);
const PAGES = ['home', 'listing', 'product', 'cart', 'checkout', 'account', 'other'];
const DEVICES = ['mobile', 'desktop'];
// Beyond these a value is a broken measurement (a tab left in the background).
const CEILING = { LCP: 60000, INP: 30000, CLS: 10, FCP: 60000, TTFB: 60000 };
// Fewer samples than this and the report says so instead of showing a number.
const MIN_SAMPLES = 20;
const MAX_BATCH = 10;

const rate = (metric, value) => {
    const [good, poor] = THRESHOLDS[metric];
    return value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor';
};

/** Validate a batch from the browser. Anything malformed is dropped, not stored. */
const cleanBatch = body => {
    const page = PAGES.includes(body?.page) ? body.page : null;
    const device = DEVICES.includes(body?.device) ? body.device : null;
    if (!page || !device || !Array.isArray(body.metrics)) return [];
    const seen = new Set();
    const docs = [];
    for (const item of body.metrics.slice(0, MAX_BATCH)) {
        const metric = METRICS.includes(item?.name) ? item.name : null;
        const value = Number(item?.value);
        if (!metric || seen.has(metric) || !Number.isFinite(value) || value < 0 || value > CEILING[metric]) continue;
        seen.add(metric); // one of each per page view
        docs.push({ metric, value: metric === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value), page, device });
    }
    return docs;
};

const record = async body => {
    const docs = cleanBatch(body);
    if (docs.length) await WebVital.insertMany(docs, { ordered: false });
    return docs.length;
};

/** Nearest-rank 75th percentile of a sorted list. */
const p75 = sorted => (sorted.length ? sorted[Math.ceil(0.75 * sorted.length) - 1] : null);

const summarize = (metric, values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const value = sorted.length >= MIN_SAMPLES ? p75(sorted) : null;
    return {
        metric,
        p75: value,
        rating: value == null ? null : rate(metric, value),
        samples: sorted.length,
        thresholds: THRESHOLDS[metric],
    };
};

/**
 * The admin report for one device type over the last `days` days.
 * @returns {{device, days, since, minSamples, overall: object[], byPage: Array<{page, metrics: object[]}>}}
 */
const report = async ({ device = 'mobile', days = 28, now = new Date() } = {}) => {
    const safeDevice = DEVICES.includes(device) ? device : 'mobile';
    const safeDays = Math.min(30, Math.max(1, Math.floor(Number(days)) || 28));
    const since = new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);

    const groups = await WebVital.aggregate([
        { $match: { device: safeDevice, createdAt: { $gte: since } } },
        { $group: { _id: { metric: '$metric', page: '$page' }, values: { $push: '$value' } } },
    ]);

    const all = Object.fromEntries(METRICS.map(m => [m, []]));
    const byPage = {};
    for (const { _id, values } of groups) {
        all[_id.metric]?.push(...values);
        (byPage[_id.page] ||= {})[_id.metric] = values;
    }

    return {
        device: safeDevice,
        days: safeDays,
        since,
        minSamples: MIN_SAMPLES,
        overall: METRICS.map(m => summarize(m, all[m])),
        byPage: PAGES.filter(page => byPage[page]).map(page => ({
            page,
            metrics: METRICS.map(m => summarize(m, byPage[page][m] || [])),
        })),
    };
};

module.exports = { record, report, cleanBatch, rate, p75, THRESHOLDS, MIN_SAMPLES };
