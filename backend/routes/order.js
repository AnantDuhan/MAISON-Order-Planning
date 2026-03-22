const express = require('express');
const {
   newOrder,
   getSingleOrder,
   myOrders,
   getAllOrders,
   updateOrder,
   deleteOrder,
   reorder,
} = require('../controllers/order');
const router = express.Router();

const { isAuthUser, authRoles } = require('../middleware/auth');
const { requestReturn, getAllReturns } = require('../controllers/return');
const { initiateRefund, updateRefundStatus, getAllRefunds } = require('../controllers/refund');

router.route('/order/new').post(isAuthUser, newOrder);

router.route('/order/:id').get(isAuthUser, getSingleOrder);

router.route('/orders/me').get(isAuthUser, myOrders);

router.route('/order/:id/return').post(isAuthUser, requestReturn);

router.route('/admin/orders').get(isAuthUser, authRoles('admin'), getAllOrders);

router
    .route('/admin/order/:id')
    .put(isAuthUser, authRoles('admin'), updateOrder)
    .delete(isAuthUser, authRoles('admin'), deleteOrder);

router
    .route('/admin/order/:id/refund')
    .post(isAuthUser, authRoles('admin'), initiateRefund);

router.route('/admin/order/:orderId/refund/:refundId/status').patch(isAuthUser, authRoles('admin'), updateRefundStatus);

router.route('/reorder').post(isAuthUser, reorder);

router.route('/admin/returns').get(isAuthUser, authRoles('admin'), getAllReturns);

router.route('/admin/refunds').get(isAuthUser, authRoles('admin'), getAllRefunds);

module.exports = router;
