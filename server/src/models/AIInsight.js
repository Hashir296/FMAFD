const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['financial', 'risk', 'forecast', 'budget', 'vendor', 'anomaly'],
      required: true,
    },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    severity: { type: String, enum: ['Info', 'Positive', 'Warning', 'Critical'], default: 'Info' },
    score: { type: Number, default: 75 },
    impact: { type: String, default: 'Medium' },
    dollarImpact: { type: Number, default: 0 },
    evidence: [{ type: String }],
    recommendedAction: { type: String, default: '' },
    isAcknowledged: { type: Boolean, default: false },
    actionRoute: { type: String, default: '/transactions' },
    dataPoints: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIInsight', aiInsightSchema);
