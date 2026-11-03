const express = require('express');
const {
   newOrder,
   newGuestOrder,
   getSingleOrder,
   myOrders,
   getAllOrders,
   updateOrder,
   deleteOrder,
   reorder,
   addTrackingEvent,
   updateShipment,
   packingSlip,
} = require('../controllers/order');
const { requireFeature } = require('../services/featureFlags');
const router = express.Router();

const { isAuthUser, authRoles } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');
const { trackLimiter } = require('../middleware/rateLimiter');
const { requestReturn, getAllReturns, updateReturnStatus } = require('../controllers/return');
const { initiateRefund, updateRefundStatus, getAllRefunds } = require('../controllers/refund');
const { lookupOrder, getTrackedOrder } = require('../controllers/tracking');

// Public tracking: no sign-in, so it works for guests and from email links.
router.route('/order/track').post(trackLimiter, lookupOrder);
router.route('/order/track/:id').get(trackLimiter, getTrackedOrder);

router.route('/order/new').post(isAuthUser, demoGuard('place-order'), newOrder);
// Guest checkout: authorised by the signed guest token, not a session. Not
// behind the checkout switches: a guest who has paid must still get an order.
router.route('/order/guest/new').post(newGuestOrder);

router.route('/order/:id').get(isAuthUser, getSingleOrder);

router.route('/orders/me').get(isAuthUser, myOrders);

router.route('/order/:id/return').post(isAuthUser, requireFeature('returns'), demoGuard('place-order'), requestReturn);

router.route('/admin/orders').get(isAuthUser, authRoles('admin'), getAllOrders);

router
    .route('/admin/order/:id')
    .put(isAuthUser, authRoles('admin'), updateOrder)
    .delete(isAuthUser, authRoles('admin'), deleteOrder);

router.route('/admin/order/:id/tracking').post(isAuthUser, authRoles('admin'), addTrackingEvent);
router.route('/admin/order/:id/shipment').patch(isAuthUser, authRoles('admin'), updateShipment);
router.route('/admin/order/:id/packing-slip').get(isAuthUser, authRoles('admin'), packingSlip);

router
    .route('/admin/order/:id/refund')
    .post(isAuthUser, authRoles('admin'), initiateRefund);

router.route('/admin/order/:orderId/refund/:refundId/status').patch(isAuthUser, authRoles('admin'), updateRefundStatus);

router.route('/order/reorder/:orderId').post(isAuthUser, demoGuard('place-order'), reorder);

router.route('/admin/returns').get(isAuthUser, authRoles('admin'), getAllReturns);

router.route('/admin/return/:id/status').patch(isAuthUser, authRoles('admin'), updateReturnStatus);

router.route('/admin/refunds').get(isAuthUser, authRoles('admin'), getAllRefunds);

module.exports = router;
