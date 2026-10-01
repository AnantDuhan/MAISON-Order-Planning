const express = require('express');
const { isAuthUser } = require('../middleware/auth');
const { invoiceVerifyLimiter } = require('../middleware/rateLimiter');
const {
    myInvoices,
    downloadInvoice,
    downloadOrderInvoice,
    verifyInvoice,
} = require('../controllers/invoice');

const router = express.Router();

// Public: anyone holding the invoice (customer, bank, reseller) can verify it.
router.get('/invoice/verify/:ref', invoiceVerifyLimiter, verifyInvoice);

router.get('/invoices/me', isAuthUser, myInvoices);
router.get('/invoice/:id/download', isAuthUser, downloadInvoice);
router.get('/order/:id/invoice', isAuthUser, downloadOrderInvoice);

module.exports = router;
