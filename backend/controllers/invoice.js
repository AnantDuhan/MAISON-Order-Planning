const Invoice = require('../models/invoice');
const Order = require('../models/order');
const { createOrderInvoice } = require('../services/invoiceService');
const { renderInvoicePdf, invoiceFilename } = require('../utils/invoicePdf');
const { computeContentHash, tokenMatches, fingerprint } = require('../utils/invoiceSigning');

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
    if (['order', 'membership', 'credit-note'].includes(req.query.type)) filter.type = req.query.type;

    const invoices = await Invoice.find(filter)
        .select('invoiceNumber type order membership total currency issuedAt isDemo creditNoteForNumber status')
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

// "Anant Duhan" -> "A**** D****"
const maskName = name => String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0] + '*'.repeat(Math.max(1, word.length - 1)))
    .join(' ');

const VERIFY_REF = /^([0-9a-z]{4,32})\.([A-Za-z0-9_-]{22})$/;

// GET /api/v1/invoice/verify/:ref   (public, rate-limited)
// ref = "<invoiceId>.<token>" exactly as printed in the invoice QR code.
// Returns only what is needed to compare against a paper/PDF copy.
exports.verifyInvoice = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const notGenuine = () => res.status(404).json({
        success: false,
        valid: false,
        message: 'No MAISON invoice matches this verification code.',
    });

    const match = VERIFY_REF.exec(String(req.params.ref || ''));
    if (!match) return notGenuine();

    const invoice = await Invoice.findById(match[1]);
    if (!invoice) return notGenuine();

    let tokenOk = false;
    try {
        tokenOk = tokenMatches(invoice, match[2]);
    } catch (error) {
        // Signing secret not configured: verification is unavailable, not "fake".
        return res.status(503).json({
            success: false,
            valid: false,
            message: 'Invoice verification is temporarily unavailable.',
        });
    }
    if (!tokenOk) return notGenuine();

    // Recompute from the stored row: catches edits made directly in the DB.
    const intact = computeContentHash(invoice) === invoice.contentHash;
    if (!intact) {
        console.error(`Invoice ${invoice.invoiceNumber} failed its integrity check`);
    }

    // Link credit notes and the invoices they reverse, both ways.
    let creditNote = null;
    if (invoice.type !== 'credit-note' && invoice.status === 'refunded') {
        creditNote = await Invoice.findOne({ type: 'credit-note', creditNoteFor: invoice._id })
            .select('invoiceNumber issuedAt total').lean();
    }

    res.status(200).json({
        success: true,
        valid: intact && !invoice.isDemo,
        status: intact ? invoice.status : 'integrity-failed',
        isDemo: invoice.isDemo,
        invoice: {
            invoiceNumber: invoice.invoiceNumber,
            type: invoice.type,
            issuedAt: invoice.issuedAt,
            total: invoice.total,
            currency: invoice.currency,
            billedTo: maskName(invoice.billedTo?.name),
            lineCount: invoice.lines.length,
            fingerprint: fingerprint(invoice),
            statusUpdatedAt: invoice.statusUpdatedAt,
            againstInvoice: invoice.creditNoteForNumber,
            refundMethod: invoice.refundMethod,
            creditNote: creditNote && {
                invoiceNumber: creditNote.invoiceNumber,
                issuedAt: creditNote.issuedAt,
                total: creditNote.total,
            },
        },
        issuer: { name: 'MAISON', website: 'maisonorderplanning.in' },
    });
};

// GET /api/v1/order/:id/credit-note
exports.downloadOrderCreditNote = async (req, res) => {
    const note = await Invoice.findOne({ type: 'credit-note', order: req.params.id }).sort({ issuedAt: -1 });
    if (!note || !isOwnerOrAdmin(note, req.user)) {
        return res.status(404).json({ success: false, message: 'No credit note for this order' });
    }
    await sendPdf(res, note);
};
