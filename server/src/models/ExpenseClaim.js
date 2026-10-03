const mongoose = require('mongoose');

const expenseClaimSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, unique: true },
    employeeName: { type: String, required: true },
    department: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    vendorName: { type: String, default: '' },
    amount: { type: Number, required: true },
    receiptNote: { type: String, default: '' },
    status: { type: String, enum: ['Submitted', 'Approved', 'Rejected', 'Posted'], default: 'Submitted' },
    reviewedBy: { type: String, default: '' },
    reviewNote: { type: String, default: '' },
    txnId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExpenseClaim', expenseClaimSchema);
