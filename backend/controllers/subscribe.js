const Subscribe = require('../models/subscribe');
const generateId = require('../utils/generateId');
const crypto = require('crypto');
const ejs = require('ejs');
const path = require('path');
const { sendEmailInBackground } = require('../utils/sendEmail');

const getUnsubscribeUrl = token =>
    `${process.env.NEWSLETTER_UNSUBSCRIBE_URL || `${process.env.FRONTEND_URL}/api/v1/unsubscribe`}/${token}`;

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

exports.subscriber = async (req, res, next) => {
    try {
            const { email } = req.body;

            const existingSubscriber = await Subscribe.findOne({ email });

            if (existingSubscriber) {
                return res
                    .status(400)
                    .json({ error: 'Email address is already subscribed.' });
            }

            const newSubscriber = await Subscribe.create({
                _id: generateId(),
                email,
                unsubscribeToken: crypto.randomBytes(24).toString('hex'),
            });

            const emailMessage = await ejs.renderFile(
                path.join(__dirname, '../mails/newsletter-welcome.ejs'),
                { unsubscribeUrl: getUnsubscribeUrl(newSubscriber.unsubscribeToken) },
            );
            sendEmailInBackground({
                email: newSubscriber.email,
                subject: 'Welcome to the Maison Journal',
                html: emailMessage,
            });
            await Subscribe.updateOne({ _id: newSubscriber._id }, { welcomeEmailSent: true });

            res.status(200).json({
                success: true,
                message: "You've successfully subscribed to our newsletter",
                newSubscriber
            });
        } catch (error) {
        res.status(500).json({
            success: false,
            message : error.message
        })
    }
}

exports.unsubscribe = async (req, res) => {
    const subscriber = await Subscribe.findOneAndUpdate(
        { unsubscribeToken: req.params.token, unsubscribedAt: null },
        { unsubscribedAt: new Date() },
        { returnDocument: 'after' },
    );

    res.status(subscriber ? 200 : 404).send(
        subscriber ? 'You have been unsubscribed from the Maison Journal.' : 'This unsubscribe link is invalid or has already been used.',
    );
};
