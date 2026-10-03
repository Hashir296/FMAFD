const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  listUsers,
  createStaffUser,
  updateStaffUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/profile', protect, getUserProfile);
router.patch('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

router.get('/users', protect, authorize('Owner', 'Super Admin'), listUsers);
router.post('/users', protect, authorize('Owner', 'Super Admin'), createStaffUser);
router.patch('/users/:id', protect, authorize('Owner', 'Super Admin'), updateStaffUser);

module.exports = router;
