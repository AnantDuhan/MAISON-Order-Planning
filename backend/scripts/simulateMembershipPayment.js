/**
 * Simulate Cashfree's SUBSCRIPTION_PAYMENT_SUCCESS webhook for a membership,
 * signed with your CASHFREE_SECRET_KEY exactly like Cashfree signs it.
 * Creates a membership invoice and emails it to the membership's owner.
 *
 * Point this at a LOCAL backend that uses a TEST database. Against production
 * it would create a real invoice and use up a real MSM serial number.
 *
 *   node scripts/simulateMembershipPayment.js <subscriptionId> [amount] [webhookUrl]
 *
 *   node scripts/simulateMembershipPayment.js sub_abc123_xyz 299
 *   node scripts/simulateMembershipPayment.js sub_abc123_xyz 299 http://localhost:8080/api/v1/membership/webhook
 *
 * Run it twice with the same payment id (set PAYMENT_ID=...) to check that a
 * duplicate payment does not create a second invoice.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });

const crypto = require('crypto');

const run = async () => {
    const [subscriptionId, amountArg, urlArg] = process.argv.slice(2);
    if (!subscriptionId) {
        console.error('Usage: node scripts/simulateMembershipPayment.js <subscriptionId> [amount] [webhookUrl]');
        process.exit(1);
    }
    const secret = process.env.CASHFREE_SECRET_KEY;
    if (!secret) throw new Error('CASHFREE_SECRET_KEY is not set in config.env');

    const url = urlArg || 'http://localhost:8080/api/v1/membership/webhook';
    if (/maisonorderplanning\.in|onrender\.com/.test(url) && !process.env.I_KNOW_THIS_IS_PRODUCTION) {
        throw new Error('Refusing to post a simulated payment to production. Set I_KNOW_THIS_IS_PRODUCTION=1 to override.');
    }

    const paymentId = process.env.PAYMENT_ID || `test_${Date.now()}`;
    const body = JSON.stringify({
        type: 'SUBSCRIPTION_PAYMENT_SUCCESS',
        event_time: new Date().toISOString(),
        data: {
            subscription_id: subscriptionId,
            cf_payment_id: paymentId,
            payment_id: paymentId,
            payment_amount: Number(amountArg || 299),
            payment_type: 'CHARGE',
            payment_status: 'SUCCESS',
            payment_initiated_date: new Date().toISOString(),
        },
    });

    const timestamp = String(Date.now());
    const signature = crypto.createHmac('sha256', secret).update(timestamp + body).digest('base64');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-webhook-timestamp': timestamp,
            'x-webhook-signature': signature,
        },
        body,
    });
    console.log(`POST ${url} -> ${response.status} ${await response.text()}`);
    console.log(`cf_payment_id used: ${paymentId}`);
    console.log('The invoice is created after the response; check the backend log and your inbox.');
};

run().catch(error => {
    console.error('FAILED:', error.message);
    process.exit(1);
});
