const Transaction = require('../models/Transaction');
const { postLedgerEntry } = require('../services/ledger');
const BankAccount = require('../models/BankAccount');
const Invoice = require('../models/Invoice');
const Budget = require('../models/Budget');
const Investigation = require('../models/Investigation');

const PALETTE = ['#1F4D3A', '#C4622D', '#3D4F6F', '#8A6A3B', '#6B4C3B', '#4F6F52', '#7A4E3A', '#2F4A44'];

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
};

const percentChange = (current, previous) => {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

// @desc    Get Finance overview summary (Income vs Expenses, Net Profit, Ledger rows)
// @route   GET /api/finance/overview
const getFinanceOverview = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });

    const inBooks = (t) => t.status !== 'rejected';
    const totalIncome = transactions
      .filter((t) => t.type === 'income' && inBooks(t))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense' && inBooks(t))
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpenses;

    const bankAccounts = await BankAccount.find();
    const totalCash = bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

    // Group expenses by category
    const categoryTotals = {};
    transactions
      .filter((t) => t.type === 'expense' && t.status !== 'rejected')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        color: PALETTE[index % PALETTE.length],
        percentage: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
      }));

    const monthBuckets = {};
    transactions.forEach((t) => {
      const key = monthKey(t.date);
      if (!monthBuckets[key]) monthBuckets[key] = { key, month: monthLabel(key), revenue: 0, expenses: 0 };
      if (t.status === 'rejected') return;
      if (t.type === 'income') monthBuckets[key].revenue += t.amount;
      if (t.type === 'expense') monthBuckets[key].expenses += t.amount;
    });
    const monthlyTrend = Object.values(monthBuckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8)
      .map((m) => ({ ...m, profit: m.revenue - m.expenses }));

    const latest = monthlyTrend[monthlyTrend.length - 1];
    const previous = monthlyTrend[monthlyTrend.length - 2];

    const invoices = await Invoice.find();
    const openInvoice = (status) => ['sent', 'partially_paid', 'overdue', 'disputed', 'draft'].includes(status);
    const receivables = invoices.filter((i) => i.type === 'receivable' && i.balanceDue > 0 && openInvoice(i.status));
    const payables = invoices.filter((i) => i.type === 'payable' && i.balanceDue > 0 && openInvoice(i.status));

    const budgets = await Budget.find().sort({ department: 1 });
    const departmentSpend = budgets.map((b) => ({
      name: b.department,
      spend: b.actualSpent,
      budget: b.allocatedAmount,
    }));

    const openInvestigations = await Investigation.countDocuments({
      status: { $in: ['Open', 'Under Review', 'Pending Evidence'] },
    });

    // Recurring transactions list
    const recurring = transactions.filter((t) => t.isRecurring);

    // General ledger latest entries
    const ledger = transactions.slice(0, 30).map((t) => ({
      id: t._id,
      txnId: t.txnId,
      date: t.date,
      account: t.bankAccountName || 'Primary Operating',
      description: t.description,
      debit: t.type === 'income' ? t.amount : 0,
      credit: t.type === 'expense' ? t.amount : 0,
      category: t.category,
      department: t.department,
      status: t.status,
    }));

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0,
        totalCash,
        accountCount: bankAccounts.length,
        revenueChange: latest && previous ? percentChange(latest.revenue, previous.revenue) : null,
        expenseChange: latest && previous ? percentChange(latest.expenses, previous.expenses) : null,
        profitChange: latest && previous ? percentChange(latest.profit, previous.profit) : null,
        accountsReceivable: receivables.reduce((s, i) => s + i.balanceDue, 0),
        receivableCount: receivables.length,
        overdueReceivableCount: receivables.filter((i) => i.status === 'overdue').length,
        accountsPayable: payables.reduce((s, i) => s + i.balanceDue, 0),
        payableCount: payables.length,
        openInvestigations,
      },
      monthlyTrend,
      departmentSpend,
      categoryBreakdown,
      recurring,
      ledger,
      bankAccounts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Recurring transactions list
// @route   GET /api/finance/recurring
const getRecurringTransactions = async (req, res) => {
  try {
    const recurring = await Transaction.find({ isRecurring: true }).sort({ date: -1 });
    res.json({ success: true, data: recurring });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get General Ledger items
// @route   GET /api/finance/ledger
const getGeneralLedger = async (req, res) => {
  try {
    const { startDate, endDate, category, department } = req.query;
    const query = {};

    if (category) query.category = category;
    if (department) query.department = department;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const txns = await Transaction.find(query).sort({ date: -1 }).limit(100);

    const ledger = txns.map((t) => ({
      _id: t._id,
      txnId: t.txnId,
      date: t.date,
      account: t.bankAccountName || 'Primary Operating (Chase)',
      description: t.description,
      debit: t.type === 'income' ? t.amount : 0,
      credit: t.type === 'expense' ? t.amount : 0,
      category: t.category,
      department: t.department,
      entity: t.vendorName || t.customerName || t.employeeName || 'General',
      status: t.status,
    }));

    res.json({ success: true, count: ledger.length, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runRecurring = async (req, res) => {
  try {
    const source = await Transaction.findById(req.params.id);
    if (!source || !source.isRecurring) {
      return res.status(404).json({ success: false, message: 'That recurring entry was not found.' });
    }
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const already = await Transaction.findOne({
      description: source.description,
      amount: source.amount,
      vendorName: source.vendorName,
      isRecurring: true,
      date: { $gte: start },
      status: { $ne: 'rejected' },
    });
    if (already) {
      return res.status(400).json({ success: false, message: 'This recurring item is already on the books for the current month.' });
    }
    const posted = await postLedgerEntry(req, {
      type: source.type,
      category: source.category,
      description: source.description,
      department: source.department,
      vendorName: source.vendorName,
      customerName: source.customerName,
      employeeName: source.employeeName,
      amount: source.amount,
      paymentMethod: source.paymentMethod,
      bankAccountName: source.bankAccountName,
      isRecurring: true,
      recurringInterval: source.recurringInterval,
    });
    res.status(201).json({ success: true, data: posted.transaction, alert: posted.alert });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getFinanceOverview, getRecurringTransactions, getGeneralLedger, runRecurring };
