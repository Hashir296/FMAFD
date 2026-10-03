const express = require('express');
const router = express.Router();
const { getFinanceOverview, getRecurringTransactions, getGeneralLedger, runRecurring } = require('../controllers/financeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Department Manager', 'Fraud Analyst'));

router.get('/overview', getFinanceOverview);
router.get('/recurring', getRecurringTransactions);
router.post('/recurring/:id/run', authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant'), runRecurring);
router.get('/ledger', getGeneralLedger);

module.exports = router;
