const Counter = require('../models/counter');

// Indian financial year runs April → March, e.g. "26-27" for Apr 2026–Mar 2027.
const financialYear = (date = new Date()) => {
    const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
};

const PREFIXES = {
    order: 'MSN',
    membership: 'MSM',
    demo: 'DEMO',
};

/**
 * Next gap-free, sequential invoice number for a series, e.g. "MSN/26-27/000123".
 * The counter is incremented atomically, so concurrent requests never share a
 * number. The series resets every financial year.
 *
 * @param {'order'|'membership'|'demo'} series
 */
const nextInvoiceNumber = async (series, date = new Date()) => {
    const prefix = PREFIXES[series];
    if (!prefix) throw new Error(`Unknown invoice series: ${series}`);

    const fy = financialYear(date);
    const { seq } = await Counter.findOneAndUpdate(
        { _id: `invoice:${prefix}:${fy}` },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    );
    return `${prefix}/${fy}/${String(seq).padStart(6, '0')}`;
};

module.exports = nextInvoiceNumber;
module.exports.nextInvoiceNumber = nextInvoiceNumber;
module.exports.financialYear = financialYear;
