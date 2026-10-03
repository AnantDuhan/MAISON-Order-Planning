const User = require('../models/user');
const wallet = require('../services/walletService');

// GET /api/v1/wallet/me
exports.myWallet = async (req, res) => {
    const statement = await wallet.statement(req.user._id, { limit: 50 });
    res.status(200).json({ success: true, ...statement });
};

// GET /api/v1/admin/wallet/:userId
exports.getUserWallet = async (req, res) => {
    const user = await User.findById(req.params.userId).select('name email isDemo').lean();
    if (!user || (req.user?.isDemo && !user.isDemo)) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const statement = await wallet.statement(user._id, { limit: 100 });
    res.status(200).json({ success: true, user: { _id: user._id, name: user.name, email: user.email }, ...statement });
};

// POST /api/v1/admin/wallet/:userId/adjust   { amount: rupees (±), note, requestId? }
// Goodwill credits and corrections. Debits can't take the balance below zero.
exports.adjustUserWallet = async (req, res) => {
    const amount = Number(req.body?.amount);
    const note = String(req.body?.note || '').trim();
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) {
        return res.status(400).json({ success: false, message: 'Amount must be a non-zero number up to ₹1,00,000' });
    }
    if (note.length < 3) {
        return res.status(400).json({ success: false, message: 'A note explaining the adjustment is required' });
    }

    const user = await User.findById(req.params.userId).select('name email').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // The client sends a requestId per submit so a double click can't apply twice.
    const requestId = String(req.body?.requestId || '').slice(0, 64) || `${Date.now()}`;
    const options = {
        type: 'adjustment',
        reference: { type: 'admin', id: String(req.user._id) },
        note: note.slice(0, 300),
        idempotencyKey: `adjust:${user._id}:${requestId}`,
        createdBy: { id: String(req.user._id), name: req.user.name },
    };

    const before = wallet.toRupees(await wallet.balanceOf(user._id));
    try {
        const paise = wallet.toPaise(Math.abs(amount));
        const result = amount > 0
            ? await wallet.credit(user._id, paise, options)
            : await wallet.debit(user._id, paise, options);
        const after = wallet.toRupees(await wallet.balanceOf(user._id));

        res.locals.audit = {
            entity: { type: 'user', id: String(user._id) },
            before: { storeCredit: before },
            after: { storeCredit: after },
            summary: `Store credit ${amount > 0 ? '+' : '−'}₹${Math.abs(amount)} for ${user.email}: ${note}`,
        };
        res.status(200).json({ success: true, applied: result.applied, balance: after });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
