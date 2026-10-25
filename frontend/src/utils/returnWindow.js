// Mirrors backend/utils/returnWindow.js — the server enforces it; this only explains it.
export const RETURN_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const deliveredAt = order => {
    if (order?.DeliveredAt) return new Date(order.DeliveredAt);
    const event = (order?.shipment?.events || []).filter(e => e?.status === 'Delivered').pop();
    return event?.at ? new Date(event.at) : null;
};

/** Last moment a return can be requested, or null when the delivery time is unknown. */
export const returnDeadline = order => {
    const delivered = deliveredAt(order);
    return delivered ? new Date(delivered.getTime() + RETURN_WINDOW_DAYS * DAY_MS) : null;
};

export const isWithinReturnWindow = (order, now = new Date()) => {
    const deadline = returnDeadline(order);
    return !deadline || now <= deadline;
};

export const formatDeadline = date => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
