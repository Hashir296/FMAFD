const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    vendorId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, default: '' },
    address: { type: String, default: '' },
    bankAccount: { type: String, default: '' },
    bankRouting: { type: String, default: '' },
    bankName: { type: String, default: '' },
    taxId: { type: String, default: '' },
    paymentTerms: { type: String, default: 'Net 30' },
    totalSpending: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    avgTransaction: { type: Number, default: 0 },
    riskScore: { type: Number, default: 15 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
    status: { type: String, enum: ['Active', 'Under Review', 'Flagged', 'Blocked'], default: 'Active' },
    accountDetailsLastModified: { type: Date, default: Date.now },
    historicalBaselineSpend: { type: Number, default: 0 },
    recentSpendSpikeRatio: { type: Number, default: 1.0 },
    hasDuplicateInvoices: { type: Boolean, default: false },
    riskFactors: [{ type: String }],
    aiVendorSummary: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);
