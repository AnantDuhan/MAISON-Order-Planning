const ejs = require('ejs');
const path = require('path');

const User = require('../models/user');
const mailer = require('../utils/sendEmail');

// Customer emails for a return: received, approved, declined. Sent from the
// support address so a reply reaches a person. Never throws: an email problem
// must not fail the request that triggered it.

const inr = value => {
    const n = Number(value || 0);
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

const COPY = {
    received: () => ({
        subject: 'We’ve received your return request',
        eyebrow: 'Return requested',
        headline: 'We’ve got your request',
        preheader: 'We’re reviewing your return and will be in touch.',
        paragraphs: [
            'Thank you for letting us know. We’re reviewing your return request now and will email you as soon as it’s approved, with how to send the items back.',
            'Please keep the items unused, in their original packaging, with all accessories.',
        ],
        steps: [],
    }),
    approved: () => ({
        subject: 'Your return is approved — here’s what to do',
        eyebrow: 'Return approved',
        headline: 'Your return is approved',
        preheader: 'Pack the items and reply to arrange sending them back.',
        paragraphs: [
            'Good news: we’ve approved your return. Your refund starts as soon as the items are back with us.',
        ],
        steps: [
            'Pack the items unused, in their original packaging, with all accessories and any freebies.',
            'Reply to this email and we’ll confirm how to send the parcel to us.',
            'Once it arrives and is checked, we refund you to your original payment method.',
        ],
    }),
    declined: () => ({
        subject: 'About your return request',
        eyebrow: 'Return declined',
        headline: 'We couldn’t accept this return',
        preheader: 'Reply to this email if you think this is a mistake.',
        paragraphs: [
            'We’ve reviewed your request and aren’t able to accept this return. Returns need to be requested within the return window shown on your order, with the items unused and complete.',
            'If you think this is a mistake, or something is wrong with your order, reply to this email and we’ll take another look.',
        ],
        steps: [],
    }),
};

/**
 * @param {'received'|'approved'|'declined'} kind
 * @param {object} order  needs _id, user (id or populated), totalPrice
 * @param {{reason?: string, details?: string}} [ret]
 */
async function sendReturnEmail(kind, order, ret = {}) {
    try {
        const make = COPY[kind];
        if (!make || !order) return false;
        const userId = order.user?._id || order.user;
        const user = order.user?.email ? order.user : await User.findById(userId).select('name email').lean();
        if (!user?.email) return false;

        const copy = make();
        const html = await ejs.renderFile(path.join(__dirname, '../mails/return-update.ejs'), {
            kind,
            copy,
            user,
            order,
            reason: ret.reason || '',
            details: ret.details || '',
            refundAmount: inr(order.refundInfo?.amount || order.totalPrice),
            orderLink: `${process.env.BACKEND_URL}/go/order/${order._id}`,
        });

        mailer.sendEmailInBackground({ email: user.email, sender: 'support', subject: copy.subject, html });
        return true;
    } catch (error) {
        console.error('Return email failed:', error.message);
        return false;
    }
}

module.exports = { sendReturnEmail };
