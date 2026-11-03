const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { stubs, mockRes } = require('./helpers');

const s = stubs();
afterEach(() => s.restore());

const PLANS_PATH = path.join(__dirname, '../utils/membershipPlans.js');
const freshPlans = env => {
    const saved = {};
    for (const [k, v] of Object.entries(env)) { saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    delete require.cache[require.resolve(PLANS_PATH)];
    try { return require(PLANS_PATH); } finally {
        for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
        delete require.cache[require.resolve(PLANS_PATH)];
    }
};

test('prices come from env, and the plan id carries the price', () => {
    const { PLANS } = freshPlans({ CASHFREE_ESSENTIAL_YEARLY_AMOUNT: '699', CASHFREE_PLUS_YEARLY_AMOUNT: ' 249 ', CASHFREE_PLUS_YEARLY_AMOUNT: '2199' });
    assert.deepEqual(Object.values(PLANS).map(p => [p.planId, p.amount]), [
        ['maison-essential-yearly-699', 699],
        ['maison-plus-monthly-249', 249],
        ['maison-plus-yearly-2199', 2199],
    ]);
});

test('a mistyped price falls back to the default instead of becoming NaN', () => {
    const errors = []; const original = console.error; console.error = m => errors.push(m);
    try {
        const { PLANS } = freshPlans({ CASHFREE_ESSENTIAL_YEARLY_AMOUNT: '₹699', CASHFREE_PLUS_YEARLY_AMOUNT: '249.5', CASHFREE_PLUS_YEARLY_AMOUNT: '' });
        assert.deepEqual(Object.values(PLANS).map(p => p.planId), ['maison-essential-yearly-600', 'maison-plus-monthly-199', 'maison-plus-yearly-1799']);
        assert.equal(errors.length, 2);
    } finally { console.error = original; }
});

test('the old env names are reported, not silently ignored', () => {
    const warnings = []; const original = console.warn; console.warn = m => warnings.push(m);
    try {
        freshPlans({ CASHFREE_PLUS_MONTHLY_AMOUNT: '249', CASHFREE_PLUS_YEARLY_AMOUNT: '2199' });
        assert.equal(warnings.length, 2);
        assert.match(warnings[0], /CASHFREE_PLUS_YEARLY_AMOUNT/);
    } finally { console.warn = original; }
});

test('ensurePlan: existing plans are reused, missing ones created with the right body', async () => {
    process.env.CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || 'test';
    process.env.CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'test';
    const { ensurePlan } = require('../utils/cashfreePlans');
    const plan = { planId: 'maison-plus-monthly-249', name: 'Maison Plus', amount: 249, intervalType: 'MONTH' };
    const calls = []; const realFetch = global.fetch;
    const reply = (status, body) => ({ ok: status < 300, status, json: async () => body });
    try {
        global.fetch = async (url, opts = {}) => { calls.push(`${opts.method || 'GET'} ${url.split('/pg')[1]}`); return reply(200, { plan_id: plan.planId }); };
        assert.equal((await ensurePlan(plan)).status, 'exists');

        let body;
        global.fetch = async (url, opts = {}) => {
            calls.push(`${opts.method || 'GET'} ${url.split('/pg')[1]}`);
            if ((opts.method || 'GET') === 'GET') return reply(404, { message: 'plan not found' });
            body = JSON.parse(opts.body); return reply(200, { plan_id: plan.planId });
        };
        assert.equal((await ensurePlan(plan)).status, 'created');
        assert.deepEqual(body, { plan_id: 'maison-plus-monthly-249', plan_name: 'Maison Plus', plan_type: 'PERIODIC', plan_currency: 'INR', plan_max_amount: 249, plan_recurring_amount: 249, plan_intervals: 1, plan_interval_type: 'MONTH' });

        // What Cashfree actually answers for an unknown plan: 400, not 404.
        calls.length = 0;
        global.fetch = async (url, opts = {}) => {
            calls.push(`${opts.method || 'GET'} ${url.split('/pg')[1]}`);
            return (opts.method || 'GET') === 'GET'
                ? reply(400, { message: 'Plan does not exist.', code: 'plan_id_invalid', type: 'invalid_request_error' })
                : reply(200, { plan_id: plan.planId });
        };
        assert.equal((await ensurePlan(plan)).status, 'created');
        assert.deepEqual(calls, ['GET /plans/maison-plus-monthly-249', 'POST /plans']);
        calls.length = 0;

        // Any other 400 is a real error, not a missing plan.
        global.fetch = async () => reply(400, { message: 'plan_interval_type is invalid' });
        await assert.rejects(ensurePlan(plan), /plan_interval_type is invalid/);

        global.fetch = async (url, opts = {}) => ((opts.method || 'GET') === 'GET' ? reply(404, {}) : reply(409, { message: 'exists' }));
        assert.equal((await ensurePlan(plan)).status, 'exists');

        global.fetch = async () => reply(401, { message: 'authentication failed' });
        await assert.rejects(ensurePlan(plan), /authentication failed/);
    } finally { global.fetch = realFetch; }
});

test('admin memberships: the demo admin gets the real plans, no "Elite"', async () => {
    const { getMemberships } = require('../controllers/analytics');
    const res = mockRes();
    await getMemberships({ user: { role: 'admin', isDemo: true } }, res);
    assert.equal(res.statusCode, 200);
    const plans = res.body.memberships.map(m => m.planLabel);
    assert.ok(plans.length > 0);
    assert.ok(plans.every(p => /^Maison (Essential|Plus) · (Monthly|Yearly)$/.test(p)), plans.join(', '));
});
