const Invoice = require('../models/invoice');
const Order = require('../models/order');
const { createOrderInvoice } = require('../services/invoiceService');
const { renderInvoicePdf, invoiceFilename } = require('../utils/invoicePdf');

const isOwnerOrAdmin = (doc, user) =>
    user && (String(doc.user?._id || doc.user) === String(user._id) || user.role === 'admin');

// 404 (not 403) for someone else's invoice, so ids can't be probed.
const notFound = res => res.status(404).json({ success: false, message: 'Invoice not found' });

const sendPdf = async (res, invoice) => {
    const pdf = await renderInvoicePdf(invoice);
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdf.length,
        'Content-Disposition': `attachment; filename="${invoiceFilename(invoice)}"`,
        'Cache-Control': 'private, no-store',
    });
    res.send(pdf);
};

// GET /api/v1/invoices/me?type=order|membership
exports.myInvoices = async (req, res) => {
    const filter = { user: String(req.user._id) };
    if (['order', 'membership'].includes(req.query.type)) filter.type = req.query.type;

    const invoices = await Invoice.find(filter)
        .select('invoiceNumber type order membership total currency issuedAt isDemo')
        .sort({ issuedAt: -1 })
        .limit(100)
        .lean();

    res.status(200).json({ success: true, invoices });
};

// GET /api/v1/invoice/:id/download
exports.downloadInvoice = async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice || !isOwnerOrAdmin(invoice, req.user)) return notFound(res);
    await sendPdf(res, invoice);
};

// GET /api/v1/order/:id/invoice
// Creates the invoice on first request for paid orders that predate this
// feature (or whose background creation failed), without emailing it.
exports.downloadOrderInvoice = async (req, res) => {
    let invoice = await Invoice.findOne({ type: 'order', sourceId: req.params.id });

    if (!invoice) {
        const order = await Order.findById(req.params.id);
        if (!order || !isOwnerOrAdmin(order, req.user)) return notFound(res);
        if (!order.paidAt) {
            return res.status(409).json({ success: false, message: 'This order has not been paid yet' });
        }
        invoice = await createOrderInvoice(order, null, { emailStatus: 'skipped' });
    }

    if (!isOwnerOrAdmin(invoice, req.user)) return notFound(res);
    await sendPdf(res, invoice);
};
