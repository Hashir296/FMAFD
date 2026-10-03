const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    company: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    creditLimit: { type: Number, default: 50000 },
    outstandingBalance: { type: Number, default: 0 },
    paymentTerms: { type: String, default: 'Net 30' },
    averageDaysToPay: { type: Number, default: 28 },
    riskScore: { type: Number, default: 10 },
    status: { type: String, enum: ['Active', 'Delinquent', 'On Hold'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
