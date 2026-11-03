/**
 * Order fulfilment: Processing → Shipped → Delivered.
 *
 *   Processing ──admin──► Shipped ──admin / courier event──► Delivered
 *
 * Payment happens before an order exists, so there is no "unpaid" state.
 * Refunds and returns have their own lifecycles; they don't change this one.
 * Stock, shipment details and customer emails are handled by the callers
 * (controllers/order.js, services/shipmentService.js).
 */
const { defineLifecycle } = require('./stateMachine');

// A fixed, honest estimate. The old random 0-7 days could promise same-day delivery.
const DELIVERY_ESTIMATE_DAYS = 5;
const estimateDeliveryDate = (from = new Date()) => {
    const d = new Date(from);
    d.setDate(d.getDate() + DELIVERY_ESTIMATE_DAYS);
    return d;
};

const orderLifecycle = defineLifecycle({
    name: 'order',
    field: 'orderStatus',
    initial: 'Processing',
    states: {
        Processing: {
            to: {
                Shipped: { by: ['admin'] },
            },
        },
        Shipped: {
            enter: (order, { at }) => {
                order.estimatedDeliveryDate = order.estimatedDeliveryDate || estimateDeliveryDate(at);
            },
            to: {
                // By an admin, or by a 'Delivered' tracking event.
                Delivered: { by: ['admin', 'system'] },
            },
        },
        Delivered: {
            terminal: true,
            enter: (order, { at }) => {
                order.DeliveredAt = at;
                order.estimatedDeliveryDate = null;
            },
        },
    },
});

module.exports = { orderLifecycle, estimateDeliveryDate, DELIVERY_ESTIMATE_DAYS };
