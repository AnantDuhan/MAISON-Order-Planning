const User = require('../models/user');
const stripe = require('stripe')(
    'sk_test_51K9RkSSDvITsgzEymgWGmrPCCP0Iu8b8j2AtRaZbnuXqwSLkQMSnTc6a6gQmRRzT60nP0KMhApPEpASMOPP3GgGh00rlK3KQm2'
);
const Subscription = require('../models/plusMembership');
const Snowflake = require('@theinternetfolks/snowflake');

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

exports.allPrices = async (req, res, next) => {
    try {
        const prices = await stripe.prices.list({
            apiKey: process.env.STRIPE_SECRET_KEY
        });

        console.log("prices", prices);

        res.status(201).json({ success: true, prices });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch prices'
        });
    }
}

exports.createSubscription = async (req, res, next) => {
    try {
        const {
            subscriptionId,
            name,
            description,
            amount,
            duration,
        } = req.body;

        const subscription = Subscription.create({
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            subscriptionId,
            name,
            description,
            amount,
            duration,
            user: req.user._id,
            isActive: true,
            createdAt: new Date()
        });

        const subscriptionData = await stripe.subscriptions.create({
            customer: req.user.stripeCustomerId,
            items: [{ price: subscriptionId }],
            expand: ['latest_invoice.payment_intent'],
        });

        await subscription.save();

        res.status(201).json({ success: true, subscription, subscriptionData });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to create a new subscription.'
        });
    }
}

exports.getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find();
        res.status(200).json({ success: true, subscriptions });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve subscriptions.'
        });
    }
};

exports.getSubscriptionById = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res
                .status(404)
                .json({ success: false, error: 'Subscription not found.' });
        }
        res.status(200).json({ success: true, subscription });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve the subscription.'
        });
    }
};

exports.updateSubscriptionById = async (req, res) => {
    try {
        const {
            subscriptionId,
            name,
            description,
            amount,
            duration,
            isActive,
        } = req.body;

        const updatedSubscription = await Subscription.findByIdAndUpdate(
            req.params.id,
            {
                subscriptionId,
                name,
                description,
                amount,
                duration,
                isActive,
            },
            { new: true }
        );

        if (!updatedSubscription) {
            return res
                .status(404)
                .json({ success: false, error: 'Subscription not found.' });
        }

        res.status(200).json({
            success: true,
            subscription: updatedSubscription
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to update the subscription.'
        });
    }
};

exports.cancelSubscription = async (req, res, next) => {
    try {
        const updatedSubscription = await Subscription.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!updatedSubscription) {
            return res
                .status(404)
                .json({ success: false, error: 'Subscription not found.' });
        }

        res.status(200).json({
            success: true,
            subscription: updatedSubscription
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel the subscription.'
        });
    }
};

exports.deleteSubscription = async (req, res, next) => {
    try {
        const deletedSubscription = await Subscription.findByIdAndDelete(
            req.params.id
        );

        if (!deletedSubscription) {
            return res
                .status(404)
                .json({ success: false, error: 'Subscription not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Subscription deleted successfully.'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete the subscription.'
        });
    }
}

exports.plusSubscription_monthly = async (req, res, next) => {
    try {
        const user = await User.findOne({ _id: req.user._id })
        const subscription = await stripe.subscriptions.create({
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            customer: user.stripeCustomerId,
            items: [{ price: 'price_1NqBy5SDvITsgzEydDy964tk' }]
        });
        const platinumId = subscription.id;

        const platinumExpires = new Date();
        platinumExpires.setDate(platinumExpires.getDate() + 30);

        await User.findByIdAndUpdate(req.user._id, {
            platinumId,
            platinumExpires
        });

        res.status(200).json({
            success: true,
            subscription
        });
    } catch (error) {
        console.log("Errors", error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the subscription.'
        });
    }
}

exports.plusSubscription_every3months = async (req, res, next) => {
    try {

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            customer: req.user._id,
            items: [{ price: 'price_1NqFbMSDvITsgzEyDQq1f4En' }]
        });

        const platinumId = subscription.id;

        const platinumExpires = new Date();
        platinumExpires.setDate(platinumExpires.getDate() + 90);

        await User.findByIdAndUpdate(req.user._id, {
            platinumId,
            platinumExpires
        });

        res.status(200).json({
            success: true,
            subscription
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the subscription.'
        });
    }
};

exports.plusSubscription_yearly = async (req, res, next) => {
    try {

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            customer: req.user._id,
            items: [{ price: 'price_1NqBxlSDvITsgzEybWFmkGg' }]
        });

        const platinumId = subscription.id;

        const platinumExpires = new Date();
        platinumExpires.setDate(platinumExpires.getFullYear() + 1);

        await User.findByIdAndUpdate(req.user._id, {
            platinumId,
            platinumExpires
        });

        res.status(200).json({
            success: true,
            subscription
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the subscription.'
        });
    }
};
