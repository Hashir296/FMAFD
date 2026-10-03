const mongoose = require('mongoose');

const investigationSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    fraudAlertRef: { type: mongoose.Schema.Types.ObjectId, ref: 'FraudAlert' },
    transactionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    txnId: { type: String, required: true },
    entityType: { type: String, enum: ['Vendor', 'Employee', 'Customer', 'Account'], required: true },
    entityName: { type: String, required: true },
    amountExposed: { type: Number, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
    status: {
      type: String,
      enum: ['Open', 'Under Review', 'Pending Evidence', 'Confirmed Fraud', 'False Positive', 'Closed'],
      default: 'Open',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'High' },
    assignedInvestigator: { type: String, default: 'Elena Rostova (Lead Fraud Analyst)' },
    investigatorEmail: { type: String, default: 'elena.rostova@finguard.internal' },
    caseSummary: { type: String, required: true },
    aiAnalysisSummary: { type: String, required: true },
    detectedFactors: [{ type: String }],
    recommendedReview: { type: String, required: true },
    relatedTransactions: [
      {
        txnId: { type: String },
        date: { type: Date },
        amount: { type: Number },
        type: { type: String },
        status: { type: String },
        riskScore: { type: Number },
        similarityFactor: { type: String },
      },
    ],
    timeline: [
      {
        date: { type: Date, default: Date.now },
        title: { type: String, required: true },
        description: { type: String, required: true },
        user: { type: String, default: 'System' },
        icon: { type: String, default: 'alert' },
      },
    ],
    evidence: [
      {
        id: { type: String },
        title: { type: String, required: true },
        type: { type: String, enum: ['Document', 'Log', 'Bank Hash', 'IP Match', 'Email Chain', 'Comparison'], default: 'Document' },
        url: { type: String, default: '' },
        addedAt: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
    investigatorNotes: [
      {
        author: { type: String, required: true },
        role: { type: String, default: 'Fraud Analyst' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    auditTrail: [
      {
        action: { type: String, required: true },
        user: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Investigation', investigationSchema);
