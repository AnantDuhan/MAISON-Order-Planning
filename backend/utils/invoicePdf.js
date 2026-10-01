const PDFDocument = require('pdfkit');

// MAISON palette (mirrors the email templates).
const INK = '#1A1816';
const SOFT = '#4A453F';
const FAINT = '#8A8278';
const BRASS = '#A07C4B';
const LINE = '#E0D9CE';
const PAPER = '#F7F4EF';

// The built-in PDF fonts have no ₹ glyph, so amounts use the ISO code.
const money = n => `INR ${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const formatDate = d => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

const invoiceFilename = invoice => `${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`;

/**
 * Render an invoice snapshot to a PDF buffer. Pure function of the invoice
 * document, so the same invoice always produces the same PDF and nothing has
 * to be stored.
 *
 * @param {import('mongoose').Document|object} invoice
 * @returns {Promise<Buffer>}
 */
const renderInvoicePdf = invoice => new Promise((resolve, reject) => {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
            Title: `Invoice ${invoice.invoiceNumber}`,
            Author: 'MAISON',
            Subject: invoice.type === 'membership' ? 'Membership invoice' : 'Order invoice',
        },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 50;
    const right = doc.page.width - 50;
    const width = right - left;

    // ---- Header ------------------------------------------------------------
    doc.font('Times-Roman').fontSize(28).fillColor(INK)
        .text('MAISON', left, 50, { characterSpacing: 6 });
    doc.font('Helvetica').fontSize(8).fillColor(FAINT)
        .text('maisonorderplanning.in', left, doc.y + 2, { characterSpacing: 1 });

    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRASS)
        .text(invoice.type === 'membership' ? 'MEMBERSHIP INVOICE' : 'INVOICE', left, 56, {
            width,
            align: 'right',
            characterSpacing: 3,
        });
    doc.font('Times-Roman').fontSize(16).fillColor(INK)
        .text(invoice.invoiceNumber, left, 70, { width, align: 'right' });

    if (invoice.isDemo) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#B3261E')
            .text('DEMO ACCOUNT — NOT A VALID TAX DOCUMENT', left, 92, {
                width,
                align: 'right',
                characterSpacing: 1,
            });
    }

    doc.moveTo(left, 120).lineTo(right, 120).lineWidth(0.5).strokeColor(LINE).stroke();

    // ---- Meta + billed to --------------------------------------------------
    const label = (text, x, y) => doc.font('Helvetica').fontSize(7).fillColor(FAINT)
        .text(text.toUpperCase(), x, y, { characterSpacing: 2 });
    const value = (text, x, y, opts = {}) => doc.font('Helvetica').fontSize(10).fillColor(INK)
        .text(text || '—', x, y, opts);

    const b = invoice.billedTo || {};
    label('Billed to', left, 140);
    value(b.name, left, 154);
    const addressLines = [
        b.email,
        b.address,
        [b.city, b.state, b.pinCode].filter(Boolean).join(', '),
        b.country,
        b.phone && `Phone: ${b.phone}`,
    ].filter(Boolean);
    doc.font('Helvetica').fontSize(9).fillColor(SOFT)
        .text(addressLines.join('\n'), left, doc.y + 2, { width: 260, lineGap: 2 });
    const billedBottom = doc.y;

    const metaX = 340;
    const metaW = right - metaX;
    const meta = [
        ['Invoice date', formatDate(invoice.issuedAt)],
        invoice.order && ['Order ID', invoice.order],
        ['Payment reference', invoice.paymentRef],
        invoice.couponCode && ['Coupon', invoice.couponCode],
    ].filter(Boolean);
    let metaY = 140;
    meta.forEach(([k, v]) => {
        label(k, metaX, metaY);
        value(String(v || '—'), metaX, metaY + 11, { width: metaW });
        metaY = doc.y + 8;
    });

    // ---- Line items --------------------------------------------------------
    let y = Math.max(billedBottom, metaY) + 24;
    const cols = [
        { key: 'description', title: 'Item', x: left, w: 250, align: 'left' },
        { key: 'quantity', title: 'Qty', x: 305, w: 40, align: 'right' },
        { key: 'unitPrice', title: 'Rate', x: 350, w: 90, align: 'right' },
        { key: 'amount', title: 'Amount', x: 445, w: right - 445, align: 'right' },
    ];

    doc.rect(left, y, width, 22).fill(PAPER);
    cols.forEach(c => doc.font('Helvetica-Bold').fontSize(7).fillColor(FAINT)
        .text(c.title.toUpperCase(), c.x + (c.align === 'left' ? 8 : 0), y + 8, {
            width: c.w - (c.align === 'right' ? 8 : 0),
            align: c.align,
            characterSpacing: 1.5,
        }));
    y += 30;

    (invoice.lines || []).forEach(line => {
        if (y > doc.page.height - 200) {
            doc.addPage();
            y = 50;
        }
        const cells = {
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: money(line.unitPrice),
            amount: money(line.amount),
        };
        let rowBottom = y;
        cols.forEach(c => {
            doc.font('Helvetica').fontSize(9).fillColor(INK)
                .text(cells[c.key], c.x + (c.align === 'left' ? 8 : 0), y, {
                    width: c.w - (c.align === 'right' ? 8 : 0) - (c.align === 'left' ? 8 : 0),
                    align: c.align,
                });
            rowBottom = Math.max(rowBottom, doc.y);
        });
        y = rowBottom + 8;
        doc.moveTo(left, y - 4).lineTo(right, y - 4).lineWidth(0.5).strokeColor(LINE).stroke();
    });

    // ---- Totals ------------------------------------------------------------
    y += 10;
    const totalsX = 330;
    const totalsW = right - totalsX - 8;
    const totalRow = (k, v, strong = false) => {
        doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(strong ? 11 : 9)
            .fillColor(strong ? INK : SOFT)
            .text(k, totalsX, y, { width: totalsW / 2 });
        doc.text(v, totalsX + totalsW / 2, y, { width: totalsW / 2, align: 'right' });
        y = doc.y + 6;
    };

    totalRow('Subtotal', money(invoice.subtotal));
    if (invoice.type === 'order') {
        totalRow('Shipping', invoice.shipping ? money(invoice.shipping) : 'Complimentary');
    }
    if (invoice.discount) totalRow('Discount', `- ${money(invoice.discount)}`);
    if (invoice.tax) totalRow('Tax', money(invoice.tax));

    doc.moveTo(totalsX, y).lineTo(right, y).lineWidth(0.75).strokeColor(BRASS).stroke();
    y += 8;
    totalRow('Total paid', money(invoice.total), true);

    // ---- Footer ------------------------------------------------------------
    const footY = doc.page.height - 90;
    doc.moveTo(left, footY).lineTo(right, footY).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(FAINT)
        .text('All prices are inclusive of applicable taxes.', left, footY + 12, { width })
        .text('This is a computer-generated invoice and does not require a signature.', { width })
        .text('Questions about this invoice? Reply to your order email or contact us via the website.', { width });

    doc.end();
});

module.exports = renderInvoicePdf;
module.exports.renderInvoicePdf = renderInvoicePdf;
module.exports.invoiceFilename = invoiceFilename;
