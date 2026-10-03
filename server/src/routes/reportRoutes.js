const express = require('express');
const router = express.Router();
const { getReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager'));

router.get('/:reportType', getReport);

module.exports = router;
