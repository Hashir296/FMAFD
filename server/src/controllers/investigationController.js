const Investigation = require('../models/Investigation');
const Transaction = require('../models/Transaction');
const FraudAlert = require('../models/FraudAlert');
const { logAudit } = require('../middleware/auditLogger');
const { reversePostedEntry } = require('../services/ledger');

// @desc    Get all investigations
// @route   GET /api/investigations
const getInvestigations = async (req, res) => {
  try {
    const { status, riskLevel, priority, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (riskLevel) query.riskLevel = riskLevel;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { caseId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } },
        { txnId: { $regex: search, $options: 'i' } },
      ];
    }

    const cases = await Investigation.find(query).sort({ riskScore: -1, updatedAt: -1 });

    const stats = {
      total: cases.length,
      open: cases.filter((c) => c.status === 'Open').length,
      underReview: cases.filter((c) => c.status === 'Under Review').length,
      pendingEvidence: cases.filter((c) => c.status === 'Pending Evidence').length,
      confirmedFraud: cases.filter((c) => c.status === 'Confirmed Fraud').length,
      falsePositives: cases.filter((c) => c.status === 'False Positive').length,
      closed: cases.filter((c) => c.status === 'Closed').length,
    };

    res.json({ success: true, stats, count: cases.length, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single investigation case by ID
// @route   GET /api/investigations/:id
const getInvestigationById = async (req, res) => {
  try {
    const investigation = await Investigation.findById(req.params.id)
      .populate('fraudAlertRef')
      .populate('transactionRef');

    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Investigation case not found' });
    }

    // Find actual suspicious transaction
    const suspiciousTxn = await Transaction.findOne({ txnId: investigation.txnId });

    // Find related transactions for entity
    const relatedTxns = await Transaction.find({
      txnId: { $ne: investigation.txnId },
      $or: [
        { vendorName: investigation.entityName, vendorName: { $ne: '' } },
        { employeeName: investigation.entityName, employeeName: { $ne: '' } },
      ],
    }).limit(6);

    res.json({
      success: true,
      data: investigation,
      suspiciousTxn,
      relatedTxns,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update investigation status (e.g. Under Review, Request Evidence, False Positive, Confirm Case, Close)
// @route   PATCH /api/investigations/:id/status
const updateInvestigationStatus = async (req, res) => {
  try {
    const { status, resolutionNotes = '' } = req.body;
    const investigation = await Investigation.findById(req.params.id);
    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const prevStatus = investigation.status;
    investigation.status = status;

    investigation.timeline.push({
      date: new Date(),
      title: `Status Changed to ${status}`,
      description: resolutionNotes || `Investigation status updated by ${req.user?.name || 'Investigator'}.`,
      user: req.user?.name || 'Investigator',
      icon: status === 'Confirmed Fraud' ? 'x-circle' : status === 'False Positive' ? 'check-circle' : 'activity',
    });

    investigation.auditTrail.push({
      action: `Status Updated to ${status}`,
      user: req.user?.name || 'Investigator',
      timestamp: new Date(),
      details: resolutionNotes,
    });

    await investigation.save();

    // Sync linked Fraud Alert and Transaction
    if (investigation.fraudAlertRef) {
      const alert = await FraudAlert.findById(investigation.fraudAlertRef);
      if (alert) {
        if (status === 'Confirmed Fraud') alert.status = 'Confirmed Fraud';
        else if (status === 'False Positive') alert.status = 'False Positive';
        else if (status === 'Under Review') alert.status = 'Under Review';
        else if (status === 'Closed') alert.status = 'Resolved';
        await alert.save();
      }
    }

    if (investigation.txnId) {
      const txn = await Transaction.findOne({ txnId: investigation.txnId });
      if (txn) {
        if (status === 'Confirmed Fraud') await reversePostedEntry(req, txn);
        else if (status === 'False Positive') txn.status = 'completed';
        else if (status === 'Under Review') txn.status = 'under_review';
        if (status !== 'Confirmed Fraud') await txn.save();
      }
    }

    await logAudit({
      req,
      action: 'Investigation Status Modified',
      module: 'Investigations',
      recordId: investigation.caseId,
      recordType: 'Investigation',
      previousValue: { status: prevStatus },
      newValue: { status: investigation.status, notes: resolutionNotes },
      details: `Case ${investigation.caseId} moved from ${prevStatus} to ${status}`,
    });

    res.json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add investigator note to case
// @route   POST /api/investigations/:id/notes
const addInvestigatorNote = async (req, res) => {
  try {
    const { text } = req.body;
    const investigation = await Investigation.findById(req.params.id);
    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const note = {
      author: req.user?.name || 'Investigator',
      role: req.user?.role || 'Fraud Analyst',
      text,
      createdAt: new Date(),
    };

    investigation.investigatorNotes.push(note);

    investigation.timeline.push({
      date: new Date(),
      title: 'Investigator Note Appended',
      description: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
      user: req.user?.name || 'Investigator',
      icon: 'message-square',
    });

    await investigation.save();
    res.status(201).json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add evidence item to case
// @route   POST /api/investigations/:id/evidence
const addEvidence = async (req, res) => {
  try {
    const { title, type = 'Document', url = '', notes = '' } = req.body;
    const investigation = await Investigation.findById(req.params.id);
    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    investigation.evidence.push({
      id: `EV-${Date.now().toString().slice(-4)}`,
      title,
      type,
      url,
      addedAt: new Date(),
      notes,
    });

    investigation.timeline.push({
      date: new Date(),
      title: `Evidence Attached: ${title}`,
      description: notes || `Attached ${type} evidence asset.`,
      user: req.user?.name || 'Investigator',
      icon: 'file-text',
    });

    await investigation.save();
    res.status(201).json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign investigator to case
// @route   PATCH /api/investigations/:id/assign
const assignInvestigator = async (req, res) => {
  try {
    const { investigatorName, investigatorEmail } = req.body;
    const investigation = await Investigation.findById(req.params.id);
    if (!investigation) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const prevInvestigator = investigation.assignedInvestigator;
    investigation.assignedInvestigator = investigatorName;
    if (investigatorEmail) investigation.investigatorEmail = investigatorEmail;

    investigation.timeline.push({
      date: new Date(),
      title: 'Investigator Reassigned',
      description: `Case reassigned from ${prevInvestigator} to ${investigatorName}`,
      user: req.user?.name || 'System Operator',
      icon: 'user-check',
    });

    await investigation.save();
    res.json({ success: true, data: investigation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvestigations,
  getInvestigationById,
  updateInvestigationStatus,
  addInvestigatorNote,
  addEvidence,
  assignInvestigator,
};
