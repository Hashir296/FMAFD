const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true },
    transactionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    txnId: { type: String, required: true },
    entityType: { type: String, enum: ['Vendor', 'Employee', 'Customer', 'Transaction'], required: true },
    entityId: { type: String, default: '' },
    entityName: { type: String, required: true },
    amount: { type: Number, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
    detectionType: {
      type: String,
      enum: [
        'Duplicate Payment',
        'Unusual Amount',
        'Unusual Time',
        'Spending Spike',
        'Split Transaction',
        'Suspicious Vendor',
        'Invoice Anomaly',
        'Abnormal Refund',
        'Repeated Payment',
        'Behavioral Anomaly',
      ],
      required: true,
    },
    detectionDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['New', 'Under Review', 'Escalated', 'Confirmed Fraud', 'False Positive', 'Resolved'],
      default: 'New',
    },
    reasons: [{ type: String }],
    evidence: [{ type: String }],
    relatedTransactionIds: [{ type: String }],
    recommendedAction: { type: String, required: true },
    assignedTo: { type: String, default: 'Unassigned' },
    investigationRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Investigation' },
    resolutionNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

fraudAlertSchema.index({ riskScore: -1 });
fraudAlertSchema.index({ status: 1 });
fraudAlertSchema.index({ detectionDate: -1 });

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);
