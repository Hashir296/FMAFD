const express = require('express');
const router = express.Router();
const {
  getBriefing,
  getInsights,
  getForecast,
  getAnomalies,
  chatAssistant,
  writeReview,
  explainAlert,
  scoreTransaction,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager'));

router.get('/briefing', getBriefing);
router.get('/insights', getInsights);
router.post('/generate-insights', getInsights);
router.get('/forecast', getForecast);
router.get('/anomalies', getAnomalies);
router.post('/assistant/chat', chatAssistant);
router.get('/review', writeReview);
router.post('/alerts/:id/explain', explainAlert);
router.post('/score-transaction', scoreTransaction);

module.exports = router;
