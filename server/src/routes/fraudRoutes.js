const express = require('express');
const router = express.Router();
const {
  getFraudAlerts,
  getFraudAlertById,
  updateAlertStatus,
  createInvestigationFromAlert,
} = require('../controllers/fraudController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('Owner', 'Super Admin', 'Finance Manager', 'Fraud Analyst'));

router.get('/alerts', getFraudAlerts);
router.get('/alerts/:id', getFraudAlertById);
router.patch('/alerts/:id/status', authorize('Super Admin', 'Finance Manager', 'Fraud Analyst'), updateAlertStatus);
router.post('/alerts/:id/investigate', authorize('Super Admin', 'Finance Manager', 'Fraud Analyst'), createInvestigationFromAlert);

module.exports = router;
