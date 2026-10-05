const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const INK = '#1A1816';
const SOFT = '#4A453F';
const FAINT = '#8A8278';
const LINE = '#E0D9CE';
const PAPER = '#F7F4EF';

/**
 * A4 packing slip: ship-to block, AWB, items and quantities — no prices, since
 * it travels inside the parcel. The QR code holds the order id for scanning at
 * the packing table.
 */
const renderPackingSlip = async order => {
    const qr = await QRCode.toBuffer(String(order._id), { margin: 0, width: 240 });

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Packing slip ${order._id}` } });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const left = 50;
        const right = doc.page.width - 50;
        const width = right - left;

        doc.font('Times-Roman').fontSize(26).fillColor(INK).text('MAISON', left, 50, { characterSpacing: 6 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor(FAINT)
            .text('PACKING SLIP', left, 58, { width, align: 'right', characterSpacing: 3 });
        doc.font('Helvetica').fontSize(11).fillColor(INK)
            .text(`Order ${order._id}`, left, 72, { width, align: 'right' });
        doc.moveTo(left, 104).lineTo(right, 104).lineWidth(0.5).strokeColor(LINE).stroke();

        const s = order.shippingInfo || {};
        const name = order.user?.name || '';
        doc.font('Helvetica').fontSize(7).fillColor(FAINT).text('SHIP TO', left, 124, { characterSpacing: 2 });
        doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(name || '—', left, 138, { width: 300 });
        doc.font('Helvetica').fontSize(11).fillColor(SOFT)
            .text([s.address, [s.city, s.state].filter(Boolean).join(', '), `${s.pinCode || ''} ${s.country || ''}`.trim(),
                s.phoneNumber && `Phone: ${s.phoneNumber}`].filter(Boolean).join('\n'), left, doc.y + 4, { width: 300, lineGap: 3 });
        const addressBottom = doc.y;

        doc.image(qr, right - 90, 124, { width: 90 });
        let metaY = 224;
        const meta = [
            ['Placed', new Date(order.createdAt || order.paidAt || Date.now()).toLocaleDateString('en-IN')],
            order.shipment?.courier && ['Courier', order.shipment.courier],
            order.shipment?.awb && ['AWB', order.shipment.awb],
        ].filter(Boolean);
        meta.forEach(([k, v]) => {
            doc.font('Helvetica').fontSize(7).fillColor(FAINT).text(k.toUpperCase(), right - 200, metaY, { width: 200, align: 'right', characterSpacing: 2 });
            doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(String(v), right - 200, metaY + 10, { width: 200, align: 'right' });
            metaY = doc.y + 8;
        });

        let y = Math.max(addressBottom, metaY) + 30;
        doc.rect(left, y, width, 22).fill(PAPER);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(FAINT)
            .text('ITEM', left + 8, y + 8, { characterSpacing: 1.5 })
            .text('QTY', right - 120, y + 8, { width: 40, align: 'right', characterSpacing: 1.5 })
            .text('PACKED', right - 68, y + 8, { width: 60, align: 'right', characterSpacing: 1.5 });
        y += 32;

        let units = 0;
        for (const item of order.orderItems || []) {
            units += item.quantity;
            doc.font('Helvetica').fontSize(11).fillColor(INK).text(item.name, left + 8, y, { width: width - 150 });
            if (item.variantLabel || item.sku) {
                doc.font('Helvetica').fontSize(9).fillColor(SOFT)
                    .text([item.variantLabel, item.sku && `SKU ${item.sku}`].filter(Boolean).join('  ·  '), left + 8, doc.y + 2, { width: width - 150 });
            }
            const rowBottom = doc.y;
            doc.font('Helvetica-Bold').fontSize(12).text(String(item.quantity), right - 120, y, { width: 40, align: 'right' });
            doc.rect(right - 22, y, 12, 12).lineWidth(0.75).strokeColor(SOFT).stroke();
            y = Math.max(rowBottom, y + 14) + 10;
            doc.moveTo(left, y - 5).lineTo(right, y - 5).lineWidth(0.5).strokeColor(LINE).stroke();
            if (y > doc.page.height - 120) {
                doc.addPage();
                y = 50;
            }
        }

        doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
            .text(`${units} unit${units === 1 ? '' : 's'} in ${order.orderItems?.length || 0} line${order.orderItems?.length === 1 ? '' : 's'}`, left, y + 10);

        doc.font('Helvetica').fontSize(8).fillColor(FAINT)
            .text('Thank you for shopping with MAISON. Your invoice was emailed to you and is in your account.',
                left, doc.page.height - 80, { width });
        doc.end();
    });
};

module.exports = { renderPackingSlip };
