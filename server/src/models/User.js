const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['Owner', 'Super Admin', 'Finance Manager', 'Accountant', 'Fraud Analyst', 'Department Manager', 'Employee'],
      default: 'Employee',
    },
    department: { type: String, default: 'Finance' },
    avatar: { type: String, default: '' },
    title: { type: String, default: '' },
    phone: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Suspended', 'Invited'], default: 'Active' },
    lastLogin: { type: Date, default: Date.now },
    preferences: {
      fraudAlerts: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
      budgetWarnings: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
