/**
 * Refunds, and what moves with them.
 *
 * The rules for which status can follow which live in lifecycle/; this file
 * is what happens around a move:
 *
 *   startRefund                 refund created (Initiated), returns → Initiated,
 *                               order.refundStatus = Processing
 *   moveRefund → Refunded       order refunded, stock back (once), invoice marked
 *                               refunded, credit note issued, returns → Completed
 *   moveRefund → Rejected       returns → Approved, so another refund can start
 *   moveRefund → other          order.refundStatus mirrors the refund
 */
const Return = require('../models/return');
const Refund = require('../models/refund');
const generateId = require('../utils/generateId');
const cache = require('../utils/cache');
const logger = require('../config/logger');
// Through the module objects so tests can stub them.
const invoiceService = require('./invoiceService');
const inventory = require('./inventoryService');
const { orderLifecycle } = require('../lifecycle/orderLifecycle');
const { returnLifecycle } = require('../lifecycle/returnLifecycle');
const { refundLifecycle, OPEN_REFUND_STATES } = require('../lifecycle/refundLifecycle');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const invalidate = order => cache.del(
    'refunds',
    'returns',
    'orders',
    `order:${order._id}`,
    `orders:${order.user}`,
    ...(order.orderItems || []).map(item => `product:${item.product}`)
).catch(() => {});

/** Restock goes through the inventory service so waiters are notified and low-stock flags reset. */
const restoreOrderStock = async (orderItems = []) => {
    await inventory.restoreStock(orderItems.map(item => ({
        product: String(item.product),
        ...(item.variant && { variant: String(item.variant) }),
        quantity: item.quantity,
    })));
};

/** Move this order's returns that can make `to` (as the system), and save them. */
const moveReturns = async (order, to, at) => {
    if (!order.return?.length) return [];
    const returns = await Return.find({ _id: { $in: order.return } });
    const moved = [];
    for (const ret of returns) {
        if (!returnLifecycle.can(ret, to, { by: 'system' })) continue;
        returnLifecycle.transition(ret, to, { by: 'system', at });
        await ret.save();
        moved.push(ret);
    }
    return moved;
};

/**
 * Start the (single, whole-order) refund for a delivered order with a return.
 * Mutates and saves `order`.
 * @throws {Error & {statusCode}} when the order can't be refunded now
 */
const startRefund = async (order, { at = new Date() } = {}) => {
    if (orderLifecycle.current(order) !== 'Delivered') {
        throw httpError(400, 'Order has not been delivered yet');
    }
    if (!order.return?.length) {
        throw httpError(400, 'No returns found for this order');
    }
    if (order.isRefunded || await Refund.exists({ order: order._id, status: { $in: OPEN_REFUND_STATES } })) {
        throw httpError(400, 'Order refund has already been initiated or processed');
    }

    const returns = await Return.find({ _id: { $in: order.return } });
    const eligible = returns.filter(ret => returnLifecycle.can(ret, 'Initiated', { by: 'system' }));
    if (!eligible.length) {
        throw httpError(400, 'No pending or approved return found for this order');
    }

    // ONE refund per order, for the whole order (the Refunds policy).
    const refund = new Refund({
        _id: generateId(),
        order: order._id,
        amount: order.totalPrice,
        initiatedAt: at,
        status: refundLifecycle.initial,
    });
    await refund.save();

    for (const ret of eligible) {
        returnLifecycle.transition(ret, 'Initiated', { by: 'system', at });
        await ret.save();
    }

    order.refund = [...(order.refund || []), refund._id];
    order.refundStatus = 'Processing';
    order.refundRequestedAt = at;
    // Status fields only; don't re-validate the whole historical order.
    await order.save({ validateBeforeSave: false });
    await invalidate(order);
    return refund;
};

/**
 * Move a refund (as an admin) and apply what follows. Asking for the status
 * it already has changes nothing and repeats no side effects.
 * @returns {Promise<{from: string, to: string, changed: boolean}>}
 * @throws {TransitionError | Error & {statusCode}}
 */
const moveRefund = async ({ order, refund, to, by = 'admin', at = new Date() }) => {
    // Older data: the order says refunded while its refund record lagged behind.
    if (order.isRefunded && to !== 'Refunded') {
        throw httpError(409, 'This order has already been refunded');
    }

    const move = refundLifecycle.transition(refund, to, { by, at });
    if (!move.changed) return move;

    if (to === 'Refunded') {
        order.isRefunded = true;
        order.refundedAt = order.refundedAt || at;
        // The refund covers the whole order, so every item goes back into
        // stock, but only if stock was taken out, and only once.
        const stockWasTaken = Boolean(order.stockCommittedAt)
            || ['Shipped', 'Delivered'].includes(orderLifecycle.current(order));
        if (stockWasTaken && !order.stockRestoredAt) {
            await restoreOrderStock(order.orderItems);
            order.stockRestoredAt = at;
        }
    }

    order.refundStatus = to;
    // Status fields only; don't re-validate the whole historical order.
    await order.save({ validateBeforeSave: false });
    await refund.save();

    if (to === 'Refunded') {
        await moveReturns(order, 'Completed', at);
        // The invoice stays genuine but now verifies as refunded, so it can't be
        // presented as proof of an open purchase (or used for a second refund).
        await invoiceService.setOrderInvoiceStatus(order._id, 'refunded').catch(error =>
            logger.error({ orderId: order._id, err: error.message }, 'could not mark invoice refunded'));
        // Credit note reversing the invoice, emailed to the customer.
        invoiceService.issueCreditNoteInBackground(order, refund, { refundMethod: refund.method || 'original' });
    } else if (to === 'Rejected') {
        await moveReturns(order, 'Approved', at);
    }

    await invalidate(order);
    return move;
};

module.exports = { startRefund, moveRefund, restoreOrderStock };
