const crypto = require('crypto');

const CASHFREE_API_VERSION = '2025-01-01';

const getCashfreeBaseUrl = () =>
    process.env.CASHFREE_ENVIRONMENT === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';

const cashfreeHeaders = () => ({
    'Content-Type': 'application/json',
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
});

const cashfreeRequest = async (path, options = {}) => {
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
        throw new Error('Cashfree credentials are not configured');
    }

    const response = await fetch(`${getCashfreeBaseUrl()}${path}`, {
        ...options,
        headers: {
            ...cashfreeHeaders(),
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.message || 'Cashfree request failed');
        error.statusCode = response.status;
        throw error;
    }

    return data;
};

const getCashfreeOrder = orderId => cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`);
const getCashfreePlan = planId => cashfreeRequest(`/plans/${encodeURIComponent(planId)}`);

const verifyCashfreeWebhookSignature = (timestamp, rawBody, signature) => {
    if (!timestamp || !rawBody || !signature || !process.env.CASHFREE_SECRET_KEY) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
        .update(timestamp + rawBody)
        .digest('base64');
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    return (
        expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    );
};

module.exports = {
    cashfreeRequest,
    getCashfreeOrder,
    getCashfreePlan,
    getCashfreeBaseUrl,
    verifyCashfreeWebhookSignature,
};