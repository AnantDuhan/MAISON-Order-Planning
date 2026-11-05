const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

// One Core Web Vitals measurement from a real visitor's browser. Anonymous:
// no user, session, IP or full URL, only the kind of page and of device.
// Kept 30 days (TTL index), which is the window the admin report reads.
const webVitalSchema = new mongoose.Schema({
    metric: { type: String, enum: ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'], required: true },
    value: { type: Number, required: true, min: 0 },
    page: { type: String, enum: ['home', 'listing', 'product', 'cart', 'checkout', 'account', 'other'], required: true },
    device: { type: String, enum: ['mobile', 'desktop'], required: true },
    createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

webVitalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
webVitalSchema.index({ device: 1, metric: 1, createdAt: -1 });

module.exports = mongoose.model('WebVital', webVitalSchema);
