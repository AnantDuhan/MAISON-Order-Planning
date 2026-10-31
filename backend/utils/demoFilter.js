/**
 * Filter for the real admin: everything except the records the demo seed
 * script creates (isDemo: true). The demo admin sees only demo data; the real
 * admin must never count, list, ship or refund it.
 *
 * A fresh object each call, because Mongoose may hold on to filter objects.
 */
const realOnly = (extra = {}) => ({ ...extra, isDemo: { $ne: true } });

module.exports = { realOnly };
