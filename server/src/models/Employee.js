const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    role: { type: String, required: true },
    jobTitle: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    salary: { type: Number, default: 0 },
    avatar: { type: String, default: '' },
    monthlySpendLimit: { type: Number, default: 5000 },
    currentMonthSpend: { type: Number, default: 0 },
    totalClaimsCount: { type: Number, default: 0 },
    averageClaimAmount: { type: Number, default: 0 },
    riskScore: { type: Number, default: 12 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
    status: { type: String, enum: ['Active', 'On Leave', 'Terminated'], default: 'Active' },
    joinedDate: { type: Date, default: Date.now },
    flags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
