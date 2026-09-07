const generateId = require('../utils/generateId');
const {
    cashfreeRequest,
    getCashfreeOrder,
    verifyCashfreeWebhookSignature,
} = require('../utils/cashfree');

exports.createCashfreeOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const orderAmount = Number(amount);
        if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
            return res.status(400).json({ success: false, message: 'A valid payment amount is required' });
        }

        const cashfreeOrderId = `order_${req.user._id}_${generateId()}`;
        const payload = {
            order_id: cashfreeOrderId,
            order_amount: Number(orderAmount.toFixed(2)),
            order_currency: 'INR',
            customer_details: {
                customer_id: String(req.user._id),
                customer_name: req.user.name,
                customer_email: req.user.email,
                customer_phone: String(req.user.whatsappNumber || req.body.phoneNumber || '9999999999'),
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/payment`,
            },
        };

        if (process.env.CASHFREE_WEBHOOK_URL) {
            payload.order_meta.notify_url = process.env.CASHFREE_WEBHOOK_URL;
        }

        const cashfreeOrder = await cashfreeRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        res.status(200).json({
            success: true,
            orderId: cashfreeOrder.order_id,
            paymentSessionId: cashfreeOrder.payment_session_id,
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.verifyCashfreePayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId.startsWith(`order_${req.user._id}_`)) {
            return res.status(403).json({ success: false, message: 'You cannot verify this payment' });
        }

        const cashfreeOrder = await getCashfreeOrder(orderId);
        res.status(200).json({
            success: true,
            orderId,
            status: cashfreeOrder.order_status,
            paymentId: cashfreeOrder.cf_order_id || orderId,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.cashfreeWebhook = (req, res) => {
    const rawBody = req.rawBody || '';
    const valid = verifyCashfreeWebhookSignature(
        req.headers['x-webhook-timestamp'],
        rawBody,
        req.headers['x-webhook-signature'],
    );

    if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    res.status(200).json({ success: true });
};

exports.sendStripeApiKey = async (req, res, next) => {
    res.status(200).json({
        stripeApiKey: 'MOCK_API_KEY_1234567890'
    });
};
