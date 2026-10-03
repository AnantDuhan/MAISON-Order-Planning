const AuditLog = require('../models/auditLog');

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/v1/admin/audit-log
//   ?entityType=order&entityId=abc&action=order.status&actor=<id or email>
//   &q=<text in summary>&from=2026-10-01&to=2026-10-31&before=<cursor>&limit=50
// Newest first; page with `before` = nextCursor from the previous page.
exports.getAuditLog = async (req, res) => {
    const { entityType, entityId, action, actor, q, from, to, before } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

    const filter = {};
    // Demo admins only ever see what demo admins did.
    if (req.user?.isDemo) filter.isDemo = true;
    if (entityType) filter['entity.type'] = String(entityType);
    if (entityId) filter['entity.id'] = String(entityId);
    if (action) filter.action = String(action);
    if (actor) {
        const a = String(actor);
        filter.$or = [{ 'actor.id': a }, { 'actor.email': new RegExp(`^${escapeRegex(a)}$`, 'i') }];
    }
    if (q) filter.summary = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');

    const at = {};
    if (from && !Number.isNaN(Date.parse(from))) at.$gte = new Date(from);
    if (to && !Number.isNaN(Date.parse(to))) at.$lte = new Date(to);
    if (before && !Number.isNaN(Date.parse(before))) at.$lt = new Date(before);
    if (Object.keys(at).length) filter.at = at;

    const entries = await AuditLog.find(filter)
        .sort({ at: -1 })
        .limit(limit + 1)
        .select('-request.files')
        .lean();

    const hasMore = entries.length > limit;
    const page = entries.slice(0, limit);
    res.status(200).json({
        success: true,
        entries: page,
        nextCursor: hasMore ? page[page.length - 1].at : null,
    });
};

// GET /api/v1/admin/audit-log/actions — distinct action names for the filter.
exports.getAuditActions = async (req, res) => {
    const actions = await AuditLog.distinct('action', req.user?.isDemo ? { isDemo: true } : {});
    res.status(200).json({ success: true, actions: actions.sort() });
};
