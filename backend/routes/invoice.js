const express = require('express');
const { isAuthUser } = require('../middleware/auth');
const { myInvoices, downloadInvoice, downloadOrderInvoice } = require('../controllers/invoice');

const router = express.Router();

router.get('/invoices/me', isAuthUser, myInvoices);
router.get('/invoice/:id/download', isAuthUser, downloadInvoice);
router.get('/order/:id/invoice', isAuthUser, downloadOrderInvoice);

module.exports = router;
