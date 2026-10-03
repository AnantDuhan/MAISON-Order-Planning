const express = require('express');
const { isAuthUser, authRoles } = require('../middleware/auth');
const { getAuditLog, getAuditActions } = require('../controllers/audit');

const router = express.Router();

router.get('/admin/audit-log', isAuthUser, authRoles('admin'), getAuditLog);
router.get('/admin/audit-log/actions', isAuthUser, authRoles('admin'), getAuditActions);

module.exports = router;
