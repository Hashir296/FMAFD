const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getReceivablesAging,
  getPayablesObligations,
  getInvoiceById,
  createInvoice,
  recordPayment,
  applyCredit,
  disputeInvoice,
  voidInvoice,
  releaseDispute,
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getInvoices);
router.get('/receivables/aging', getReceivablesAging);
router.get('/payables/obligations', getPayablesObligations);
router.get('/:id', getInvoiceById);
router.post('/', authorize('Super Admin', 'Finance Manager', 'Accountant'), createInvoice);
router.post('/:id/pay', authorize('Super Admin', 'Finance Manager', 'Accountant'), recordPayment);
router.post('/:id/credit', authorize('Super Admin', 'Finance Manager', 'Accountant'), applyCredit);
router.post('/:id/dispute', authorize('Super Admin', 'Finance Manager', 'Accountant'), disputeInvoice);
router.post('/:id/release', authorize('Super Admin', 'Finance Manager', 'Accountant'), releaseDispute);
router.post('/:id/void', authorize('Super Admin', 'Finance Manager', 'Accountant'), voidInvoice);

module.exports = router;
