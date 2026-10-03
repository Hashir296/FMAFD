const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    module: {
      type: String,
      enum: ['Transactions', 'Finance', 'Invoices', 'Budgets', 'Vendors', 'Employees', 'Fraud Detection', 'Investigations', 'Settings', 'Auth'],
      required: true,
    },
    recordId: { type: String, required: true },
    recordType: { type: String, required: true },
    ipAddress: { type: String, default: '192.168.1.104' },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ module: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
