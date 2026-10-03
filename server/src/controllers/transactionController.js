const Transaction = require('../models/Transaction');
const Vendor = require('../models/Vendor');
const FraudAlert = require('../models/FraudAlert');
const { postLedgerEntry } = require('../services/ledger');
const { logAudit } = require('../middleware/auditLogger');

// @desc    Get all transactions with filtering, search, sorting, pagination
// @route   GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const {
      search,
      type,
      category,
      department,
      riskLevel,
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (req.user?.role === 'Employee') {
      query.employeeName = req.user.name;
    } else if (req.user?.role === 'Department Manager') {
      query.department = req.user.department;
    }

    // Text search on description, txnId, vendorName, employeeName
    if (search) {
      query.$or = [
        { txnId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (type) query.type = type;
    if (category) query.category = category;
    if (department) query.department = department;
    if (riskLevel) query.riskLevel = riskLevel;
    if (status) query.status = status;

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort(sort).skip(skip).limit(limitNum),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactionStats = async (req, res) => {
  try {
    const query = {};
    if (req.user?.role === 'Employee') query.employeeName = req.user.name;
    else if (req.user?.role === 'Department Manager') query.department = req.user.department;

    const transactions = await Transaction.find(query);
    const income = transactions.filter((t) => t.type === 'income' && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense' && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);
    const buckets = {};
    transactions.forEach((t) => {
      const day = new Date(t.date).toISOString().slice(0, 10);
      buckets[day] = (buckets[day] || 0) + t.amount;
    });
    const trend = Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, total]) => ({ date, total }));

    res.json({
      success: true,
      data: {
        totalVolume: income + expense,
        totalCredit: income,
        totalDebit: expense,
        flaggedCount: transactions.filter((t) => t.status === 'flagged' || t.status === 'under_review').length,
        trend,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single transaction by ID with AI analysis & related txns
// @route   GET /api/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('vendorRef')
      .populate('employeeRef')
      .populate('invoiceRef');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Find related transactions (same vendor or employee within +/- 30 days)
    const relatedTransactions = await Transaction.find({
      _id: { $ne: transaction._id },
      $or: [
        { vendorName: transaction.vendorName, vendorName: { $ne: '' } },
        { employeeName: transaction.employeeName, employeeName: { $ne: '' } },
        { category: transaction.category, department: transaction.department },
      ],
    })
      .sort({ date: -1 })
      .limit(6);

    res.json({
      success: true,
      data: transaction,
      relatedTransactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new transaction with automated AI fraud scoring
// @route   POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const { type, category, description, department, amount } = req.body;
    if (!type || !category || !description || !department || !amount) {
      return res.status(400).json({ success: false, message: 'Type, category, description, department, and amount are required.' });
    }
    const result = await postLedgerEntry(req, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const prevValue = {
      amount: transaction.amount,
      category: transaction.category,
      status: transaction.status,
    };

    Object.assign(transaction, req.body);

    transaction.auditTrail.push({
      action: 'Transaction Modified',
      performedBy: req.user?.name || 'System',
      timestamp: new Date(),
      notes: `Updated by ${req.user?.name || 'Authorized User'}`,
    });

    await transaction.save();

    await logAudit({
      req,
      action: 'Transaction Modified',
      module: 'Transactions',
      recordId: transaction.txnId,
      recordType: 'Transaction',
      previousValue: prevValue,
      newValue: { amount: transaction.amount, category: transaction.category, status: transaction.status },
      details: `Updated ${transaction.txnId}`,
    });

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await transaction.deleteOne();

    await logAudit({
      req,
      action: 'Transaction Deleted',
      module: 'Transactions',
      recordId: transaction.txnId,
      recordType: 'Transaction',
      previousValue: { amount: transaction.amount, description: transaction.description },
      details: `Deleted ${transaction.txnId}`,
    });

    res.json({ success: true, message: 'Transaction removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Categorize transaction
// @route   PATCH /api/transactions/:id/categorize
const categorizeTransaction = async (req, res) => {
  try {
    const { category, subcategory } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const oldCat = transaction.category;
    transaction.category = category;
    if (subcategory) transaction.subcategory = subcategory;

    transaction.auditTrail.push({
      action: 'Recategorized',
      performedBy: req.user?.name || 'Operator',
      timestamp: new Date(),
      notes: `Changed category from ${oldCat} to ${category}`,
    });

    await transaction.save();

    await logAudit({
      req,
      action: 'Transaction Categorized',
      module: 'Transactions',
      recordId: transaction.txnId,
      recordType: 'Transaction',
      previousValue: { category: oldCat },
      newValue: { category },
      details: `Recategorized ${transaction.txnId} to ${category}`,
    });

    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Attach receipt / invoice link
// @route   PATCH /api/transactions/:id/receipt
const attachReceipt = async (req, res) => {
  try {
    const receiptNote = (req.body.receiptNote || req.body.receiptUrl || '').trim();
    if (!receiptNote) {
      return res.status(400).json({ success: false, message: 'Enter the receipt number or a short note from the document.' });
    }
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    transaction.receiptUrl = receiptNote;
    transaction.auditTrail.push({
      action: 'Receipt Attached',
      performedBy: req.user?.name || 'System',
      timestamp: new Date(),
      notes: 'Proof of purchase document linked.',
    });

    await transaction.save();
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTransactions,
  getTransactionStats,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  categorizeTransaction,
  attachReceipt,
};
