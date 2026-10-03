const express = require('express');
const router = express.Router();
const { getVendors, getVendorById, createVendor, updateVendor } = require('../controllers/vendorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/', getVendors);
router.get('/:id', getVendorById);
router.post('/', authorize('Super Admin', 'Finance Manager', 'Accountant'), createVendor);
router.put('/:id', authorize('Super Admin', 'Finance Manager'), updateVendor);

module.exports = router;
