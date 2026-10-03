const jwt = require('jsonwebtoken');
const { isTrustedDevice } = require('./trustedDevice');

/**
 * One place that decides how a successful sign-in ends. Every login method
 * (password, Google, email code, magic link, phone OTP, passkey) funnels
 * through here so 2FA, admin enrollment and cookie settings stay identical.
 */

const HOUR = 60 * 60 * 1000;

/**
 * "Remember me" on the sign-in form. Sent as `rememberMe` in the request body;
 * anything other than an explicit `false` means remember (magic links and
 * older clients don't send it).
 */
const wantsToBeRemembered = req => req?.body?.rememberMe !== false;

const createTwoFactorPendingToken = (user, enrollmentRequired = false, remember = true) =>
    jwt.sign(
        // The remember choice rides along so the code step can honour it.
        { id: user._id, twoFactorPending: true, enrollmentRequired, remember },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '5m' }
    );

/**
 * Session length:
 *                 remember me                not remembered
 *   customers     90 days, survives restart  ends when the browser closes (max 12h)
 *   admins        12 hours, survives restart ends when the browser closes (max 12h)
 * Admin sessions are capped at 12h either way.
 */
const sessionPolicy = (user, remember) => {
    const isAdmin = user.role === 'admin';
    const lifetimeMs = isAdmin || !remember ? 12 * HOUR : 90 * 24 * HOUR;
    return { lifetimeMs, persistent: Boolean(remember) };
};

const issueSession = (user, res, statusCode = 200, mfaVerified = false, { remember = true } = {}) => {
    const { lifetimeMs, persistent } = sessionPolicy(user, remember);
    const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email, avatar: user.avatar, isDemo: user.isDemo, mfaVerified },
        process.env.JWT_SECRET_KEY,
        { expiresIn: Math.floor(lifetimeMs / 1000) }
    );
    const options = {
        // No expiry = a browser-session cookie, removed when the browser closes.
        ...(persistent && { expires: new Date(Date.now() + lifetimeMs) }),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    };
    return res.status(statusCode).cookie('token', token, options).json({ success: true, user });
};

/**
 * First factor passed. Either issue the session, or hand back a short-lived
 * token for the existing /login/2fa step (TOTP) when the account requires it.
 * `strongFactor` = the first factor already counts as MFA (a user-verified
 * passkey), so TOTP is skipped and admin sessions are marked mfaVerified.
 * `user` must have twoFactorAuth.enabled selected. Pass `req` so a device the
 * user chose to trust ("don't ask again on this device") can skip TOTP.
 */
const completeLogin = async (user, res, { strongFactor = false, req } = {}) => {
    const remember = wantsToBeRemembered(req);
    if (strongFactor) return issueSession(user, res, 200, true, { remember });

    if (!user.isDemo) {
        const enrollmentRequired = user.role === 'admin' && !user.twoFactorAuth?.enabled;
        if (user.twoFactorAuth?.enabled && req && await isTrustedDevice(user, req)) {
            return issueSession(user, res, 200, true, { remember });
        }
        if (user.twoFactorAuth?.enabled || enrollmentRequired) {
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                enrollmentRequired,
                twoFactorToken: createTwoFactorPendingToken(user, enrollmentRequired, remember),
            });
        }
    }
    return issueSession(user, res, 200, false, { remember });
};

module.exports = { createTwoFactorPendingToken, issueSession, completeLogin, sessionPolicy, wantsToBeRemembered };
