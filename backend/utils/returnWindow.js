// Customers can request a return for this many days after delivery.
// Mirrored in frontend/src/utils/returnWindow.js and stated in the Refunds policy.
const RETURN_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** When the order was delivered: DeliveredAt, else the courier's Delivered event. */
const deliveredAt = order => {
    if (order?.DeliveredAt) return new Date(order.DeliveredAt);
    const event = (order?.shipment?.events || []).filter(e => e?.status === 'Delivered').pop();
    return event?.at ? new Date(event.at) : null;
};

/** Last moment a return can be requested, or null when the delivery time is unknown. */
const returnDeadline = order => {
    const delivered = deliveredAt(order);
    return delivered ? new Date(delivered.getTime() + RETURN_WINDOW_DAYS * DAY_MS) : null;
};

/**
 * Orders delivered before delivery times were recorded have no deadline; they
 * stay returnable rather than being refused for missing data.
 */
const isWithinReturnWindow = (order, now = new Date()) => {
    const deadline = returnDeadline(order);
    return !deadline || now <= deadline;
};

module.exports = { RETURN_WINDOW_DAYS, deliveredAt, returnDeadline, isWithinReturnWindow };
