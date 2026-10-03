const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema(
  {
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    accountType: { type: String, enum: ['Checking', 'Savings', 'Treasury', 'Payroll', 'Escrow'], default: 'Checking' },
    currency: { type: String, default: 'USD' },
    currentBalance: { type: Number, required: true, default: 0 },
    availableBalance: { type: Number, required: true, default: 0 },
    routingNumber: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Restricted', 'Dormant'], default: 'Active' },
    lastReconciliationDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BankAccount', bankAccountSchema);
