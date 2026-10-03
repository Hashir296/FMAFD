const mongoose = require('mongoose');

const financialReportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ['Profit & Loss', 'Balance Sheet', 'Cash Flow', 'Revenue', 'Expenses', 'Budget Variance', 'Risk Exposure', 'Vendor Risk'],
      required: true,
    },
    title: { type: String, required: true },
    period: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    generatedBy: { type: String, default: 'FinGuard Core AI' },
    summary: { type: String, required: true },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    dataRows: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinancialReport', financialReportSchema);
