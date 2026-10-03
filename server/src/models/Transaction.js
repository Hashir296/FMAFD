const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    txnId: { type: String, required: true, unique: true },
    date: { type: Date, required: true, default: Date.now },
    type: { type: String, enum: ['income', 'expense', 'transfer', 'refund'], required: true },
    category: { type: String, required: true },
    subcategory: { type: String, default: '' },
    description: { type: String, required: true },
    department: { type: String, required: true },
    employeeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: { type: String, default: '' },
    vendorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorName: { type: String, default: '' },
    customerRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, default: '' },
    bankAccountRef: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    bankAccountName: { type: String, default: 'Primary Operating (Chase)' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paymentMethod: {
      type: String,
      enum: ['ACH', 'Wire Transfer', 'Corporate Card', 'Check', 'Virtual Card', 'Direct Deposit'],
      default: 'ACH',
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'flagged', 'under_review', 'rejected'],
      default: 'completed',
    },
    reversed: { type: Boolean, default: false },
    isAnomaly: { type: Boolean, default: false },
    riskScore: { type: Number, default: 8 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
    riskFactors: [{ type: String }],
    detectionTypes: [{ type: String }],
    evidence: [{ type: String }],
    recommendedAction: { type: String, default: '' },
    invoiceRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceNumber: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: ['None', 'Weekly', 'Monthly', 'Quarterly', 'Annual'], default: 'None' },
    auditTrail: [
      {
        action: { type: String },
        performedBy: { type: String, default: 'System' },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for fast enterprise search and filtering
transactionSchema.index({ date: -1 });
transactionSchema.index({ department: 1, category: 1 });
transactionSchema.index({ riskScore: -1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
