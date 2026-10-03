const jwt = require('jsonwebtoken');
const { isTrustedDevice } = require('./trustedDevice');

/**
 * One place that decides how a successful sign-in ends. Every login method
 * (password, Google, email code, magic link, phone OTP, passkey) funnels
 * through here so 2FA, admin enrollment and cookie settings stay identical.
 */

const createTwoFactorPendingToken = (user, enrollmentRequired = false) =>
    jwt.sign(
        { id: user._id, twoFactorPending: true, enrollmentRequired },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '5m' }
    );

const issueSession = (user, res, statusCode = 200, mfaVerified = false) => {
    const isAdmin = user.role === 'admin';
    const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email, avatar: user.avatar, mfaVerified },
        process.env.JWT_SECRET_KEY,
        { expiresIn: isAdmin ? '12h' : '90d' }
    );
    const options = {
        expires: new Date(Date.now() + (isAdmin ? 12 : 90 * 24) * 60 * 60 * 1000),
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
    if (strongFactor) return issueSession(user, res, 200, true);

    if (!user.isDemo) {
        const enrollmentRequired = user.role === 'admin' && !user.twoFactorAuth?.enabled;
        if (user.twoFactorAuth?.enabled && req && await isTrustedDevice(user, req)) {
            return issueSession(user, res, 200, true);
        }
        if (user.twoFactorAuth?.enabled || enrollmentRequired) {
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                enrollmentRequired,
                twoFactorToken: createTwoFactorPendingToken(user, enrollmentRequired),
            });
        }
    }
    return issueSession(user, res);
};

module.exports = { createTwoFactorPendingToken, issueSession, completeLogin };
