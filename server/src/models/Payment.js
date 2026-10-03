const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, required: true, unique: true },
    invoiceRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceNumber: { type: String, default: '' },
    transactionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true, default: Date.now },
    method: { type: String, enum: ['ACH', 'Wire Transfer', 'Check', 'Card', 'Other'], default: 'ACH' },
    status: { type: String, enum: ['Success', 'Pending', 'Failed', 'Reversed'], default: 'Success' },
    reference: { type: String, default: '' },
    payer: { type: String, default: '' },
    payee: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
