const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', authorize('Super Admin', 'Finance Manager', 'Fraud Analyst'), getAuditLogs);

module.exports = router;
