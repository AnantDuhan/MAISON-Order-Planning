/**
 * Send a sample invoice email (with PDF) to yourself. Touches no database:
 * the invoice is built in memory, so no serial number is used up.
 *
 *   node scripts/testInvoiceEmail.js you@example.com          # sends via Resend
 *   node scripts/testInvoiceEmail.js you@example.com --dry    # writes files only
 *
 * --dry writes test-invoice.pdf and test-invoice.html into the current
 * directory so you can check them without sending anything.
 *
 * The verify link/QR in this sample will say "not recognised" — the invoice
 * isn't in the database. That's expected.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env'), quiet: true });

const fs = require('fs');
const ejs = require('ejs');
const { renderInvoicePdf, invoiceFilename } = require('../utils/invoicePdf');
const { computeContentHash, verifyUrl, isSigningConfigured } = require('../utils/invoiceSigning');
const { sendEmail } = require('../utils/sendEmail');

const run = async () => {
    const to = process.argv[2];
    const dryRun = process.argv.includes('--dry');
    if (!to || !to.includes('@')) {
        console.error('Usage: node scripts/testInvoiceEmail.js you@example.com [--dry]');
        process.exit(1);
    }

    const invoice = {
        _id: 'test0001',
        invoiceNumber: 'TEST/26-27/000001',
        type: 'order',
        sourceId: 'test0001',
        order: 'test0001',
        user: 'test-user',
        issuedAt: new Date(),
        paymentRef: 'TEST-PAYMENT',
        billedTo: {
            name: 'Test Customer',
            email: to,
            address: '12 Test Street',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            pinCode: '641001',
            country: 'India',
            phone: '9999999999',
        },
        lines: [
            { description: 'Sample product A', quantity: 2, unitPrice: 499, amount: 998 },
            { description: 'Sample product B', quantity: 1, unitPrice: 1299, amount: 1299 },
        ],
        subtotal: 2297,
        shipping: 0,
        discount: 0,
        tax: 0,
        total: 2297,
        currency: 'INR',
        status: 'issued',
        isDemo: false,
    };
    invoice.contentHash = computeContentHash(invoice);

    if (!isSigningConfigured()) {
        console.warn('INVOICE_SIGNING_SECRET is not set locally: the PDF will have no QR box.');
    }

    const html = await ejs.renderFile(path.join(__dirname, '../mails/invoice.ejs'), {
        invoice,
        verifyLink: isSigningConfigured() ? verifyUrl(invoice) : null,
    });
    const pdf = await renderInvoicePdf(invoice);
    console.log(`Rendered PDF: ${pdf.length} bytes`);

    if (dryRun) {
        fs.writeFileSync('test-invoice.pdf', pdf);
        fs.writeFileSync('test-invoice.html', html);
        console.log('Wrote test-invoice.pdf and test-invoice.html (nothing sent).');
        return;
    }

    const result = await sendEmail({
        email: to,
        sender: 'support',
        subject: `[TEST] Your MAISON invoice ${invoice.invoiceNumber}`,
        html,
        attachments: [{ filename: invoiceFilename(invoice), content: pdf }],
    });
    console.log(`Sent. Resend id: ${result.id}`);
};

run().then(() => process.exit(0)).catch(error => {
    console.error('FAILED:', error.message);
    process.exit(1);
});
