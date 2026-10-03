const FraudAlert = require('../models/FraudAlert');
const Transaction = require('../models/Transaction');
const Investigation = require('../models/Investigation');
const { logAudit } = require('../middleware/auditLogger');
const { reversePostedEntry } = require('../services/ledger');

// @desc    Get Fraud Detection dashboard metrics & alert table
// @route   GET /api/fraud/alerts
const getFraudAlerts = async (req, res) => {
  try {
    const { status, riskLevel, detectionType, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (riskLevel) query.riskLevel = riskLevel;
    if (detectionType) query.detectionType = detectionType;
    if (search) {
      query.$or = [
        { alertId: { $regex: search, $options: 'i' } },
        { txnId: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } },
        { detectionType: { $regex: search, $options: 'i' } },
      ];
    }

    const alerts = await FraudAlert.find(query).sort({ riskScore: -1, detectionDate: -1 });

    // Aggregate key KPI card metrics
    const allAlerts = await FraudAlert.find();
    const stats = {
      totalAlerts: allAlerts.length,
      criticalAlerts: allAlerts.filter((a) => a.riskLevel === 'Critical').length,
      highRiskAlerts: allAlerts.filter((a) => a.riskLevel === 'High').length,
      mediumRiskAlerts: allAlerts.filter((a) => a.riskLevel === 'Medium').length,
      underReviewAlerts: allAlerts.filter((a) => a.status === 'Under Review').length,
      confirmedCases: allAlerts.filter((a) => a.status === 'Confirmed Fraud').length,
      totalRiskExposure: allAlerts
        .filter((a) => ['New', 'Under Review', 'Escalated'].includes(a.status))
        .reduce((sum, a) => sum + a.amount, 0),
    };

    res.json({ success: true, stats, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single alert with transaction details
// @route   GET /api/fraud/alerts/:id
const getFraudAlertById = async (req, res) => {
  try {
    const alert = await FraudAlert.findById(req.params.id).populate('transactionRef');
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Fraud alert not found' });
    }

    const relatedTransactions = await Transaction.find({
      $or: [
        { txnId: { $in: alert.relatedTransactionIds } },
        { vendorName: alert.entityName, vendorName: { $ne: '' } },
        { employeeName: alert.entityName, employeeName: { $ne: '' } },
      ],
    }).limit(6);

    res.json({ success: true, data: alert, relatedTransactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update alert status (e.g. Under Review, Confirmed Fraud, False Positive, Resolved)
// @route   PATCH /api/fraud/alerts/:id/status
const updateAlertStatus = async (req, res) => {
  try {
    const { status, resolutionNotes = '' } = req.body;
    const alert = await FraudAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const prevStatus = alert.status;
    alert.status = status;
    if (resolutionNotes) alert.resolutionNotes = resolutionNotes;
    await alert.save();

    // If marked Confirmed Fraud or False Positive, sync linked transaction status
    if (alert.txnId) {
      const txn = await Transaction.findOne({ txnId: alert.txnId });
      if (txn) {
        if (status === 'Confirmed Fraud') await reversePostedEntry(req, txn);
        else if (status === 'False Positive') txn.status = 'completed';
        else if (status === 'Under Review') txn.status = 'under_review';
        if (status !== 'Confirmed Fraud') await txn.save();
      }
    }

    await logAudit({
      req,
      action: 'Fraud Alert Status Updated',
      module: 'Fraud Detection',
      recordId: alert.alertId,
      recordType: 'FraudAlert',
      previousValue: { status: prevStatus },
      newValue: { status: alert.status, resolutionNotes },
      details: `Updated alert ${alert.alertId} to ${alert.status}`,
    });

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Promote Fraud Alert to an active Investigation Case
// @route   POST /api/fraud/alerts/:id/investigate
const createInvestigationFromAlert = async (req, res) => {
  try {
    const alert = await FraudAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const count = await Investigation.countDocuments();
    const caseId = `CASE-${new Date().getFullYear()}-${String(100 + count + 1)}`;

    const investigation = await Investigation.create({
      caseId,
      title: `Suspected ${alert.detectionType}: ${alert.entityName} ($${alert.amount.toLocaleString()})`,
      fraudAlertRef: alert._id,
      transactionRef: alert.transactionRef,
      txnId: alert.txnId,
      entityType: alert.entityType,
      entityName: alert.entityName,
      amountExposed: alert.amount,
      riskScore: alert.riskScore,
      riskLevel: alert.riskLevel,
      status: 'Open',
      priority: alert.riskLevel === 'Critical' ? 'Critical' : 'High',
      assignedInvestigator: req.user?.name || 'Elena Rostova (Lead Fraud Analyst)',
      investigatorEmail: req.user?.email || 'elena.rostova@finguard.internal',
      caseSummary: `Automated detection triggered by ${alert.detectionType} indicator. Total capital at risk: $${alert.amount.toLocaleString()}. Discovered on ${new Date(alert.detectionDate).toLocaleDateString()}.`,
      aiAnalysisSummary: `FinGuard Neural Engine calculated a multi-signal risk rating of ${alert.riskScore}/100. Primary flags: ${alert.reasons.join('; ')}.`,
      detectedFactors: alert.reasons,
      recommendedReview: alert.recommendedAction,
      timeline: [
        {
          date: alert.detectionDate,
          title: 'Algorithmic Anomaly Flagged',
          description: `Disbursement flagged as ${alert.detectionType} with Risk Score ${alert.riskScore}/100.`,
          user: 'FinGuard AI Engine',
          icon: 'alert-triangle',
        },
        {
          date: new Date(),
          title: 'Investigation Case Initiated',
          description: `Case escalated by ${req.user?.name || 'Analyst'} for detailed forensic scrutiny.`,
          user: req.user?.name || 'Elena Rostova',
          icon: 'shield',
        },
      ],
      evidence: alert.evidence.map((ev, i) => ({
        id: `EV-${i + 1}`,
        title: `Algorithmic Evidence #${i + 1}`,
        type: 'Log',
        notes: ev,
      })),
      investigatorNotes: [
        {
          author: req.user?.name || 'Elena Rostova',
          role: req.user?.role || 'Fraud Analyst',
          text: `Case opened. Notified treasury to pause automated batch clearing for ${alert.entityName}.`,
          createdAt: new Date(),
        },
      ],
      auditTrail: [
        {
          action: 'Case Created',
          user: req.user?.name || 'System Operator',
          timestamp: new Date(),
          details: `Promoted from Alert ${alert.alertId}`,
        },
      ],
    });

    alert.status = 'Escalated';
    alert.investigationRef = investigation._id;
    await alert.save();

    await logAudit({
      req,
      action: 'Investigation Case Opened',
      module: 'Investigations',
      recordId: investigation.caseId,
      recordType: 'Investigation',
      newValue: { caseId: investigation.caseId, alertId: alert.alertId, riskScore: investigation.riskScore },
      details: `Created investigation case ${investigation.caseId} from alert ${alert.alertId}`,
    });

    res.status(201).json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFraudAlerts,
  getFraudAlertById,
  updateAlertStatus,
  createInvestigationFromAlert,
};
