const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { logAudit } = require('../middleware/auditLogger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'finguard_super_secure_jwt_secret_fintech_2026_x89a', {
    expiresIn: '12h',
  });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  title: user.title,
  phone: user.phone,
  status: user.status,
  avatar: user.avatar,
  preferences: user.preferences,
  lastLogin: user.lastLogin,
});

const isOwnerRole = (role) => role === 'Owner' || role === 'Super Admin';

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Accounts are created by the company owner from Team.',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'This account is suspended. Ask the owner to restore access.' });
    }
    if (user && (await user.matchPassword(password))) {
      user.lastLogin = new Date();
      await user.save();

      await logAudit({
        req: { user, headers: req.headers, socket: req.socket },
        action: 'User Login',
        module: 'Auth',
        recordId: user._id,
        recordType: 'User',
        details: `Successful login by ${user.name} (${user.role})`,
      });

      res.json({
        success: true,
        token: generateToken(user._id),
        user: publicUser(user),
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Ask the company owner to reset a password. No fake reset token is issued.
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account uses that email.' });
    }
    res.json({
      success: true,
      message: 'Ask the company owner to set a new password from Team. This desk does not email reset links.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Ask the company owner to set a new password from Team.',
  });
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, phone, title, department, preferences } = req.body;
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (title !== undefined) user.title = title;
    if (department) user.department = department;
    if (preferences) {
      user.preferences = {
        fraudAlerts: preferences.fraudAlerts !== false,
        weeklyReports: preferences.weeklyReports !== false,
        budgetWarnings: preferences.budgetWarnings !== false,
      };
    }
    await user.save();
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }
    const user = await User.findById(req.user._id);
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ role: 1, name: 1 });
    res.json({ success: true, count: users.length, data: users.map(publicUser) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createStaffUser = async (req, res) => {
  try {
    const { name, email, password, role = 'Employee', department = 'General', title = '', phone = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'An account with this email already exists.' });

    const user = await User.create({ name, email, password, role, department, title, phone, status: 'Active' });
    await logAudit({
      req,
      action: 'Staff Account Created',
      module: 'Auth',
      recordId: user._id,
      recordType: 'User',
      newValue: { email: user.email, role: user.role },
      details: `${req.user.name} created ${user.name} as ${user.role}`,
    });
    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateStaffUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const previous = { role: user.role, status: user.status };
    const { role, status, department, title, phone, name, password } = req.body;

    if (String(user._id) === String(req.user._id) && status === 'Suspended') {
      return res.status(400).json({ success: false, message: 'You cannot suspend your own account.' });
    }
    if (name) user.name = name;
    if (role) user.role = role;
    if (status) user.status = status;
    if (department) user.department = department;
    if (title !== undefined) user.title = title;
    if (phone !== undefined) user.phone = phone;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }
      user.password = password;
    }
    await user.save();
    await logAudit({
      req,
      action: 'Staff Account Updated',
      module: 'Auth',
      recordId: user._id,
      recordType: 'User',
      previousValue: previous,
      newValue: { role: user.role, status: user.status },
      details: `${req.user.name} updated ${user.name}`,
    });
    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
  isOwnerRole,
};
