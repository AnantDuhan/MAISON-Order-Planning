const express = require('express');
const {
   newOrder,
   getSingleOrder,
   myOrders,
   getAllOrders,
   updateOrder,
   deleteOrder,
   reorder,
   addTrackingEvent,
   updateShipment,
   packingSlip,
   courierWebhook,
} = require('../controllers/order');
const router = express.Router();

const { isAuthUser, authRoles } = require('../middleware/auth');
const demoGuard = require('../middleware/demoGuard');
const { requestReturn, getAllReturns, updateReturnStatus } = require('../controllers/return');
const { initiateRefund, updateRefundStatus, getAllRefunds } = require('../controllers/refund');

router.route('/order/new').post(isAuthUser, demoGuard('place-order'), newOrder);

router.route('/order/:id').get(isAuthUser, getSingleOrder);

router.route('/orders/me').get(isAuthUser, myOrders);

router.route('/order/:id/return').post(isAuthUser, demoGuard('place-order'), requestReturn);

router.route('/admin/orders').get(isAuthUser, authRoles('admin'), getAllOrders);

router
    .route('/admin/order/:id')
    .put(isAuthUser, authRoles('admin'), updateOrder)
    .delete(isAuthUser, authRoles('admin'), deleteOrder);

router.route('/admin/order/:id/tracking').post(isAuthUser, authRoles('admin'), addTrackingEvent);
router.route('/admin/order/:id/shipment').patch(isAuthUser, authRoles('admin'), updateShipment);
router.route('/admin/order/:id/packing-slip').get(isAuthUser, authRoles('admin'), packingSlip);

// Courier tracking webhook. The path avoids words Shiprocket rejects in
// webhook URLs ("shiprocket", "sr", "kr").
router.route('/logistics/track-updates').post(courierWebhook);

router
    .route('/admin/order/:id/refund')
    .post(isAuthUser, authRoles('admin'), initiateRefund);

router.route('/admin/order/:orderId/refund/:refundId/status').patch(isAuthUser, authRoles('admin'), updateRefundStatus);

router.route('/order/reorder/:orderId').post(isAuthUser, demoGuard('place-order'), reorder);

router.route('/admin/returns').get(isAuthUser, authRoles('admin'), getAllReturns);

router.route('/admin/return/:id/status').patch(isAuthUser, authRoles('admin'), updateReturnStatus);

router.route('/admin/refunds').get(isAuthUser, authRoles('admin'), getAllRefunds);

module.exports = router;
