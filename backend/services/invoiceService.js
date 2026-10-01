const ejs = require('ejs');
const path = require('path');

const Invoice = require('../models/invoice');
const User = require('../models/user');
const generateId = require('../utils/generateId');
const nextInvoiceNumber = require('../utils/invoiceNumber');
const { renderInvoicePdf, invoiceFilename } = require('../utils/invoicePdf');
const { sendEmail } = require('../utils/sendEmail');
const { computeContentHash, verifyUrl, isSigningConfigured } = require('../utils/invoiceSigning');
const logger = require('../config/logger');

const MAX_EMAIL_ATTEMPTS = 5;

const round2 = n => Math.round(Number(n || 0) * 100) / 100;

// Insert-or-return-existing. The unique {type, sourceId} index makes this safe
// against concurrent calls: the loser of the race gets E11000 and reads the
// winner's document. (A serial number may be burned in that race; that is the
// accepted trade-off for not holding a lock across the insert.)
const createOnce = async (type, sourceId, build) => {
    const existing = await Invoice.findOne({ type, sourceId });
    if (existing) return existing;

    try {
        const data = await build();
        // Hash what was billed before it is written, so the stored row and its
        // hash are created together.
        data.contentHash = computeContentHash(data);
        data.status = 'issued';
        return await Invoice.create(data);
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.sourceId) {
            return Invoice.findOne({ type, sourceId });
        }
        throw error;
    }
};

/**
 * Create (or fetch) the invoice for a paid order.
 * @param {object} order  Order document (paid)
 * @param {object} [user] User document; loaded if omitted
 * @param {object} [opts] { emailStatus } — e.g. 'skipped' for backfills
 */
const createOrderInvoice = async (order, user, opts = {}) => {
    return createOnce('order', String(order._id), async () => {
        const buyer = user || await User.findById(order.user).select('name email');
        const s = order.shippingInfo || {};
        const isDemo = Boolean(order.isDemo);

        return {
            _id: generateId(),
            invoiceNumber: await nextInvoiceNumber(isDemo ? 'demo' : 'order', order.paidAt || new Date()),
            type: 'order',
            sourceId: String(order._id),
            order: String(order._id),
            user: String(order.user?._id || order.user),
            billedTo: {
                name: buyer?.name,
                email: buyer?.email,
                address: s.address,
                city: s.city,
                state: s.state,
                country: s.country,
                pinCode: s.pinCode != null ? String(s.pinCode) : undefined,
                phone: s.phoneNumber != null ? String(s.phoneNumber) : undefined,
            },
            lines: (order.orderItems || []).map(item => ({
                description: item.name,
                quantity: item.quantity,
                unitPrice: round2(item.price),
                amount: round2(item.price * item.quantity),
            })),
            subtotal: round2(order.itemsPrice),
            shipping: round2(order.shippingPrice),
            discount: round2(order.discountedAmount),
            tax: round2(order.taxPrice),
            total: round2(order.totalPrice),
            couponCode: order.couponCode,
            paymentRef: order.paymentInfo?.id,
            issuedAt: order.paidAt || new Date(),
            emailStatus: opts.emailStatus || 'pending',
            isDemo,
        };
    });
};

/**
 * Create (or fetch) the invoice for one successful membership charge.
 * Keyed on Cashfree's cf_payment_id so webhook retries never duplicate it.
 */
const createMembershipInvoice = async (membership, payment) => {
    const paymentId = String(payment.cfPaymentId);
    return createOnce('membership', paymentId, async () => {
        const buyer = await User.findById(membership.user).select('name email');
        const amount = round2(payment.amount ?? membership.amount);
        const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date();

        return {
            _id: generateId(),
            invoiceNumber: await nextInvoiceNumber(membership.isDemo ? 'demo' : 'membership', paidAt),
            type: 'membership',
            sourceId: paymentId,
            membership: String(membership._id),
            user: String(membership.user),
            billedTo: { name: buyer?.name, email: buyer?.email },
            lines: [{
                description: `${membership.name} — ${membership.duration === 12 ? '12 months' : '1 month'}`,
                quantity: 1,
                unitPrice: amount,
                amount,
            }],
            subtotal: amount,
            total: amount,
            paymentRef: paymentId,
            issuedAt: paidAt,
            isDemo: Boolean(membership.isDemo),
        };
    });
};

/**
 * Email an invoice PDF to its buyer and record the outcome on the invoice.
 * Throws on failure (after recording it) so callers can log.
 */
// Invoice mail goes out from the support sender (same as order / membership
// emails) so customers can reply to it.
const emailInvoice = async (invoice, { subject, html, sender = 'support' } = {}) => {
    if (!invoice.billedTo?.email) {
        await Invoice.updateOne({ _id: invoice._id }, { emailStatus: 'skipped' });
        return;
    }

    try {
        if (!html) {
            html = await ejs.renderFile(path.join(__dirname, '../mails/invoice.ejs'), {
                invoice,
                verifyLink: isSigningConfigured() ? verifyUrl(invoice) : null,
            });
        }
        const pdf = await renderInvoicePdf(invoice);
        await sendEmail({
            email: invoice.billedTo.email,
            sender,
            subject: subject || `Your MAISON invoice ${invoice.invoiceNumber}`,
            html,
            attachments: [{ filename: invoiceFilename(invoice), content: pdf }],
        });
        await Invoice.updateOne(
            { _id: invoice._id },
            { emailStatus: 'sent', $inc: { emailAttempts: 1 }, $unset: { lastEmailError: 1 } }
        );
    } catch (error) {
        await Invoice.updateOne(
            { _id: invoice._id },
            { emailStatus: 'failed', $inc: { emailAttempts: 1 }, lastEmailError: error.message }
        ).catch(() => {});
        throw error;
    }
};

/**
 * Fire-and-forget: create the order invoice and send the order confirmation
 * email with the PDF attached. If invoice generation itself fails, the
 * confirmation still goes out (without attachment) — the customer must always
 * get their order email; the invoice-retry job picks up the rest.
 */
const sendOrderConfirmationWithInvoice = ({ order, user, subject, html, sender = 'support' }) => {
    setImmediate(async () => {
        let invoice;
        try {
            invoice = await createOrderInvoice(order, user);
        } catch (error) {
            logger.error({ orderId: order._id, err: error.message }, 'order invoice creation failed');
            sendEmail({ email: user.email, sender, subject, html }).catch(err =>
                logger.error({ orderId: order._id, err: err.message }, 'order confirmation email failed'));
            return;
        }

        try {
            await emailInvoice(invoice, { subject, html, sender });
        } catch (error) {
            logger.error({ orderId: order._id, invoice: invoice.invoiceNumber, err: error.message },
                'order confirmation + invoice email failed; will be retried');
        }
    });
};

/**
 * Re-send invoices whose email failed or never went out. Driven by
 * POST /api/v1/jobs/invoice-retry. Bounded per run.
 */
const retryPendingInvoiceEmails = async ({ limit = 20 } = {}) => {
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
    const invoices = await Invoice.find({
        isDemo: { $ne: true },
        emailAttempts: { $lt: MAX_EMAIL_ATTEMPTS },
        $or: [
            { emailStatus: 'failed' },
            { emailStatus: 'pending', issuedAt: { $lt: staleBefore } },
        ],
    }).sort({ issuedAt: 1 }).limit(limit);

    let sent = 0;
    let failed = 0;
    for (const invoice of invoices) {
        try {
            await emailInvoice(invoice);
            sent += 1;
        } catch (error) {
            failed += 1;
            logger.warn({ invoice: invoice.invoiceNumber, err: error.message }, 'invoice email retry failed');
        }
    }
    return { scanned: invoices.length, sent, failed };
};

/**
 * Move an order's invoice to a new lifecycle status (e.g. after a refund).
 * Only `status` changes; the billed content and its hash stay as issued.
 */
const setOrderInvoiceStatus = async (orderId, status) => {
    const result = await Invoice.updateOne(
        { type: 'order', sourceId: String(orderId), status: { $ne: status } },
        { status, statusUpdatedAt: new Date() }
    );
    return result.modifiedCount > 0;
};

module.exports = {
    setOrderInvoiceStatus,
    createOrderInvoice,
    createMembershipInvoice,
    emailInvoice,
    sendOrderConfirmationWithInvoice,
    retryPendingInvoiceEmails,
};
