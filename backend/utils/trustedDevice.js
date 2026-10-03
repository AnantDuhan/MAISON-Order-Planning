/**
 * "Don't ask for a 2FA code on this device."
 *
 * When a user ticks the box while entering their code, the browser gets an
 * httpOnly cookie holding a random device secret; the server stores only its
 * SHA-256 hash on the user. On later logins from that browser the first
 * factor (password, Google, email code, ...) is still required, but the TOTP
 * step is skipped while the device is trusted.
 *
 * A trusted device stops working when:
 *   - it expires (MFA_TRUST_DAYS, default 30)
 *   - the user revokes it, or all devices, from their security settings
 *   - the password changes, or 2FA is disabled / set up again
 */
const crypto = require('crypto');
const User = require('../models/user');
const generateId = require('./generateId');

const COOKIE = 'mfa_trust';
const MAX_DEVICES = 10;
const trustDays = () => Math.min(Math.max(Number(process.env.MFA_TRUST_DAYS) || 30, 1), 90);

const hash = secret => crypto.createHash('sha256').update(secret).digest('hex');

const readDevices = async userId => {
    const user = await User.findById(userId).select('+twoFactorAuth.trustedDevices').lean();
    return user?.twoFactorAuth?.trustedDevices || [];
};

// Read, change, write the whole (small, capped) list. Plain $set keeps this
// portable across MongoDB-compatible databases.
const writeDevices = async (userId, change) => {
    const next = change(await readDevices(userId));
    await User.updateOne({ _id: userId }, { $set: { 'twoFactorAuth.trustedDevices': next } });
    return next;
};

const cookieOptions = maxAgeMs => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    ...(maxAgeMs !== undefined && { maxAge: maxAgeMs }),
});

/** "Chrome on Windows"-style label from the User-Agent, for the device list. */
const describeDevice = (userAgent = '') => {
    const ua = String(userAgent);
    const browser = /Edg\//.test(ua) ? 'Edge'
        : /OPR\//.test(ua) ? 'Opera'
            : /Chrome\//.test(ua) ? 'Chrome'
                : /Firefox\//.test(ua) ? 'Firefox'
                    : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Windows/.test(ua) ? 'Windows'
        : /Android/.test(ua) ? 'Android'
            : /(iPhone|iPad|iOS)/.test(ua) ? 'iOS'
                : /Mac OS X/.test(ua) ? 'macOS'
                    : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
    return `${browser} on ${os}`;
};

/** Remember this browser for the user (call after a correct TOTP code). */
const trustThisDevice = async (user, req, res) => {
    const id = generateId();
    const secret = crypto.randomBytes(32).toString('base64url');
    const now = new Date();
    const days = trustDays();
    const device = {
        _id: id,
        tokenHash: hash(secret),
        label: describeDevice(req.get?.('user-agent')),
        createdAt: now,
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + days * 24 * 3600 * 1000),
    };

    // Add the new device, drop expired ones, keep the most recent MAX_DEVICES.
    await writeDevices(user._id, devices => [device, ...devices.filter(d => new Date(d.expiresAt) > now)]
        .slice(0, MAX_DEVICES));

    res.cookie(COOKIE, `${user._id}.${id}.${secret}`, cookieOptions(days * 24 * 3600 * 1000));
    return device;
};

const parseCookie = req => {
    const raw = req.cookies?.[COOKIE];
    if (typeof raw !== 'string') return null;
    const [userId, deviceId, secret] = raw.split('.');
    if (!userId || !deviceId || !secret) return null;
    return { userId, deviceId, secret };
};

/**
 * Is this request coming from a device the user trusted for 2FA?
 * Updates lastUsedAt when it is.
 */
const isTrustedDevice = async (user, req) => {
    const parsed = parseCookie(req);
    if (!parsed || parsed.userId !== String(user._id)) return false;

    const fresh = await User.findById(user._id)
        .select('+twoFactorAuth.trustedDevices +passwordChangedAt')
        .lean();
    if (!fresh?.twoFactorAuth?.enabled) return false;

    const device = (fresh.twoFactorAuth.trustedDevices || []).find(d => d._id === parsed.deviceId);
    if (!device || !device.tokenHash) return false;
    if (new Date(device.expiresAt) <= new Date()) return false;
    // Trust granted before the last password change doesn't carry over.
    if (fresh.passwordChangedAt && new Date(device.createdAt) < new Date(fresh.passwordChangedAt)) return false;

    const expected = Buffer.from(device.tokenHash, 'hex');
    const given = Buffer.from(hash(parsed.secret), 'hex');
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;

    await writeDevices(user._id, devices => devices.map(d =>
        (d._id === parsed.deviceId ? { ...d, lastUsedAt: new Date() } : d))).catch(() => {});
    return true;
};

/** Devices for the security settings page (no secrets). */
const listTrustedDevices = async (userId, req) => {
    const user = await User.findById(userId).select('+twoFactorAuth.trustedDevices').lean();
    const current = parseCookie(req);
    const now = new Date();
    return (user?.twoFactorAuth?.trustedDevices || [])
        .filter(d => new Date(d.expiresAt) > now)
        .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
        .map(d => ({
            _id: d._id,
            label: d.label,
            createdAt: d.createdAt,
            lastUsedAt: d.lastUsedAt,
            expiresAt: d.expiresAt,
            current: Boolean(current && current.userId === String(userId) && current.deviceId === d._id),
        }));
};

const revokeTrustedDevice = async (userId, deviceId, req, res) => {
    await writeDevices(userId, devices => devices.filter(d => d._id !== String(deviceId)));
    const current = parseCookie(req);
    if (current?.deviceId === String(deviceId)) res.clearCookie(COOKIE, cookieOptions());
};

const revokeAllTrustedDevices = async (userId, res) => {
    await User.updateOne({ _id: userId }, { $set: { 'twoFactorAuth.trustedDevices': [] } });
    if (res) res.clearCookie(COOKIE, cookieOptions());
};

module.exports = {
    COOKIE,
    trustDays,
    describeDevice,
    trustThisDevice,
    isTrustedDevice,
    listTrustedDevices,
    revokeTrustedDevice,
    revokeAllTrustedDevices,
};
