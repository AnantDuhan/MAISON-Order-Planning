const Subscribe = require('./models/subscribe');
const Product = require('./models/product');
const ejs = require('ejs');
const path = require('path');
const { sendEmail } = require('./utils/sendEmail');

const runWeeklyNewsletter = async () => {
    const cutoff = new Date(Date.now() - 60 * 1000);
    const subscribers = await Subscribe.find({
        unsubscribedAt: null,
        $or: [{ lastNewsletterSentAt: null }, { lastNewsletterSentAt: { $lte: cutoff } }],
    });
    if (!subscribers.length) return;

    const products = await Product.find().sort({ createdAt: -1 }).limit(3).lean();
    if (!products.length) return;

    for (const subscriber of subscribers) {
        try {
            const emailMessage = await ejs.renderFile(
                path.join(__dirname, 'mails/newsletter-weekly.ejs'),
                {
                    products,
                    frontendUrl: process.env.FRONTEND_URL,
                    unsubscribeUrl: `${process.env.NEWSLETTER_UNSUBSCRIBE_URL || `${process.env.FRONTEND_URL}/api/v1/unsubscribe`}/${subscriber.unsubscribeToken}`,
                },
            );
            await sendEmail({
                email: subscriber.email,
                subject: 'The Maison Journal · This week at Maison',
                html: emailMessage,
            });
            await Subscribe.updateOne({ _id: subscriber._id }, { lastNewsletterSentAt: new Date() });
        } catch (error) {
            console.error(`Newsletter delivery failed for ${subscriber.email}:`, error.message);
        }
    }
};

module.exports = runWeeklyNewsletter;