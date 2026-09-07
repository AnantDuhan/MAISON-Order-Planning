const User = require('./models/user');
const ejs = require('ejs');
const path = require('path');
const { sendEmail } = require('./utils/sendEmail');

/**
 * Email every user who has items sitting in their wishlist a gentle reminder.
 * Mirrors the weekly-newsletter job: best-effort per user, failures logged and
 * never abort the batch. Wired in server.js on a daily interval.
 */
const runWishlistReminders = async () => {
    const users = await User.find({ 'wishlist.0': { $exists: true } }).select('name email wishlist');
    if (!users.length) return;

    for (const user of users) {
        if (!user.email) continue;
        try {
            const items = (user.wishlist || []).slice(0, 4); // keep the email short
            const emailMessage = await ejs.renderFile(
                path.join(__dirname, 'mails/wishlist-reminder.ejs'),
                { name: user.name, items }
            );
            await sendEmail({
                email: user.email,
                subject: 'Still thinking it over? Your wishlist awaits',
                html: emailMessage,
            });
        } catch (error) {
            console.error(`Wishlist reminder failed for ${user.email}:`, error.message);
        }
    }
};

module.exports = runWishlistReminders;
