const { cashfreeRequest, getCashfreePlan } = require('./cashfree');

/**
 * The Cashfree plan body for one of our plans (utils/membershipPlans.js).
 * The plan id carries the amount, so a new price is a new plan; Cashfree
 * plans are never edited in place.
 */
const planBody = plan => ({
    plan_id: plan.planId,
    plan_name: plan.name,
    plan_type: 'PERIODIC',
    plan_currency: 'INR',
    plan_max_amount: plan.amount,
    plan_recurring_amount: plan.amount,
    plan_intervals: 1,
    plan_interval_type: plan.intervalType,
});

/**
 * Cashfree returns HTTP 400 for unknown plans, rather than 404.
 */
const isMissingPlan = error =>
    error?.statusCode === 404
    || (error?.statusCode === 400 && (/does not exist|not found/i.test(error.message || '') || /not_found/i.test(error.code || '')));

/**
 * Make sure `plan` exists in Cashfree. Returns { status, plan } where status
 * is 'exists' or 'created'. Another server creating it at the same moment
 * (409) counts as existing.
 */
const ensurePlan = async plan => {
    try {
        return { status: 'exists', plan: await getCashfreePlan(plan.planId) };
    } catch (error) {
        if (!isMissingPlan(error)) throw error;
    }
    try {
        return { status: 'created', plan: await cashfreeRequest('/plans', { method: 'POST', body: JSON.stringify(planBody(plan)) }) };
    } catch (error) {
        if (error.statusCode !== 409) throw error;
        return { status: 'exists', plan: null };
    }
};

module.exports = { ensurePlan, planBody, isMissingPlan };
