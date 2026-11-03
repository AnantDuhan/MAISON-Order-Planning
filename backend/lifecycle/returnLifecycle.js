/**
 * A return request, from the customer asking to the money going back.
 *
 *   Pending ──admin──► Approved ──refund started──► Initiated ──refund done──► Completed
 *      │                  │                            │
 *      ├──admin──► Rejected ◄──admin──┘                └──refund rejected──► Approved
 *      └──refund started (approves it implicitly)──► Initiated
 *
 * "Initiated" means a refund is under way for this return (the stored value
 * predates this file; screens call it "Refund started"). Only the refund
 * lifecycle moves a return in or out of it, so a return can't be marked
 * Completed while no money has gone back.
 */
const { defineLifecycle } = require('./stateMachine');

const returnLifecycle = defineLifecycle({
    name: 'return',
    field: 'status',
    initial: 'Pending',
    states: {
        Pending: {
            label: 'Requested',
            to: {
                Approved: { by: ['admin'] },
                Rejected: { by: ['admin'] },
                // An admin may start the refund straight from a request.
                Initiated: { by: ['system'] },
            },
        },
        Approved: {
            enter: (ret, { at }) => {
                ret.approvedAt = ret.approvedAt || at;
                ret.resolvedAt = undefined;
            },
            to: {
                Rejected: { by: ['admin'] },
                Initiated: { by: ['system'] },
            },
        },
        Initiated: {
            label: 'Refund started',
            enter: (ret, { at }) => {
                ret.approvedAt = ret.approvedAt || at;
                ret.resolvedAt = at;
            },
            to: {
                Completed: { by: ['system'] },
                // The refund was rejected: back to approved, ready for another.
                Approved: { by: ['system'] },
            },
        },
        Rejected: {
            label: 'Declined',
            terminal: true,
            enter: (ret, { at }) => {
                ret.resolvedAt = at;
            },
        },
        Completed: {
            label: 'Refunded',
            terminal: true,
            enter: (ret, { at }) => {
                ret.resolvedAt = at;
            },
        },
    },
});

module.exports = { returnLifecycle };
