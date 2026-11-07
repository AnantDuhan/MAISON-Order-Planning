const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const express = require('express');

// Stand-in newsletter job that finishes only when the test says so.
let finishNewsletter;
let newsletterRuns = 0;
require.cache[path.join(__dirname, '../newsletterJob.js')] = {
    exports: () => {
        newsletterRuns += 1;
        return new Promise(resolve => { finishNewsletter = resolve; });
    },
};
require.cache[path.join(__dirname, '../wishlistJob.js')] = { exports: async () => {} };

let server;
let base;

before(async () => {
    process.env.CRON_SECRET = 'test-secret';
    const app = express();
    app.use('/api/v1', require('../routes/jobs'));
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(() => server.close());

const call = (job, secret = 'test-secret') => fetch(`${base}/jobs/${job}`, {
    method: 'POST',
    headers: { 'x-cron-secret': secret },
});

test('newsletter batch starts in the background, runs once at a time, then can run again', async () => {
    const first = await call('newsletter');
    assert.equal(first.status, 202);
    assert.equal((await first.json()).message, 'started');

    const second = await call('newsletter');
    assert.equal((await second.json()).message, 'already running');
    assert.equal(newsletterRuns, 1);

    finishNewsletter();
    await new Promise(resolve => setImmediate(resolve));

    const third = await call('newsletter');
    assert.equal((await third.json()).message, 'started');
    assert.equal(newsletterRuns, 2);
    finishNewsletter();
});

test('job endpoints refuse a wrong cron secret', async () => {
    const res = await call('wishlist', 'nope');
    assert.equal(res.status, 401);
});
