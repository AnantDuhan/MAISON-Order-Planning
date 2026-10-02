const Cart = require('../models/cart');
const generateId = require('../utils/generateId');

// GET /cart — this user's synced cart (empty items if none saved yet)
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });

        res.status(200).json({
            success: true,
            items: cart ? cart.items : [],
            updatedAt: cart ? cart.updatedAt : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart',
            error: error.message
        });
    }
};

// PUT /cart — replaces this user's whole cart with the given items.
// The mobile app treats this as a full sync point (debounced after local
// mutations, and merged-then-pushed once after login) rather than
// per-item endpoints, since a cart is small and this keeps sync simple.
exports.syncCart = async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'items must be an array'
            });
        }

        const cart = await Cart.findOneAndUpdate(
            { user: req.user._id },
            {
                $set: {
                    items,
                    updatedAt: new Date()
                },
                $setOnInsert: { _id: generateId(), user: req.user._id }
            },
            { upsert: true, returnDocument: 'after' }
        );

        res.status(200).json({
            success: true,
            items: cart.items,
            updatedAt: cart.updatedAt
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to sync cart',
            error: error.message
        });
    }
};

// ---- Abandoned-cart links (public, signed) ------------------------------------
const cartRecovery = require('../services/cartRecoveryService');

const page = (title, body) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#F7F4EF;font-family:Helvetica,Arial,sans-serif;color:#1A1816;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
h1{font-family:Georgia,serif;font-weight:500;font-size:28px;margin:0 0 12px}p{color:#4A453F;font-size:15px;line-height:1.7;margin:0 0 20px}a{color:#A07C4B;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase}</style></head>
<body><div style="max-width:420px;padding:24px">${body}</div></body></html>`;

// GET /api/v1/cart/recover/:token  -> records the click, then the cart page
exports.recoverCart = async (req, res) => {
    const target = await cartRecovery.recordClick(req.params.token);
    res.redirect(302, target);
};

// GET /api/v1/cart/reminders/unsubscribe/:token
exports.unsubscribeCartReminders = async (req, res) => {
    const ok = await cartRecovery.optOut(req.params.token);
    const home = (process.env.FRONTEND_URL || '/').replace(/\/+$/, '') || '/';
    res.status(ok ? 200 : 400).type('html').send(ok
        ? page('Unsubscribed', `<h1>Done</h1><p>You won't get reminders about items left in your bag. Order and account emails are not affected.</p><a href="${home}">Back to MAISON</a>`)
        : page('Link not valid', `<h1>This link isn't valid</h1><p>It may have been copied incompletely.</p><a href="${home}">Back to MAISON</a>`));
};

// GET /api/v1/admin/cart-recovery?days=30
exports.cartRecoveryStats = async (req, res) => {
    if (req.user?.isDemo) {
        return res.status(200).json({ success: true, demoMode: true, stats: { days: 30, emailed: 0, clicked: 0, recovered: 0, recoveredRevenue: 0, clickRate: 0, recoveryRate: 0, abandonedNow: 0, recent: [] } });
    }
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const stats = await cartRecovery.recoveryStats({ days });
    res.status(200).json({ success: true, stats });
};
