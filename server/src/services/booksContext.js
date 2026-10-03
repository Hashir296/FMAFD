const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FraudAlert = require('../models/FraudAlert');
const Vendor = require('../models/Vendor');
const Invoice = require('../models/Invoice');
const BankAccount = require('../models/BankAccount');

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

const buildBooksContext = async () => {
  const posted = { status: { $ne: 'rejected' } };
  const [income, expense, accounts, alerts, budgets, topExpenses, vendors, invoices] = await Promise.all([
    Transaction.aggregate([
      { $match: { ...posted, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { ...posted, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    BankAccount.find().select('accountName accountType currentBalance'),
    FraudAlert.find({ status: { $in: ['New', 'Under Review', 'Escalated'] } })
      .sort({ riskScore: -1 })
      .limit(8)
      .select('alertId entityName amount riskScore riskLevel detectionType reasons status'),
    Budget.find().select('department category allocatedAmount actualSpent status'),
    Transaction.find({ ...posted, type: 'expense' })
      .sort({ amount: -1 })
      .limit(5)
      .select('txnId description vendorName department category amount date'),
    Vendor.find().sort({ totalSpending: -1 }).limit(8).select('name totalSpending riskScore riskLevel'),
    Invoice.find({ balanceDue: { $gt: 0 }, status: { $ne: 'void' } })
      .sort({ balanceDue: -1 })
      .limit(8)
      .select('invoiceNumber type customerName vendorName balanceDue status dueDate'),
  ]);

  const incomeTotal = round(income[0]?.total);
  const expenseTotal = round(expense[0]?.total);
  const cash = round(accounts.reduce((sum, account) => sum + account.currentBalance, 0));

  return {
    asOf: new Date().toISOString(),
    totals: {
      income: incomeTotal,
      incomeCount: income[0]?.count || 0,
      expenses: expenseTotal,
      expenseCount: expense[0]?.count || 0,
      net: round(incomeTotal - expenseTotal),
      cash,
    },
    bankAccounts: accounts.map((account) => ({
      name: account.accountName,
      type: account.accountType,
      balance: round(account.currentBalance),
    })),
    largestExpenses: topExpenses.map((txn) => ({
      id: txn.txnId,
      description: txn.description,
      vendor: txn.vendorName,
      department: txn.department,
      category: txn.category,
      amount: round(txn.amount),
      date: txn.date,
    })),
    vendorsBySpend: vendors.map((vendor) => ({
      name: vendor.name,
      spend: round(vendor.totalSpending),
      riskScore: vendor.riskScore || 0,
      riskLevel: vendor.riskLevel,
    })),
    budgets: budgets.map((budget) => ({
      department: budget.department,
      category: budget.category,
      allocated: round(budget.allocatedAmount),
      spent: round(budget.actualSpent),
      status: budget.status,
    })),
    openInvoices: invoices.map((invoice) => ({
      number: invoice.invoiceNumber,
      type: invoice.type,
      party: invoice.customerName || invoice.vendorName,
      balance: round(invoice.balanceDue),
      status: invoice.status,
      dueDate: invoice.dueDate,
    })),
    openAlerts: alerts.map((alert) => ({
      id: alert.alertId,
      entity: alert.entityName,
      amount: round(alert.amount),
      riskScore: alert.riskScore,
      riskLevel: alert.riskLevel,
      type: alert.detectionType,
      status: alert.status,
      reasons: (alert.reasons || []).slice(0, 3),
    })),
  };
};

module.exports = { buildBooksContext };
