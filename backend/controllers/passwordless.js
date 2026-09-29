const crypto = require('crypto');
const path = require('path');
const ejs = require('ejs');
const validator = require('validator');

const User = require('../models/user');
const LoginCode = require('../models/loginCode');
const generateId = require('../utils/generateId');
const { sendEmailInBackground } = require('../utils/sendEmail');
const { sendOtpSms, isSmsConfigured } = require('../utils/sendSms');
const { toNational, toInternational, storedCandidates } = require('../utils/phone');
const { completeLogin } = require('../utils/session');

/**
 * Passwordless sign-in for EXISTING accounts:
 *   - email: 6-digit code + one-click magic link in the same email
 *   - phone: 6-digit code by SMS to the account's WhatsApp number
 *
 * Security notes
 *   - Codes/tokens are stored as HMACs (keyed with JWT_SECRET_KEY), never raw.
 *   - 10-minute expiry, 5 wrong attempts max, single use (atomic delete).
 *   - "Request" responses are identical whether or not the account exists,
 *     so the form can't be used to discover who is registered.
 *   - Demo accounts are excluded: they are shared and use the demo button.
 *   - Accounts with 2FA still get the TOTP step (utils/session.completeLogin).
 */

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

const hmac = value =>
    crypto.createHmac('sha256', process.env.JWT_SECRET_KEY).update(String(value)).digest('hex');

const sameHash = (a, b) =>
    a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const normalizeEmail = email => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const genericSent = (res, channel) =>
    res.status(200).json({
        success: true,
        message:
            channel === 'email'
                ? 'If an account exists for that email, a sign-in code is on its way.'
                : 'If an account uses that number, a sign-in code is on its way by SMS.',
        expiresInMinutes: CODE_TTL_MIN,
    });

// True if a code was sent to this target within the cooldown window.
const inCooldown = async (channel, target) => {
    const recent = await LoginCode.findOne({ channel, target })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();
    return recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS;
};

const createCode = async ({ channel, target, userId, withMagicLink = false }) => {
    // A new code replaces any earlier one for the same target.
    await LoginCode.deleteMany({ channel, target });

    const code = newCode();
    const magicToken = withMagicLink ? crypto.randomBytes(32).toString('hex') : null;

    await LoginCode.create({
        _id: generateId(),
        channel,
        target,
        user: userId,
        codeHash: hmac(`${channel}:${target}:${code}`),
        magicTokenHash: magicToken ? hmac(`magic:${magicToken}`) : null,
        expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
    });

    return { code, magicToken };
};

// Checks a typed code. Returns { user } or { status, message }.
const consumeCode = async (channel, target, code) => {
    const record = await LoginCode.findOne({ channel, target, expiresAt: { $gt: new Date() } }).sort({
        createdAt: -1,
    });

    if (!record) {
        return { status: 400, message: 'That code has expired. Please request a new one.' };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
        await LoginCode.deleteOne({ _id: record._id });
        return { status: 429, message: 'Too many incorrect attempts. Please request a new code.' };
    }

    const typed = String(code || '').replace(/\D/g, '');
    if (typed.length !== 6 || !sameHash(hmac(`${channel}:${target}:${typed}`), record.codeHash)) {
        const updated = await LoginCode.findOneAndUpdate(
            { _id: record._id },
            { $inc: { attempts: 1 } },
            { new: true }
        );
        const left = Math.max(0, MAX_ATTEMPTS - (updated?.attempts ?? MAX_ATTEMPTS));
        return {
            status: 400,
            message: left ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Incorrect code. Please request a new one.',
        };
    }

    // Atomic single use: only the request that deletes it wins.
    const claimed = await LoginCode.findOneAndDelete({ _id: record._id });
    if (!claimed) return { status: 400, message: 'That code was already used. Please request a new one.' };

    const user = await User.findById(record.user).select('+twoFactorAuth.enabled');
    if (!user || user.isDemo) return { status: 400, message: 'Account not found.' };
    return { user };
};

// ---------------------------------------------------------------------------
// Email code + magic link
// ---------------------------------------------------------------------------

// POST /api/v1/login/email-code  { email }
exports.requestEmailCode = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        const user = await User.findOne({ email, isDemo: { $ne: true } }).select('_id name email');
        if (!user || (await inCooldown('email', email))) return genericSent(res, 'email');

        const { code, magicToken } = await createCode({
            channel: 'email',
            target: email,
            userId: user._id,
            withMagicLink: true,
        });

        const magicLink = `${process.env.FRONTEND_URL}/login/magic/${magicToken}`;
        const html = await ejs.renderFile(path.join(__dirname, '../mails/login-code.ejs'), {
            name: user.name,
            code,
            magicLink,
            minutes: CODE_TTL_MIN,
        });

        sendEmailInBackground({ email: user.email, subject: `${code} is your Maison sign-in code`, html });
        return genericSent(res, 'email');
    } catch (error) {
        console.error('✉️ Email code request error:', error);
        return res.status(500).json({ success: false, message: 'Could not send a code. Please try again.' });
    }
};

// POST /api/v1/login/email-code/verify  { email, code }
exports.verifyEmailCode = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const result = await consumeCode('email', email, req.body?.code);
        if (!result.user) return res.status(result.status).json({ success: false, message: result.message });

        // Receiving the code proves the inbox is theirs.
        if (!result.user.isEmailVerified) {
            result.user.isEmailVerified = true;
            await User.updateOne({ _id: result.user._id }, { isEmailVerified: true });
        }
        await LoginCode.deleteMany({ channel: 'email', target: email });
        return completeLogin(result.user, res);
    } catch (error) {
        console.error('✉️ Email code verify error:', error);
        return res.status(500).json({ success: false, message: 'Sign-in failed. Please try again.' });
    }
};

// POST /api/v1/login/magic  { token }
// A POST from the /login/magic/:token page — not a GET on the email link —
// so email security scanners that pre-open links can't burn the token.
exports.verifyMagicLink = async (req, res) => {
    try {
        const token = String(req.body?.token || '');
        if (!/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ success: false, message: 'This sign-in link is invalid.' });
        }

        const record = await LoginCode.findOneAndDelete({
            magicTokenHash: hmac(`magic:${token}`),
            expiresAt: { $gt: new Date() },
        });
        if (!record) {
            return res.status(400).json({
                success: false,
                message: 'This sign-in link has expired or was already used. Please request a new one.',
            });
        }

        const user = await User.findById(record.user).select('+twoFactorAuth.enabled');
        if (!user || user.isDemo) return res.status(400).json({ success: false, message: 'Account not found.' });

        if (!user.isEmailVerified) {
            user.isEmailVerified = true;
            await User.updateOne({ _id: user._id }, { isEmailVerified: true });
        }
        await LoginCode.deleteMany({ channel: 'email', target: record.target });
        return completeLogin(user, res);
    } catch (error) {
        console.error('✉️ Magic link error:', error);
        return res.status(500).json({ success: false, message: 'Sign-in failed. Please try again.' });
    }
};

// ---------------------------------------------------------------------------
// Phone OTP (SMS)
// ---------------------------------------------------------------------------

// GET /api/v1/login/methods — lets the UI hide phone login when SMS is off.
exports.loginMethods = (req, res) =>
    res.status(200).json({ success: true, methods: { password: true, emailCode: true, phone: isSmsConfigured(), passkey: true } });

// POST /api/v1/login/phone-otp  { phone }
exports.requestPhoneOtp = async (req, res) => {
    try {
        if (!isSmsConfigured()) {
            return res.status(503).json({ success: false, message: 'Phone sign-in is not available right now.' });
        }

        const national = toNational(req.body?.phone);
        if (!national) {
            return res.status(400).json({ success: false, message: 'Please enter a valid mobile number.' });
        }

        const user = await User.findOne({
            whatsappNumber: { $in: storedCandidates(national) },
            isDemo: { $ne: true },
        }).select('_id');
        if (!user || (await inCooldown('phone', national))) return genericSent(res, 'phone');

        const { code } = await createCode({ channel: 'phone', target: national, userId: user._id });

        try {
            await sendOtpSms(toInternational(national), code);
        } catch (err) {
            console.error('📱 SMS send failed:', err.message);
            await LoginCode.deleteMany({ channel: 'phone', target: national });
            return res.status(502).json({ success: false, message: "We couldn't send the SMS. Please try email instead." });
        }

        return genericSent(res, 'phone');
    } catch (error) {
        console.error('📱 Phone OTP request error:', error);
        return res.status(500).json({ success: false, message: 'Could not send a code. Please try again.' });
    }
};

// POST /api/v1/login/phone-otp/verify  { phone, code }
exports.verifyPhoneOtp = async (req, res) => {
    try {
        const national = toNational(req.body?.phone);
        if (!national) {
            return res.status(400).json({ success: false, message: 'Please enter a valid mobile number.' });
        }

        const result = await consumeCode('phone', national, req.body?.code);
        if (!result.user) return res.status(result.status).json({ success: false, message: result.message });

        if (!result.user.isPhoneVerified) {
            result.user.isPhoneVerified = true;
            await User.updateOne({ _id: result.user._id }, { isPhoneVerified: true });
        }
        await LoginCode.deleteMany({ channel: 'phone', target: national });
        return completeLogin(result.user, res);
    } catch (error) {
        console.error('📱 Phone OTP verify error:', error);
        return res.status(500).json({ success: false, message: 'Sign-in failed. Please try again.' });
    }
};
