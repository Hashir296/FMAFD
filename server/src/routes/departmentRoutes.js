const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment } = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.get('/', authorize('Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Department Manager'), getDepartments);
router.post('/', authorize('Owner', 'Super Admin', 'Finance Manager'), createDepartment);

module.exports = router;
