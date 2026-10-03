const ExpenseClaim = require('../models/ExpenseClaim');
const { postLedgerEntry } = require('../services/ledger');
const { logAudit } = require('../middleware/auditLogger');

const canReviewDepartment = (user, department) => {
  if (['Owner', 'Super Admin', 'Finance Manager'].includes(user.role)) return true;
  return user.role === 'Department Manager' && user.department === department;
};

const getClaims = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'Employee') query.employeeName = req.user.name;
    else if (req.user.role === 'Department Manager') query.department = req.user.department;
    const claims = await ExpenseClaim.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: claims.length, data: claims });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createClaim = async (req, res) => {
  try {
    const { department, category, description, amount, vendorName = '', receiptNote = '' } = req.body;
    const value = Number(amount);
    if (!department || !category || !description || !value || value <= 0) {
      return res.status(400).json({ success: false, message: 'Department, category, description, and amount are required.' });
    }
    const count = await ExpenseClaim.countDocuments();
    const claim = await ExpenseClaim.create({
      claimId: `CLM-${new Date().getFullYear()}-${String(1000 + count + 1)}`,
      employeeName: req.user.name,
      department: req.user.role === 'Employee' || req.user.role === 'Department Manager' ? req.user.department || department : department,
      category,
      description,
      vendorName,
      amount: value,
      receiptNote,
      status: 'Submitted',
    });
    await logAudit({
      req,
      action: 'Expense Claim Submitted',
      module: 'Transactions',
      recordId: claim.claimId,
      recordType: 'ExpenseClaim',
      details: `${claim.employeeName} submitted ${claim.claimId} for $${value.toLocaleString()}. Cash has not moved.`,
    });
    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reviewClaim = async (req, res) => {
  try {
    const claim = await ExpenseClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });
    if (!canReviewDepartment(req.user, claim.department)) {
      return res.status(403).json({ success: false, message: 'You can only review claims for your department.' });
    }
    if (claim.status !== 'Submitted') {
      return res.status(400).json({ success: false, message: 'Only a submitted claim can be approved or rejected.' });
    }
    const decision = req.body.decision === 'Rejected' ? 'Rejected' : 'Approved';
    claim.status = decision;
    claim.reviewedBy = req.user.name;
    claim.reviewNote = req.body.note || '';
    await claim.save();
    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const postClaim = async (req, res) => {
  try {
    const claim = await ExpenseClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });
    if (claim.status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Approve the claim before it is posted to the bank.' });
    }
    if (!req.body.bankAccountName) {
      return res.status(400).json({ success: false, message: 'Choose the bank account that will pay this claim.' });
    }
    const posted = await postLedgerEntry(req, {
      type: 'expense',
      category: claim.category,
      description: claim.description,
      department: claim.department,
      vendorName: claim.vendorName,
      employeeName: claim.employeeName,
      amount: claim.amount,
      bankAccountName: req.body.bankAccountName,
      paymentMethod: req.body.paymentMethod || 'ACH',
      receiptNote: claim.receiptNote,
      invoiceNumber: claim.claimId,
    });
    claim.status = 'Posted';
    claim.txnId = posted.transaction.txnId;
    await claim.save();
    res.json({ success: true, data: claim, transaction: posted.transaction, alert: posted.alert });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getClaims, createClaim, reviewClaim, postClaim };
