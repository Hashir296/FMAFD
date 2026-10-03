const express = require('express');
const router = express.Router();
const { getCustomers, createCustomer } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.get('/', authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant'), getCustomers);
router.post('/', authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant'), createCustomer);

module.exports = router;
