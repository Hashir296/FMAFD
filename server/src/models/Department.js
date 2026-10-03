const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    managerName: { type: String, required: true },
    managerEmail: { type: String, required: true },
    allocatedBudget: { type: Number, required: true, default: 0 },
    currentSpend: { type: Number, default: 0 },
    riskExposure: { type: Number, default: 0 },
    headcount: { type: Number, default: 1 },
    status: { type: String, enum: ['Active', 'Review', 'Archived'], default: 'Active' },
    color: { type: String, default: '#3B82F6' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
