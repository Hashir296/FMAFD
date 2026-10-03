const mongoose = require('mongoose');

const invoiceLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ['receivable', 'payable'], required: true },
    customerRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, default: '' },
    vendorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorName: { type: String, default: '' },
    department: { type: String, default: 'Finance' },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    items: [invoiceLineItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'disputed', 'void'],
      default: 'sent',
    },
    riskScore: { type: Number, default: 10 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
    riskFactors: [{ type: String }],
    paymentTerms: { type: String, default: 'Net 30' },
    paymentHistory: [
      {
        paymentDate: { type: Date, default: Date.now },
        amount: { type: Number },
        method: { type: String },
        reference: { type: String },
      },
    ],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
