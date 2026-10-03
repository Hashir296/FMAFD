const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    departmentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    category: { type: String, default: 'Overall Operations' },
    fiscalYear: { type: Number, required: true, default: 2026 },
    quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'], default: 'Q3' },
    allocatedAmount: { type: Number, required: true },
    actualSpent: { type: Number, default: 0 },
    committedAmount: { type: Number, default: 0 },
    alertThresholdPercent: { type: Number, default: 85 },
    status: { type: String, enum: ['Healthy', 'Near Limit', 'Over Budget'], default: 'Healthy' },
    notes: { type: String, default: '' },
    monthlyAllocations: [
      {
        month: { type: String },
        allocated: { type: Number },
        spent: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

// Virtual for remaining amount and utilization %
budgetSchema.virtual('remainingAmount').get(function () {
  return this.allocatedAmount - this.actualSpent;
});

budgetSchema.virtual('utilizationPercent').get(function () {
  if (!this.allocatedAmount || this.allocatedAmount === 0) return 0;
  return Math.round((this.actualSpent / this.allocatedAmount) * 100);
});

budgetSchema.set('toJSON', { virtuals: true });
budgetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Budget', budgetSchema);
