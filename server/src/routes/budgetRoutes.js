const express = require('express');
const router = express.Router();
const { getBudgets, createBudget, updateBudget, deleteBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getBudgets);
router.post('/', authorize('Super Admin', 'Finance Manager', 'Department Manager'), createBudget);
router.put('/:id', authorize('Super Admin', 'Finance Manager'), updateBudget);
router.delete('/:id', authorize('Super Admin', 'Finance Manager'), deleteBudget);

module.exports = router;
