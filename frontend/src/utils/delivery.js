// Keep in step with backend/controllers/order.js (DELIVERY_ESTIMATE_DAYS)
// and backend/utils/orderPricing.js (free-shipping threshold and charge).
export const DELIVERY_ESTIMATE_DAYS = 5;
export const FREE_SHIPPING_THRESHOLD = 1000;
export const SHIPPING_CHARGE = 150;

/** "Fri, 30 Oct" — the same estimate the order confirmation will show. */
export const estimatedDeliveryLabel = (from = new Date()) => {
    const d = new Date(from);
    d.setDate(d.getDate() + DELIVERY_ESTIMATE_DAYS);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
