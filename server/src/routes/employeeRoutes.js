const express = require('express');
const router = express.Router();
const { getEmployees, getEmployeeById, createEmployee, updateEmployee, runPayroll } = require('../controllers/employeeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize('Owner', 'Super Admin', 'Finance Manager', 'Department Manager', 'Fraud Analyst'));

router.get('/', getEmployees);
router.post('/payroll', authorize('Owner', 'Super Admin', 'Finance Manager'), runPayroll);
router.post('/', authorize('Owner', 'Super Admin', 'Finance Manager'), createEmployee);
router.get('/:id', getEmployeeById);
router.put('/:id', authorize('Owner', 'Super Admin', 'Finance Manager'), updateEmployee);

module.exports = router;
