const Subscription = require('../models/plusMembership');
const User = require('../models/user');
const ejs = require('ejs');
const path = require('path');
const generateId = require('../utils/generateId');
const { sendEmailInBackground } = require('../utils/sendEmail');
const {
    cashfreeRequest,
    getCashfreePlan,
    verifyCashfreeWebhookSignature,
} = require('../utils/cashfree');

const planConfig = {
    monthly: {
        planId: 'maison-monthly',
        name: 'Maison Monthly',
        amount: Number(process.env.CASHFREE_MONTHLY_AMOUNT || 299),
        duration: 1,
        intervalType: 'MONTH',
    },
    yearly: {
        planId: 'maison-yearly',
        name: 'Maison Yearly',
        amount: Number(process.env.CASHFREE_YEARLY_AMOUNT || 1599),
        duration: 12,
        intervalType: 'YEAR',
    },
};

const getPlan = interval => planConfig[interval];

const getSubscriptionDetails = cashfreeSubscription =>
    cashfreeSubscription.subscription_details || cashfreeSubscription;

const getNextPaymentDate = cashfreeSubscription => {
    const details = getSubscriptionDetails(cashfreeSubscription);
    const value = details.next_schedule_date || cashfreeSubscription.next_schedule_date;
    return value ? new Date(value) : null;
};

const sendActivationEmailOnce = async membership => {
    const claimedMembership = await Subscription.findOneAndUpdate(
        { _id: membership._id, isActive: true, activationEmailSent: { $ne: true } },
        {
            activationEmailSent: true,
            activatedAt: membership.activatedAt || new Date(),
        },
        { returnDocument: 'after' },
    );
    if (!claimedMembership) return;

    const user = await User.findById(claimedMembership.user).select('name email');
    if (!user?.email) return;

    const nextPaymentDate = claimedMembership.nextPaymentDate
        ? new Date(claimedMembership.nextPaymentDate).toLocaleDateString()
        : 'Cashfree will confirm your next billing date';
    const emailMessage = await ejs.renderFile(
        path.join(__dirname, '../mails/membership-activated.ejs'),
        {
            user,
            membership: claimedMembership,
            nextPaymentDate,
        },
    );

    sendEmailInBackground({
        email: user.email,
        subject: 'Your Maison membership is now active',
        html: emailMessage,
    });
};

const syncMembership = async membership => {
    try {
        const cashfreeSubscription = await cashfreeRequest(
            `/subscriptions/${encodeURIComponent(membership.subscriptionId)}`,
        );
        const details = getSubscriptionDetails(cashfreeSubscription);
        membership.status = details.subscription_status || membership.status;
        membership.isActive = membership.status === 'ACTIVE';
        membership.nextPaymentDate = getNextPaymentDate(cashfreeSubscription);
        if (!membership.nextPaymentDate && membership.isActive) {
            const nextPaymentDate = new Date(membership.createdAt || Date.now());
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + membership.duration);
            membership.nextPaymentDate = nextPaymentDate;
        }
        await membership.save();
        if (membership.isActive) {
            await sendActivationEmailOnce(membership);
        }
    } catch (error) {
        // Keep the last webhook-backed state if Cashfree is temporarily unavailable.
        console.error('Could not refresh Cashfree membership status:', error.message);
    }
    return membership;
};

const ensurePlan = async plan => {
    try {
        return await getCashfreePlan(plan.planId);
    } catch (error) {
        if (error.statusCode !== 404) {
            throw error;
        }
    }

    try {
        return await cashfreeRequest('/plans', {
            method: 'POST',
            body: JSON.stringify({
                plan_id: plan.planId,
                plan_name: plan.name,
                plan_type: 'PERIODIC',
                plan_currency: 'INR',
                plan_max_amount: plan.amount,
                plan_recurring_amount: plan.amount,
                plan_intervals: 1,
                plan_interval_type: plan.intervalType,
            }),
        });
    } catch (error) {
        // A plan can already exist when the server restarts; reuse it.
        if (error.statusCode !== 409) {
            throw error;
        }
    }
};

exports.getMembershipPlans = (req, res) => {
    Promise.all(Object.entries(planConfig).map(async ([interval, plan]) => {
        let existsInCashfree = false;
        try {
            await getCashfreePlan(plan.planId);
            existsInCashfree = true;
        } catch (error) {
            if (error.statusCode !== 404) throw error;
        }
        return { interval, planId: plan.planId, name: plan.name, amount: plan.amount, duration: plan.duration, existsInCashfree };
    }))
        .then(plans => res.status(200).json({ success: true, plans }))
        .catch(error => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
};

exports.membershipReturn = (req, res) => {
    const subscriptionId = req.body?.subscription_id || req.query.subscription_id;
    const membershipUrl = new URL('/membership', process.env.FRONTEND_URL);
    if (subscriptionId) {
        membershipUrl.searchParams.set('subscription_id', subscriptionId);
    }
    res.redirect(303, membershipUrl.toString());
};

exports.getCurrentMembership = async (req, res) => {
    try {
        const membership = await Subscription.findOne({ user: req.user._id, isActive: true })
            .sort({ createdAt: -1 })
            || await Subscription.findOne({ user: req.user._id }).sort({ createdAt: -1 });

        if (membership) {
            await syncMembership(membership);
        }

        res.status(200).json({ success: true, membership: membership || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createMembershipSubscription = async (req, res) => {
    try {
        const activeMembership = await Subscription.findOne({ user: req.user._id, isActive: true });
        if (activeMembership) {
            return res.status(409).json({ success: false, message: 'You already have an active membership' });
        }

        const plan = getPlan(req.body.interval);
        if (!plan) {
            return res.status(400).json({ success: false, message: 'Choose a monthly or yearly plan' });
        }

        await ensurePlan(plan);
        const subscriptionId = `sub_${req.user._id}_${generateId()}`;
        const cashfreeSubscription = await cashfreeRequest('/subscriptions', {
            method: 'POST',
            body: JSON.stringify({
                subscription_id: subscriptionId,
                customer_details: {
                    customer_name: req.user.name,
                    customer_email: req.user.email,
                    customer_phone: String(req.user.whatsappNumber || req.body.phoneNumber || '9999999999'),
                },
                plan_details: { plan_id: plan.planId },
                authorization_details: {
                    authorization_amount: 1,
                    authorization_amount_refund: true,
                },
                subscription_meta: {
                    return_url: process.env.CASHFREE_RETURN_URL || `${process.env.FRONTEND_URL}/membership`,
                },
            }),
        });

        await Subscription.create({
            _id: generateId(),
            subscriptionId,
            cashfreeSubscriptionId: subscriptionId,
            subscriptionSessionId: cashfreeSubscription.subscription_session_id,
            planId: plan.planId,
            name: plan.name,
            description: `${plan.name} recurring membership`,
            amount: plan.amount,
            duration: plan.duration,
            user: req.user._id,
            status: cashfreeSubscription.subscription_status || 'INITIALIZED',
            isActive: false,
            createdAt: new Date(),
        });

        res.status(200).json({
            success: true,
            subscriptionId,
            subscriptionSessionId: cashfreeSubscription.subscription_session_id,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.getMembershipStatus = async (req, res) => {
    try {
        const membership = await Subscription.findOne({
            subscriptionId: req.params.subscriptionId,
            user: req.user._id,
        });
        if (!membership) {
            return res.status(404).json({ success: false, message: 'Membership not found' });
        }

        await syncMembership(membership);

        res.status(200).json({ success: true, membership });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.cancelMembership = async (req, res) => {
    try {
        const membership = await Subscription.findOne({
            subscriptionId: req.params.subscriptionId,
            user: req.user._id,
        });
        if (!membership) {
            return res.status(404).json({ success: false, message: 'Membership not found' });
        }

        if (['CANCELLED', 'COMPLETED', 'EXPIRED', 'CUSTOMER_CANCELLED'].includes(membership.status)) {
            return res.status(409).json({ success: false, message: 'This membership is already closed' });
        }

        await cashfreeRequest(`/subscriptions/${encodeURIComponent(membership.subscriptionId)}/manage`, {
            method: 'POST',
            body: JSON.stringify({ action: 'CANCEL' }),
        });
        membership.status = 'CANCELLED';
        membership.isActive = false;
        await membership.save();

        res.status(200).json({ success: true, membership });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

exports.membershipWebhook = async (req, res) => {
    const valid = verifyCashfreeWebhookSignature(
        req.headers['x-webhook-timestamp'],
        req.rawBody || '',
        req.headers['x-webhook-signature'],
    );
    if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    res.status(200).json({ success: true });

    try {
        const payload = JSON.parse(req.rawBody);
        const details = payload.data?.subscription_details || payload.data || payload;
        const subscriptionId = details.subscription_id || payload.subscription_id;
        const status = details.subscription_status || payload.subscription_status;
        const nextPaymentDate = details.next_schedule_date;
        if (subscriptionId && status) {
            const membership = await Subscription.findOne({ subscriptionId });
            if (membership) {
                membership.status = status;
                membership.isActive = status === 'ACTIVE';
                if (nextPaymentDate) membership.nextPaymentDate = new Date(nextPaymentDate);
                await membership.save();
                if (membership.isActive) await sendActivationEmailOnce(membership);
            }
        }
    } catch (error) {
        console.error('Cashfree subscription webhook processing failed:', error.message);
    }
};