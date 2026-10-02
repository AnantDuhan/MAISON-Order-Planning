/**
 * Shipments and tracking.
 *
 * Works with any courier: an admin can record the courier, AWB and tracking
 * events by hand, and Shiprocket (or any aggregator posting the same shape)
 * can push events to POST /api/v1/logistics/track-updates.
 *
 * Customers see the timeline on their order page and get an email + push for
 * the moments that matter: shipped, out for delivery, a failed attempt, a
 * delay, delivered.
 */
const ejs = require('ejs');
const path = require('path');
const crypto = require('crypto');

const Order = require('../models/order');
const User = require('../models/user');
const cache = require('../utils/cache');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/sendEmail');
const { sendPushNotification } = require('../utils/pushNotifications');

const STATUSES = ['Shipped', 'In transit', 'Out for delivery', 'Delivery attempted',
    'Delayed', 'Delivered', 'Returning to sender'];

// Customer-facing notifications. 'In transit' scans are too frequent to email.
const NOTIFY = {
    'Out for delivery': {
        subject: 'Your MAISON order is out for delivery',
        headline: 'Arriving today',
        body: 'Your order is with the delivery agent and should reach you today.',
    },
    'Delivery attempted': {
        subject: 'We tried to deliver your MAISON order',
        headline: 'We missed you',
        body: 'The courier attempted delivery but couldn’t complete it. They will usually try again on the next working day.',
    },
    Delayed: {
        subject: 'Your MAISON order is running late',
        headline: 'A short delay',
        body: 'The courier has reported a delay. We’re keeping an eye on it and you can follow the latest status below.',
    },
    'Returning to sender': {
        subject: 'Your MAISON order couldn’t be delivered',
        headline: 'Returning to us',
        body: 'The courier couldn’t complete delivery and the parcel is on its way back to us. We’ll be in touch about next steps.',
    },
};

const invalidate = order =>
    cache.del(`order:${order._id}`, 'orders', `orders:${order.user?._id || order.user}`).catch(() => {});

const clean = (value, max = 200) =>
    typeof value === 'string' ? value.trim().slice(0, max) || undefined : undefined;

/** Courier tracking page for well-known couriers, when none is supplied. */
const defaultTrackingUrl = (courier = '', awb = '') => {
    const c = courier.toLowerCase();
    const id = encodeURIComponent(awb);
    if (c.includes('delhivery')) return `https://www.delhivery.com/track-v2/package/${id}`;
    if (c.includes('blue dart') || c.includes('bluedart')) return `https://www.bluedart.com/tracking?trackFor=0&trackNo=${id}`;
    if (c.includes('dtdc')) return `https://www.dtdc.in/trace.asp?strCnno=${id}`;
    if (c.includes('xpressbees')) return `https://www.xpressbees.com/shipment/tracking?awbNo=${id}`;
    if (c.includes('ekart')) return `https://ekartlogistics.com/shipmenttrack/${id}`;
    if (c.includes('india post') || c.includes('speed post')) return 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
    if (c.includes('shiprocket') || !c) return awb ? `https://shiprocket.co/tracking/${id}` : undefined;
    return undefined;
};

/** Map a courier's free-text status to our timeline status. */
const normalizeCourierStatus = raw => {
    const s = String(raw || '').toUpperCase();
    if (!s) return null;
    if (s.includes('RTO')) return 'Returning to sender';
    if (s.includes('OUT FOR DELIVERY')) return 'Out for delivery';
    if (s.includes('UNDELIVERED') || s.includes('NDR') || s.includes('FAILED') || s.includes('ATTEMPT')) return 'Delivery attempted';
    if (s.includes('DELIVERED')) return 'Delivered';
    if (s.includes('DELAY') || s.includes('MISROUTE')) return 'Delayed';
    if (s.includes('CANCEL')) return null; // cancellations are handled by an admin
    return 'In transit';
};

const eventKey = e => `${e.status}|${new Date(e.at).toISOString()}|${(e.location || '').toLowerCase()}`;

/** Record the courier and first 'Shipped' event. Mutates; caller saves. */
const applyShipped = (order, { courier, awb, trackingUrl } = {}) => {
    const now = new Date();
    const cleanCourier = clean(courier, 80);
    const cleanAwb = clean(awb, 60);
    const existing = order.shipment || {};
    order.shipment = {
        ...((existing.toObject && existing.toObject()) || existing),
        courier: cleanCourier || existing.courier,
        awb: cleanAwb || existing.awb,
        trackingUrl: clean(trackingUrl, 500) || existing.trackingUrl
            || defaultTrackingUrl(cleanCourier || existing.courier, cleanAwb || existing.awb),
        shippedAt: existing.shippedAt || now,
        lastStatus: 'Shipped',
        lastEventAt: now,
        events: [...(existing.events || []), { status: 'Shipped', at: now, source: 'admin' }],
    };
};

/** Correct courier details later (typo in the AWB, etc.). */
const updateShipmentDetails = async (orderId, { courier, awb, trackingUrl }) => {
    const order = await Order.findById(orderId);
    if (!order) return null;
    if (!order.shipment) order.shipment = {};
    if (courier !== undefined) order.shipment.courier = clean(courier, 80);
    if (awb !== undefined) order.shipment.awb = clean(awb, 60);
    if (trackingUrl !== undefined) order.shipment.trackingUrl = clean(trackingUrl, 500)
        || defaultTrackingUrl(order.shipment.courier, order.shipment.awb);
    await order.save({ validateBeforeSave: false });
    await invalidate(order);
    return order;
};

const notifyCustomer = async (order, event) => {
    const user = await User.findById(order.user?._id || order.user).select('name email pushToken');
    if (!user) return;

    sendPushNotification(
        user.pushToken,
        event.status,
        `Order ${order._id}: ${event.status}${event.location ? ` · ${event.location}` : ''}`,
        { orderId: order._id, type: 'order-status' }
    ).catch(() => {});

    const copy = NOTIFY[event.status];
    if (!copy || !user.email) return;
    const html = await ejs.renderFile(path.join(__dirname, '../mails/shipment-update.ejs'), {
        user,
        order,
        event,
        copy,
        orderLink: `${process.env.BACKEND_URL || process.env.FRONTEND_URL || ''}/go/order/${order._id}`,
    });
    await sendEmail({ email: user.email, sender: 'support', subject: copy.subject, html });
};

/**
 * Add one tracking event. Duplicate events (same status, time and place) are
 * ignored, so courier retries are harmless. 'Delivered' moves a Shipped order
 * to Delivered.
 *
 * @returns {Promise<{added: boolean, delivered: boolean, order}>}
 */
const addTrackingEvent = async (order, input, { source = 'admin', io, notify = true } = {}) => {
    const status = STATUSES.includes(input.status) ? input.status : null;
    if (!status || status === 'Shipped') {
        const error = new Error(`Tracking status must be one of: ${STATUSES.slice(1).join(', ')}`);
        error.statusCode = 400;
        throw error;
    }
    if (!['Shipped', 'Delivered'].includes(order.orderStatus)) {
        const error = new Error('Mark the order as Shipped before adding tracking events');
        error.statusCode = 409;
        throw error;
    }

    const at = input.at ? new Date(input.at) : new Date();
    if (Number.isNaN(at.getTime())) {
        const error = new Error('Invalid event time');
        error.statusCode = 400;
        throw error;
    }
    const event = {
        status,
        at,
        location: clean(input.location, 120),
        note: clean(input.note, 300),
        source,
        rawStatus: clean(input.rawStatus, 80),
    };

    order.shipment = order.shipment || { events: [] };
    const events = order.shipment.events || [];
    if (events.some(e => eventKey(e) === eventKey(event))) {
        return { added: false, delivered: false, order };
    }
    events.push(event);
    events.sort((a, b) => new Date(a.at) - new Date(b.at));
    order.shipment.events = events;

    const latest = events[events.length - 1];
    order.shipment.lastStatus = latest.status;
    order.shipment.lastEventAt = latest.at;

    let delivered = false;
    if (status === 'Delivered' && order.orderStatus === 'Shipped') {
        order.orderStatus = 'Delivered';
        order.DeliveredAt = at;
        order.estimatedDeliveryDate = null;
        delivered = true;
    }

    await order.save({ validateBeforeSave: false });
    await invalidate(order);

    if (io) {
        io.to(`order:${order._id}`).emit('orderStatusUpdate', {
            orderId: order._id,
            orderStatus: order.orderStatus,
            shipment: order.shipment,
        });
    }

    if (notify) {
        notifyCustomer(order, event).catch(error =>
            logger.error({ err: error.message, orderId: order._id }, 'tracking notification failed'));
    }
    return { added: true, delivered, order };
};

// ---- Courier webhook (Shiprocket format) -----------------------------------------

const tokenMatches = (given, expected) => {
    if (!expected || typeof given !== 'string') return false;
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Shiprocket timestamps look like "23 05 2023 11:43:52" (DD MM YYYY, IST).
const parseCourierDate = value => {
    if (!value) return null;
    const m = /^(\d{1,2})[\s/-](\d{1,2})[\s/-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value).trim());
    if (m) {
        const [, d, mo, y, h, mi, sec = '0'] = m;
        return new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}:${sec.padStart(2, '0')}+05:30`);
    }
    const parsed = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Apply a courier webhook. Uses the latest status (and its scan) rather than
 * replaying every scan, so customers aren't emailed about old events.
 * @returns {Promise<{matched: boolean, added?: boolean, status?: string}>}
 */
const handleCourierWebhook = async (body, { io } = {}) => {
    const awb = clean(String(body?.awb ?? ''), 60);
    if (!awb) return { matched: false, reason: 'no awb' };

    const order = await Order.findOne({ 'shipment.awb': awb });
    if (!order) return { matched: false, reason: 'unknown awb' };

    const rawStatus = body.current_status || body.shipment_status;
    const status = normalizeCourierStatus(rawStatus);
    if (!status) return { matched: true, added: false, reason: `ignored status ${rawStatus}` };

    const scans = Array.isArray(body.scans) ? body.scans : [];
    const lastScan = scans[scans.length - 1] || {};
    const at = parseCourierDate(body.current_timestamp) || parseCourierDate(lastScan.date) || new Date();

    if (body.courier_name && !order.shipment?.courier) {
        order.shipment.courier = clean(body.courier_name, 80);
    }

    const result = await addTrackingEvent(order, {
        status,
        at,
        location: lastScan.location,
        note: lastScan.activity,
        rawStatus,
    }, { source: 'courier', io });
    return { matched: true, added: result.added, status };
};

module.exports = {
    STATUSES,
    applyShipped,
    updateShipmentDetails,
    addTrackingEvent,
    handleCourierWebhook,
    normalizeCourierStatus,
    parseCourierDate,
    defaultTrackingUrl,
    tokenMatches,
};
