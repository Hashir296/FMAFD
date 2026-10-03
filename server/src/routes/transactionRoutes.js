const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransactionStats,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  categorizeTransaction,
  attachReceipt,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getTransactions);
router.get('/stats', getTransactionStats);
router.get('/:id', getTransactionById);
router.post('/', authorize('Super Admin', 'Finance Manager', 'Accountant', 'Department Manager'), createTransaction);
router.put('/:id', authorize('Super Admin', 'Finance Manager', 'Accountant'), updateTransaction);
router.delete('/:id', authorize('Super Admin', 'Finance Manager'), deleteTransaction);
router.patch('/:id/categorize', categorizeTransaction);
router.patch('/:id/receipt', attachReceipt);

module.exports = router;
