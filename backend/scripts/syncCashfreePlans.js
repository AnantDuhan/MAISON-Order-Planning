/**
 * Create the Cashfree membership plans for the prices currently configured.
 *
 * Prices come from env (see utils/membershipPlans.js):
 *   CASHFREE_ESSENTIAL_YEARLY_AMOUNT   Essential, per year
 *   CASHFREE_PLUS_YEARLY_AMOUNT       Plus, per month
 *   CASHFREE_PLUS_YEARLY_AMOUNT        Plus, per year
 * Each plan id carries its price (maison-plus-monthly-249), so a new price
 * is a new plan; existing members stay on the plan they joined.
 *
 * The server also creates a plan the first time someone joins it. Running
 * this after a price change does that up front, so the first customer isn't
 * the one who finds out the Cashfree keys or plan settings are wrong.
 *
 *   node scripts/syncCashfreePlans.js            check only (default)
 *   node scripts/syncCashfreePlans.js --apply    create the missing plans
 *
 * Uses CASHFREE_APP_ID / CASHFREE_SECRET_KEY / CASHFREE_ENVIRONMENT from
 * config/config.env or the shell (the shell wins), so you can run it once
 * against sandbox and once against production.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });

const { PLANS } = require('../utils/membershipPlans');
const { getCashfreePlan } = require('../utils/cashfree');
const { ensurePlan, isMissingPlan } = require('../utils/cashfreePlans');

const run = async () => {
    const apply = process.argv.includes('--apply');
    const environment = process.env.CASHFREE_ENVIRONMENT === 'production' ? 'PRODUCTION' : 'sandbox';
    console.log(`Cashfree ${environment} · ${apply ? 'creating missing plans' : 'check only (add --apply to create)'}\n`);

    let missing = 0;
    for (const plan of Object.values(PLANS)) {
        const label = `${plan.name} · ${plan.interval}`.padEnd(26);
        const price = `₹${plan.amount.toLocaleString('en-IN')}/${plan.intervalType === 'MONTH' ? 'month' : 'year'}`.padEnd(14);
        let line;
        if (apply) {
            const { status } = await ensurePlan(plan);
            line = status === 'created' ? 'created' : 'already in Cashfree';
        } else {
            try {
                const existing = await getCashfreePlan(plan.planId);
                const amount = Number(existing?.plan_recurring_amount ?? existing?.plan_max_amount);
                line = Number.isFinite(amount) && amount !== plan.amount
                    ? `in Cashfree but at ₹${amount} (expected ₹${plan.amount})`
                    : 'in Cashfree';
            } catch (error) {
                if (!isMissingPlan(error)) throw error;
                missing += 1;
                line = 'MISSING (run with --apply)';
            }
        }
        console.log(`  ${label} ${price} ${plan.planId.padEnd(30)} ${line}`);
    }
    if (!apply && missing) process.exitCode = 1;
};

run().catch(error => {
    console.error(`\nCashfree said: ${error.message}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`);
    process.exitCode = 1;
});
