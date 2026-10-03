/**
 * Store credit wallet.
 *
 * Ledger first: every movement is an immutable WalletEntry with an
 * idempotency key, so retries never double-credit or double-spend. The
 * Wallet.balance is a fast projection kept in step with the ledger:
 *
 *   credit: write entry (dup key => already done), then $inc balance
 *   debit:  conditional $inc (balance >= amount, so it can't go negative),
 *           then write entry; on a dup key the debit is put back
 *
 * reconcile(userId) rebuilds the balance from the ledger if the two ever
 * disagree (e.g. a crash between the two writes).
 *
 * Amounts are integer paise internally; the API speaks rupees.
 */
const Wallet = require('../models/wallet');
const WalletEntry = require('../models/walletEntry');
const generateId = require('../utils/generateId');

const toPaise = rupees => Math.round(Number(rupees || 0) * 100);
const toRupees = paise => Math.round(Number(paise || 0)) / 100;

class WalletError extends Error {
    constructor(message, statusCode = 409) {
        super(message);
        this.statusCode = statusCode;
    }
}

const isDuplicate = error => error?.code === 11000;

const balanceOf = async userId => {
    const wallet = await Wallet.findById(String(userId)).lean();
    return wallet?.balance || 0;
};

/**
 * Add credit. Idempotent on idempotencyKey.
 * @returns {{ entry, applied: boolean }} applied=false when the key was already used
 */
const credit = async (userId, amountPaise, { type, reference, note, idempotencyKey, createdBy } = {}) => {
    const amount = Math.round(amountPaise);
    if (!(amount > 0)) throw new WalletError('Credit amount must be positive', 400);
    if (!idempotencyKey) throw new Error('idempotencyKey is required');

    let entry;
    try {
        entry = await WalletEntry.create({
            _id: generateId(),
            user: String(userId),
            amount,
            type,
            reference,
            note,
            createdBy,
            idempotencyKey,
        });
    } catch (error) {
        if (isDuplicate(error)) {
            return { entry: await WalletEntry.findOne({ idempotencyKey }).lean(), applied: false };
        }
        throw error;
    }

    await Wallet.updateOne(
        { _id: String(userId) },
        { $inc: { balance: amount }, $set: { updatedAt: new Date() } },
        { upsert: true }
    );
    return { entry, applied: true };
};

/**
 * Spend credit. Fails (WalletError 409) rather than going below zero.
 * Idempotent on idempotencyKey.
 */
const debit = async (userId, amountPaise, { type, reference, note, idempotencyKey, createdBy } = {}) => {
    const amount = Math.round(amountPaise);
    if (!(amount > 0)) throw new WalletError('Debit amount must be positive', 400);
    if (!idempotencyKey) throw new Error('idempotencyKey is required');

    const existing = await WalletEntry.findOne({ idempotencyKey }).lean();
    if (existing) return { entry: existing, applied: false };

    const taken = await Wallet.updateOne(
        { _id: String(userId), balance: { $gte: amount } },
        { $inc: { balance: -amount }, $set: { updatedAt: new Date() } }
    );
    if (!taken.modifiedCount) {
        throw new WalletError(`Not enough store credit (available ₹${toRupees(await balanceOf(userId))})`);
    }

    try {
        const entry = await WalletEntry.create({
            _id: generateId(),
            user: String(userId),
            amount: -amount,
            type,
            reference,
            note,
            createdBy,
            idempotencyKey,
        });
        return { entry, applied: true };
    } catch (error) {
        // Lost a race with an identical request: give this debit back.
        await Wallet.updateOne({ _id: String(userId) }, { $inc: { balance: amount } });
        if (isDuplicate(error)) {
            return { entry: await WalletEntry.findOne({ idempotencyKey }).lean(), applied: false };
        }
        throw error;
    }
};

/** Balance + recent ledger lines (newest first) with running balance. */
const statement = async (userId, { limit = 50 } = {}) => {
    const [balance, entries] = await Promise.all([
        balanceOf(userId),
        WalletEntry.find({ user: String(userId) }).sort({ createdAt: -1 }).limit(limit).lean(),
    ]);
    let running = balance;
    const lines = entries.map(e => {
        const line = {
            _id: e._id,
            type: e.type,
            amount: toRupees(e.amount),
            balanceAfter: toRupees(running),
            reference: e.reference,
            note: e.note,
            createdAt: e.createdAt,
            createdBy: e.createdBy?.name,
        };
        running -= e.amount;
        return line;
    });
    return { balance: toRupees(balance), entries: lines };
};

/** Rebuild the balance from the ledger. Returns { before, after } in paise. */
const reconcile = async userId => {
    const [sum] = await WalletEntry.aggregate([
        { $match: { user: String(userId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const after = Math.max(0, sum?.total || 0);
    const before = await balanceOf(userId);
    if (before !== after) {
        await Wallet.updateOne({ _id: String(userId) }, { $set: { balance: after, updatedAt: new Date() } }, { upsert: true });
    }
    return { before, after };
};

// ---- Checkout -------------------------------------------------------------------

/** Take store credit for a checkout attempt. Returns rupees applied (0 if none). */
const applyToCheckout = async ({ userId, checkoutId, totalRupees }) => {
    const available = await balanceOf(userId);
    const apply = Math.min(available, toPaise(totalRupees));
    if (apply <= 0) return 0;
    await debit(userId, apply, {
        type: 'checkout',
        reference: { type: 'checkout', id: checkoutId },
        note: 'Used at checkout',
        idempotencyKey: `checkout:${checkoutId}`,
    });
    return toRupees(apply);
};

/** Give back credit taken for a checkout that didn't become an order. */
const reverseCheckout = async ({ userId, checkoutId, amountRupees, reason = 'Checkout not completed' }) => {
    if (!(amountRupees > 0)) return null;
    return credit(userId, toPaise(amountRupees), {
        type: 'checkout-reversal',
        reference: { type: 'checkout', id: checkoutId },
        note: reason,
        idempotencyKey: `checkout-reversal:${checkoutId}`,
    });
};

/** Late re-take when a hold (and its credit) expired before payment finished. */
const retakeForCheckout = async ({ userId, checkoutId, amountRupees }) => debit(userId, toPaise(amountRupees), {
    type: 'checkout',
    reference: { type: 'checkout', id: checkoutId },
    note: 'Used at checkout (re-applied)',
    idempotencyKey: `checkout-late:${checkoutId}`,
});

module.exports = {
    WalletError,
    toPaise,
    toRupees,
    balanceOf,
    credit,
    debit,
    statement,
    reconcile,
    applyToCheckout,
    reverseCheckout,
    retakeForCheckout,
};
