const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// Append-only record of admin actions. Written by middleware/audit.js; never
// updated or deleted through the app.
const auditLogSchema = new mongoose.Schema({
    _id: String,
    at: { type: Date, default: Date.now },
    actor: {
        id: String,
        name: String,
        email: String,
        role: String,
    },
    action: { type: String, required: true },       // e.g. order.status
    method: String,
    path: String,                                   // route pattern, e.g. /api/v1/admin/order/:id
    entity: {
        type: { type: String },                     // order, product, user, ...
        id: String,
    },
    summary: String,
    changes: [
        {
            _id: false,
            field: String,
            from: mongoose.Schema.Types.Mixed,
            to: mongoose.Schema.Types.Mixed,
        },
    ],
    request: mongoose.Schema.Types.Mixed,           // redacted body
    status: Number,
    ip: String,
    userAgent: String,
    isDemo: { type: Boolean, default: false },
});

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ 'entity.type': 1, 'entity.id': 1, at: -1 });
auditLogSchema.index({ 'actor.id': 1, at: -1 });
auditLogSchema.index({ action: 1, at: -1 });

const immutable = () => {
    throw new Error('Audit log entries cannot be changed or deleted');
};
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne',
    'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete'], immutable);
auditLogSchema.pre('save', function () {
    if (!this.isNew) immutable();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
