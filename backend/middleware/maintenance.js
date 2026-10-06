const flags = require('../services/featureFlags');
const auth = require('./auth');
const logger = require('../config/logger');

/**
 * Maintenance gate for /api/v1. While the storefront is switched off (or
 * MAINTENANCE_MODE=true), every API call answers 503 MAINTENANCE except:
 *
 *  - signed-in admins who passed 2FA (not the shared demo admin), so the team
 *    can keep working and reopen the shop;
 *  - the paths below, which must keep working regardless.
 *
 * Paths are relative to the /api/v1 mount point.
 */
const ALLOWED = [
    /^\/health$/,
    /^\/features$/,                          // the storefront learns it is closed
    /^\/jobs\//,                             // scheduled jobs keep running
    /^\/cashfree\/webhook$/,                 // payment gateway callbacks
    /^\/membership\/(webhook|return)$/,
    /^\/cashfree\/order\/[^/]+\/verify$/,    // finish payments already in progress
    /^\/order\/new$/,
    /^\/wallet\/me$/,
    /^\/me$/,                                // sign-in, so admins can get in
    /^\/logout$/,
    /^\/login(\/|$)/,
    /^\/auth\/google$/,
    /^\/password\/(forgot|reset\/[^/]+)$/,
];

const RETRY_AFTER_SECONDS = 300;

const isStaff = async req => {
    try {
        const session = await auth.resolveSession(req.cookies?.token);
        return Boolean(
            session &&
            session.user.role === 'admin' &&
            session.decoded.mfaVerified &&
            !session.user.isDemo
        );
    } catch (error) {
        // Database unavailable during maintenance: treat as a customer.
        logger.warn({ err: error.message }, 'maintenance: session check failed');
        return false;
    }
};

const maintenanceGate = async (req, res, next) => {
    try {
        if (!(await flags.isMaintenanceOn())) return next();
        if (req.method === 'OPTIONS') return next();
        if (ALLOWED.some(pattern => pattern.test(req.path))) return next();
        if (await isStaff(req)) return next();

        res.set('Retry-After', String(RETRY_AFTER_SECONDS));
        res.set('Cache-Control', 'no-store');
        return res.status(503).json({
            success: false,
            code: 'MAINTENANCE',
            message: flags.offMessage('storefront'),
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = maintenanceGate;
module.exports.ALLOWED = ALLOWED;
