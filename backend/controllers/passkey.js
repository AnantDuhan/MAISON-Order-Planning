const jwt = require('jsonwebtoken');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { isoBase64URL, isoUint8Array } = require('@simplewebauthn/server/helpers');

const User = require('../models/user');
const cache = require('../utils/cache');
const { completeLogin } = require('../utils/session');

/**
 * Passkeys (WebAuthn).
 *
 * RP ID must be the site's domain (e.g. maisonorderplanning.in) and the
 * origin must match the page the browser is on — passkeys only work on the
 * domain they were created for.
 *   WEBAUTHN_RP_ID    default: hostname of the first origin
 *   WEBAUTHN_ORIGINS  comma-separated; default: FRONTEND_URL
 *
 * Challenges are carried in a signed 5-minute token (no server session) and
 * made single-use with cache.claimOnce.
 */

const MAX_PASSKEYS = 10;

const config = () => {
    const origins = (process.env.WEBAUTHN_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map(o => o.trim().replace(/\/$/, ''))
        .filter(Boolean);
    const rpID = process.env.WEBAUTHN_RP_ID || new URL(origins[0]).hostname;
    return { origins, rpID, rpName: 'Maison' };
};

const signChallenge = (challenge, purpose, uid = null) =>
    jwt.sign({ ch: challenge, purpose, uid }, process.env.JWT_SECRET_KEY, { expiresIn: '5m' });

// Returns the challenge, or null if the token is bad, expired or reused.
const openChallenge = async (token, purpose, uid = null) => {
    let decoded;
    try {
        decoded = jwt.verify(String(token || ''), process.env.JWT_SECRET_KEY);
    } catch {
        return null;
    }
    if (decoded.purpose !== purpose || (uid && decoded.uid !== uid)) return null;
    const fresh = await cache.claimOnce(`webauthn:ch:${decoded.ch}`, 600);
    return fresh ? decoded.ch : null;
};

const summary = pk => ({
    id: pk._id,
    name: pk.name,
    createdAt: pk.createdAt,
    lastUsedAt: pk.lastUsedAt || null,
    backedUp: Boolean(pk.backedUp),
});

// A friendly default name from the browser's user agent.
const guessName = ua => {
    const s = String(ua || '');
    const os = /iPhone|iPad/.test(s) ? 'iPhone / iPad' : /Android/.test(s) ? 'Android' : /Mac OS X/.test(s) ? 'Mac' : /Windows/.test(s) ? 'Windows' : /Linux/.test(s) ? 'Linux' : 'This device';
    const browser = /Edg\//.test(s) ? 'Edge' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : '';
    return browser ? `${os} · ${browser}` : os;
};

// ---------------------------------------------------------------------------
// Manage passkeys (signed in)
// ---------------------------------------------------------------------------

// GET /api/v1/passkeys
exports.listPasskeys = async (req, res) => {
    const user = await User.findById(req.user._id).select('+passkeys');
    res.status(200).json({ success: true, passkeys: (user?.passkeys || []).map(summary) });
};

// POST /api/v1/passkeys/register/options
exports.passkeyRegisterOptions = async (req, res) => {
    try {
        const { rpID, rpName } = config();
        const user = await User.findById(req.user._id).select('+passkeys');
        if (user.passkeys.length >= MAX_PASSKEYS) {
            return res.status(400).json({ success: false, message: `You can save up to ${MAX_PASSKEYS} passkeys.` });
        }

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userName: user.email,
            userDisplayName: user.name,
            userID: isoUint8Array.fromUTF8String(String(user._id)),
            attestationType: 'none',
            excludeCredentials: user.passkeys.map(pk => ({ id: pk._id, transports: pk.transports })),
            authenticatorSelection: {
                residentKey: 'required', // discoverable → "Sign in with a passkey" needs no email
                userVerification: 'preferred',
            },
        });

        res.status(200).json({
            success: true,
            options,
            challengeToken: signChallenge(options.challenge, 'register', String(user._id)),
        });
    } catch (error) {
        console.error('🔑 Passkey register options error:', error);
        res.status(500).json({ success: false, message: 'Could not start passkey setup.' });
    }
};

// POST /api/v1/passkeys/register/verify  { response, challengeToken, name? }
exports.passkeyRegisterVerify = async (req, res) => {
    try {
        const { origins, rpID } = config();
        const uid = String(req.user._id);
        const expectedChallenge = await openChallenge(req.body?.challengeToken, 'register', uid);
        if (!expectedChallenge) {
            return res.status(400).json({ success: false, message: 'Passkey setup timed out. Please try again.' });
        }

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: req.body?.response,
                expectedChallenge,
                expectedOrigin: origins,
                expectedRPID: rpID,
                requireUserVerification: false,
            });
        } catch (err) {
            return res.status(400).json({ success: false, message: `Passkey could not be verified: ${err.message}` });
        }
        if (!verification.verified) {
            return res.status(400).json({ success: false, message: 'Passkey could not be verified.' });
        }

        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
        const name =
            String(req.body?.name || '').trim().slice(0, 60) || guessName(req.get('user-agent'));

        await User.updateOne(
            { _id: uid, 'passkeys._id': { $ne: credential.id } },
            {
                $push: {
                    passkeys: {
                        _id: credential.id,
                        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
                        counter: credential.counter,
                        transports: credential.transports || req.body?.response?.response?.transports || [],
                        deviceType: credentialDeviceType,
                        backedUp: credentialBackedUp,
                        name,
                    },
                },
            }
        );

        const user = await User.findById(uid).select('+passkeys');
        res.status(201).json({ success: true, message: 'Passkey added.', passkeys: user.passkeys.map(summary) });
    } catch (error) {
        console.error('🔑 Passkey register verify error:', error);
        res.status(500).json({ success: false, message: 'Could not save the passkey.' });
    }
};

// DELETE /api/v1/passkeys/:id
exports.deletePasskey = async (req, res) => {
    try {
        await User.updateOne({ _id: req.user._id }, { $pull: { passkeys: { _id: req.params.id } } });
        const user = await User.findById(req.user._id).select('+passkeys');
        res.status(200).json({ success: true, message: 'Passkey removed.', passkeys: user.passkeys.map(summary) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not remove the passkey.' });
    }
};

// ---------------------------------------------------------------------------
// Sign in with a passkey (signed out)
// ---------------------------------------------------------------------------

// POST /api/v1/login/passkey/options
exports.passkeyLoginOptions = async (req, res) => {
    try {
        const { rpID } = config();
        // No allowCredentials: the browser offers any passkey saved for this site.
        const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
        res.status(200).json({ success: true, options, challengeToken: signChallenge(options.challenge, 'login') });
    } catch (error) {
        console.error('🔑 Passkey login options error:', error);
        res.status(500).json({ success: false, message: 'Could not start passkey sign-in.' });
    }
};

// POST /api/v1/login/passkey/verify  { response, challengeToken }
exports.passkeyLoginVerify = async (req, res) => {
    try {
        const { origins, rpID } = config();
        const response = req.body?.response;
        const expectedChallenge = await openChallenge(req.body?.challengeToken, 'login');
        if (!expectedChallenge || !response?.id) {
            return res.status(400).json({ success: false, message: 'Passkey sign-in timed out. Please try again.' });
        }

        const user = await User.findOne({ 'passkeys._id': response.id }).select('+passkeys +twoFactorAuth.enabled');
        const passkey = user?.passkeys.find(pk => pk._id === response.id);
        if (!passkey) {
            return res.status(401).json({
                success: false,
                message: "This passkey isn't linked to a Maison account. It may have been removed — sign in another way.",
            });
        }

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response,
                expectedChallenge,
                expectedOrigin: origins,
                expectedRPID: rpID,
                credential: {
                    id: passkey._id,
                    publicKey: isoBase64URL.toBuffer(passkey.publicKey),
                    counter: passkey.counter,
                    transports: passkey.transports,
                },
                requireUserVerification: false,
            });
        } catch (err) {
            return res.status(401).json({ success: false, message: `Passkey could not be verified: ${err.message}` });
        }
        if (!verification.verified) {
            return res.status(401).json({ success: false, message: 'Passkey could not be verified.' });
        }

        await User.updateOne(
            { _id: user._id, 'passkeys._id': passkey._id },
            {
                $set: {
                    'passkeys.$.counter': verification.authenticationInfo.newCounter,
                    'passkeys.$.lastUsedAt': new Date(),
                },
            }
        );

        // A passkey unlocked with Face ID / fingerprint / PIN is already
        // two factors (device + biometric/PIN), so the TOTP step is skipped.
        return completeLogin(user, res, { strongFactor: verification.authenticationInfo.userVerified });
    } catch (error) {
        console.error('🔑 Passkey login verify error:', error);
        res.status(500).json({ success: false, message: 'Passkey sign-in failed. Please try again.' });
    }
};
