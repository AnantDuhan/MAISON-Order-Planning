const mongoose = require('mongoose');

/**
 * One-time sign-in codes for email and phone login. Only hashes are stored.
 * Documents delete themselves at expiresAt (TTL index).
 */
const loginCodeSchema = new mongoose.Schema({
    _id: String,
    channel: { type: String, enum: ['email', 'phone'], required: true },
    // Normalised email, or the phone number as digits (e.g. "919876543210").
    target: { type: String, required: true },
    user: { type: String, ref: 'User', required: true },
    codeHash: { type: String, required: true },
    // Email only: hash of the token in the "sign in" magic link.
    magicTokenHash: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
});

loginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
loginCodeSchema.index({ channel: 1, target: 1, createdAt: -1 });
loginCodeSchema.index({ magicTokenHash: 1 }, { sparse: true });

module.exports = mongoose.model('LoginCode', loginCodeSchema);
