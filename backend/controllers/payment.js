const generateId = require('../utils/generateId');
const inventory = require('../services/inventoryService');
const wallet = require('../services/walletService');
const featureFlags = require('../services/featureFlags');
const { priceOrder } = require('../utils/orderPricing');
const {
    cashfreeRequest,
    getCashfreeOrder,
    verifyCashfreeWebhook,
} = require('../utils/cashfree');

exports.createCashfreeOrder = async (req, res) => {
    try {
        if(req.user?.isDemo) {
            return res.status(403).json({
                success: false,
                isDemoUser: true,
                message: "Demo mode — payments are disabled. This is a demonstration account.",
            });
        }

        // The amount is computed on the server from DB prices. Any `amount`
        // the client sends is ignored.
        const { orderItems, couponCode, useStoreCredit } = req.body;

        // Admin feature switches (/admin/features).
        if (couponCode && !(await featureFlags.isEnabled('coupons'))) {
            return res.status(403).json({ success: false, code: 'FEATURE_DISABLED', feature: 'coupons', message: featureFlags.offMessage('coupons') });
        }
        if (useStoreCredit && !(await featureFlags.isEnabled('storeCredit'))) {
            return res.status(403).json({ success: false, code: 'FEATURE_DISABLED', feature: 'storeCredit', message: featureFlags.offMessage('storeCredit') });
        }

        // Housekeeping: return stock from checkouts that were never paid.
        inventory.releaseExpiredHolds({ limit: 20 }).catch(() => {});
        // A retry must not compete with this user's own earlier attempt.
        await inventory.releaseUserHolds(req.user._id, 'superseded by a new checkout');

        const { totalPrice: orderAmount, orderItems: pricedItems } = await priceOrder(orderItems, couponCode);
        if (!(orderAmount > 0)) {
            return res.status(400).json({ success: false, message: 'Order total must be greater than zero' });
        }

        const cashfreeOrderId = `order_${req.user._id}_${generateId()}`;

        // Hold the stock for the duration of the payment. If anyone else gets the
        // last unit first, this fails before the customer is asked to pay.
        await inventory.reserveForCheckout({
            userId: req.user._id,
            cashfreeOrderId,
            items: pricedItems,
        });

        // Store credit first; the remainder (if any) is paid online.
        let storeCreditApplied = 0;
        if (useStoreCredit) {
            try {
                storeCreditApplied = await wallet.applyToCheckout({
                    userId: req.user._id,
                    checkoutId: cashfreeOrderId,
                    totalRupees: orderAmount,
                });
                if (storeCreditApplied > 0) await inventory.setHoldWallet(cashfreeOrderId, storeCreditApplied);
            } catch (error) {
                await inventory.releaseHoldForPayment(cashfreeOrderId, 'store credit failed').catch(() => {});
                throw error;
            }
        }
        const amountDue = Math.round((orderAmount - storeCreditApplied) * 100) / 100;

        // Fully covered by store credit: no online payment needed.
        if (amountDue <= 0) {
            return res.status(200).json({
                success: true,
                walletOnly: true,
                orderId: cashfreeOrderId,
                amount: 0,
                storeCreditApplied,
                holdMinutes: inventory.HOLD_MINUTES,
            });
        }

        const payload = {
            order_id: cashfreeOrderId,
            order_amount: Number(amountDue.toFixed(2)),
            order_currency: 'INR',
            customer_details: {
                customer_id: String(req.user._id),
                customer_name: req.user.name,
                customer_email: req.user.email,
                customer_phone: String(req.user.whatsappNumber || req.body.phoneNumber || '9999999999'),
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/payment?cashfree_order_id=${cashfreeOrderId}`,
            },
        };

        if (process.env.CASHFREE_WEBHOOK_URL) {
            payload.order_meta.notify_url = process.env.CASHFREE_WEBHOOK_URL;
        }

        let cashfreeOrder;
        try {
            cashfreeOrder = await cashfreeRequest('/orders', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        } catch (error) {
            await inventory.releaseHoldForPayment(cashfreeOrderId, 'payment session failed').catch(() => {});
            throw error;
        }

        res.status(200).json({
            success: true,
            orderId: cashfreeOrder.order_id,
            paymentSessionId: cashfreeOrder.payment_session_id,
            amount: payload.order_amount,
            storeCreditApplied,
            holdMinutes: inventory.HOLD_MINUTES,
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

exports.cashfreeWebhook = async (req, res) => {
    const check = await verifyCashfreeWebhook(req);
    if (!check.ok) {
        // Duplicates get a 200 so Cashfree stops retrying them.
        return res.status(check.status).json({ success: check.status === 200, message: check.message });
    }

    res.status(200).json({ success: true });
};
