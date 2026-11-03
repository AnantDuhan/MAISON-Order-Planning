/**
 * A refund for an order (always the whole order, to the original payment).
 *
 *   Initiated ──► Pending ──► Approved ──► Refunded
 *       │            │           │
 *       └────────────┴───────────┴──► Rejected
 *   (an admin may also jump straight to Refunded from any open state)
 *
 * Refunded and Rejected are final. What else changes when a refund moves
 * (stock, invoice, credit note, the return and the order's refund fields)
 * is in services/refundService.js.
 */
const { defineLifecycle } = require('./stateMachine');

const OPEN = ['Initiated', 'Pending', 'Approved'];

const refundLifecycle = defineLifecycle({
    name: 'refund',
    field: 'status',
    initial: 'Initiated',
    states: {
        Initiated: {
            to: {
                Pending: { by: ['admin'] },
                Approved: { by: ['admin'] },
                Rejected: { by: ['admin'] },
                Refunded: { by: ['admin'] },
            },
        },
        Pending: {
            to: {
                Approved: { by: ['admin'] },
                Rejected: { by: ['admin'] },
                Refunded: { by: ['admin'] },
            },
        },
        Approved: {
            to: {
                Rejected: { by: ['admin'] },
                Refunded: { by: ['admin'] },
            },
        },
        Rejected: { terminal: true },
        Refunded: {
            terminal: true,
            enter: (refund, { at }) => {
                refund.completedAt = at;
                // Refunds go back to the original payment method only.
                refund.method = 'original';
            },
        },
    },
});

module.exports = { refundLifecycle, OPEN_REFUND_STATES: OPEN };
