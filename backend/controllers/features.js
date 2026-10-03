const flags = require('../services/featureFlags');

// GET /api/v1/features — public: { key: true|false } for the storefront
exports.getFeatures = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, features: await flags.getAll() });
};

// GET /api/v1/admin/features — every switch with description and last change
exports.getAdminFeatures = async (req, res) => {
    res.status(200).json({ success: true, features: await flags.listForAdmin() });
};

// PATCH /api/v1/admin/features/:key   { enabled: boolean }
exports.updateFeature = async (req, res) => {
    if (typeof req.body?.enabled !== 'boolean') {
        return res.status(400).json({ success: false, message: '"enabled" must be true or false' });
    }
    try {
        const { before, after } = await flags.setEnabled(req.params.key, req.body.enabled, {
            id: String(req.user._id),
            name: req.user.name,
        });
        res.locals.audit = {
            entity: { type: 'feature', id: req.params.key },
            before: { enabled: before },
            after: { enabled: after },
            summary: `${after ? 'Enabled' : 'Disabled'} feature "${req.params.key}"`,
        };
        const feature = (await flags.listForAdmin()).find(f => f.key === req.params.key);
        res.status(200).json({ success: true, feature });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
