// Mirrors backend/utils/returnWindow.js — the server enforces it; this only explains it.
export const RETURN_WINDOW_DAYS = 7;
export const MEMBER_RETURN_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Return window for this order, in days (longer for orders placed as a member). */
export const windowDaysFor = order => (order?.memberTier ? MEMBER_RETURN_WINDOW_DAYS : RETURN_WINDOW_DAYS);

const deliveredAt = order => {
    if (order?.DeliveredAt) return new Date(order.DeliveredAt);
    const event = (order?.shipment?.events || []).filter(e => e?.status === 'Delivered').pop();
    return event?.at ? new Date(event.at) : null;
};

/** Last moment a return can be requested, or null when the delivery time is unknown. */
export const returnDeadline = order => {
    const delivered = deliveredAt(order);
    return delivered ? new Date(delivered.getTime() + windowDaysFor(order) * DAY_MS) : null;
};

export const isWithinReturnWindow = (order, now = new Date()) => {
    const deadline = returnDeadline(order);
    return !deadline || now <= deadline;
};

export const formatDeadline = date => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
