const express = require('express');
const router = express.Router();
const { getBankAccounts, createBankAccount, transferBetweenAccounts, reconcileAccount } = require('../controllers/bankAccountController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getBankAccounts);
router.post('/', authorize('Owner', 'Super Admin', 'Finance Manager'), createBankAccount);
router.post('/transfer', authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant'), transferBetweenAccounts);
router.post('/:id/reconcile', authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant'), reconcileAccount);

module.exports = router;
