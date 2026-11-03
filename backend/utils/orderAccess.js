/**
 * Read-only access to one order without signing in.
 *
 * Used by the public "Track your order" page and by links in order emails,
 * so a shopper (signed in or not, guest or account holder) can follow a
 * delivery. The token only ever unlocks the tracking view of that one order
 * (utils/orderAccess.trackingView), never the full order, returns or refunds.
 */
const jwt = require('jsonwebtoken');

const KIND = 'order-view';
const LIFETIME = '120d';

const normalizeEmail = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** A link-safe token that lets the holder view one order's tracking. */
const signOrderViewToken = orderId =>
    jwt.sign({ kind: KIND, oid: String(orderId) }, process.env.JWT_SECRET_KEY, { expiresIn: LIFETIME });

/** True when `token` was issued for `orderId` and hasn't expired. */
const verifyOrderViewToken = (token, orderId) => {
    if (typeof token !== 'string' || !token) return false;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        return decoded.kind === KIND && decoded.oid === String(orderId);
    } catch {
        return false;
    }
};

/** Frontend link to an order's tracking page that works without signing in. */
const trackingLink = orderId =>
    `${process.env.FRONTEND_URL || ''}/track/${encodeURIComponent(orderId)}?t=${signOrderViewToken(orderId)}`;

/**
 * Who to contact about an order: the account holder (order.user populated
 * or passed in) or, for a guest order, the details given at checkout.
 */
const orderContact = (order, user = null) => {
    const account = user || (order?.user && typeof order.user === 'object' ? order.user : null);
    if (account?.email) return { name: account.name, email: normalizeEmail(account.email), isGuest: false };
    if (order?.guest?.email) {
        return { name: order.guest.name, email: normalizeEmail(order.guest.email), isGuest: true };
    }
    return null;
};

/**
 * What the tracking page may show. Leaves out the street address, phone
 * number, payment ids and anything to do with returns, so a forwarded
 * tracking link can't leak more than where a parcel is going.
 */
const trackingView = order => {
    const shipment = order.shipment || {};
    return {
        _id: order._id,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        orderStatus: order.orderStatus,
        estimatedDeliveryDate: order.estimatedDeliveryDate || null,
        deliveredAt: order.DeliveredAt || null,
        shipment: {
            courier: shipment.courier || null,
            awb: shipment.awb || null,
            trackingUrl: shipment.trackingUrl || null,
            shippedAt: shipment.shippedAt || null,
            lastStatus: shipment.lastStatus || null,
            events: (shipment.events || []).map(e => ({
                status: e.status,
                at: e.at,
                location: e.location || null,
                note: e.note || null,
            })),
        },
        orderItems: (order.orderItems || []).map(item => ({
            product: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            variantLabel: item.variantLabel || null,
            image: item.images?.[0]?.url || null,
        })),
        itemsPrice: order.itemsPrice,
        shippingPrice: order.shippingPrice,
        discountedAmount: order.discountedAmount || 0,
        totalPrice: order.totalPrice,
        shipTo: {
            city: order.shippingInfo?.city || null,
            state: order.shippingInfo?.state || null,
            pinCode: order.shippingInfo?.pinCode || null,
        },
        isGuest: Boolean(order.guest?.email && !order.user),
    };
};

module.exports = {
    normalizeEmail,
    signOrderViewToken,
    verifyOrderViewToken,
    trackingLink,
    orderContact,
    trackingView,
};
