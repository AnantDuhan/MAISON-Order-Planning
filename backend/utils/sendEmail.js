const nodemailer = require('nodemailer');

/**
 * A single pooled SMTP transport for the whole process.
 *
 * The previous implementation called nodemailer.createTransport() on every
 * send, so each email paid for a fresh TCP connect, TLS handshake and SMTP
 * AUTH round-trip — several seconds each time against a remote SMTP host.
 * Nodemailer's pool keeps sockets open and reuses them, so only the first
 * message pays that cost.
 */
let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    if (!process.env.SMTP_HOST || !process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
        throw new Error('SMTP email configuration is missing');
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },

        // Connection reuse — this is what removes the per-message handshake.
        pool: true,
        maxConnections: 5,
        maxMessages: 100,

        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });

    transporter.on('error', err => {
        console.error('SMTP pool error:', err.message);
    });

    return transporter;
};

const buildMailOptions = options => ({
    from: process.env.SMTP_MAIL,
    to: options.email,
    subject: options.subject,
    html: options.html,
    headers: {
        'Content-Type': 'text/html',
        charset: 'UTF-8',
    },
});

/**
 * Send and wait for the SMTP result.
 * Use when the caller genuinely needs delivery confirmed before responding.
 */
const sendEmail = async options => {
    await getTransporter().sendMail(buildMailOptions(options));
};

/**
 * Hand the message to the pool and return immediately.
 *
 * Use for transactional mail on a request path (password reset, order
 * confirmation, contact form). The HTTP response no longer waits on the SMTP
 * conversation, which is the difference between a ~30s request and a ~50ms
 * one. Failures are logged rather than surfaced to the caller, so only use
 * this where the user does not need delivery confirmed synchronously.
 */
const sendEmailInBackground = options => {
    setImmediate(async () => {
        try {
            await getTransporter().sendMail(buildMailOptions(options));
        } catch (error) {
            console.error(
                `Background email failed (to: ${options.email}, subject: "${options.subject}"):`,
                error.message
            );
        }
    });
};

/**
 * Open the pool at boot so the very first user-facing email is fast too.
 * Safe to call without SMTP configured — it just logs and moves on.
 */
const warmUpEmailTransport = async () => {
    try {
        await getTransporter().verify();
        console.log('✅ SMTP transport ready');
    } catch (error) {
        console.warn('⚠️  SMTP transport not ready:', error.message);
    }
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.sendEmailInBackground = sendEmailInBackground;
module.exports.warmUpEmailTransport = warmUpEmailTransport;
