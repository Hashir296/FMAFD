const Transaction = require('../models/Transaction');
const Vendor = require('../models/Vendor');
const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const FraudAlert = require('../models/FraudAlert');
const BankAccount = require('../models/BankAccount');
const Budget = require('../models/Budget');
const aiFraudEngine = require('./aiFraudEngine');
const { logAudit } = require('../middleware/auditLogger');

function refreshBudgetStatus(budget) {
  const ratio = budget.allocatedAmount ? budget.actualSpent / budget.allocatedAmount : 0;
  const line = (budget.alertThresholdPercent || 85) / 100;
  budget.status = ratio > 1 ? 'Over Budget' : ratio >= line ? 'Near Limit' : 'Healthy';
}

async function applyToBooks({ type, amount, department, vendorName, bankAccountName, counterAccountName }) {
  const value = Number(amount) || 0;
  if (type === 'transfer') {
    const from = await BankAccount.findOne({ accountName: bankAccountName, status: 'Active' });
    const to = await BankAccount.findOne({ accountName: counterAccountName, status: 'Active' });
    if (!from || !to) {
      throw new Error('Both bank accounts must exist and be active.');
    }
    if (from.accountName === to.accountName) {
      throw new Error('Choose two different accounts.');
    }
    if (from.currentBalance < value) {
      throw new Error(`${from.accountName} only has $${from.currentBalance.toLocaleString()} available.`);
    }
    from.currentBalance -= value;
    from.availableBalance -= value;
    to.currentBalance += value;
    to.availableBalance += value;
    await from.save();
    await to.save();
    return from;
  }

  const accountQuery = bankAccountName ? { accountName: bankAccountName } : { status: 'Active' };
  const account = await BankAccount.findOne(accountQuery);
  if (!account) {
    throw new Error(bankAccountName ? `Bank account "${bankAccountName}" was not found.` : 'No active bank account exists.');
  }
  const outgoing = type === 'expense';
  if (outgoing && account.currentBalance < value) {
    throw new Error(`${account.accountName} only has $${account.currentBalance.toLocaleString()} available.`);
  }
  const delta = type === 'income' || type === 'refund' ? value : -value;
  account.currentBalance += delta;
  account.availableBalance += delta;
  await account.save();

  if (type === 'expense' && department) {
    const budget = await Budget.findOne({ department }).sort({ fiscalYear: -1 });
    if (budget) {
      budget.actualSpent += value;
      refreshBudgetStatus(budget);
      await budget.save();
    }
  }

  if (vendorName && (type === 'expense' || type === 'refund')) {
    const vendor = await Vendor.findOne({ name: vendorName });
    if (vendor) {
      const signed = type === 'refund' ? -value : value;
      vendor.totalSpending = Math.max(0, (vendor.totalSpending || 0) + signed);
      vendor.transactionCount = (vendor.transactionCount || 0) + 1;
      vendor.avgTransaction = vendor.transactionCount ? Math.round(vendor.totalSpending / vendor.transactionCount) : 0;
      await vendor.save();
    }
  }

  return account;
}

async function postLedgerEntry(req, input) {
  const {
    type,
    category,
    subcategory = '',
    description,
    department,
    vendorName = '',
    customerName = '',
    employeeName = '',
    amount,
    paymentMethod = 'ACH',
    date = new Date(),
    status = 'completed',
    isRecurring = false,
    recurringInterval = 'None',
    bankAccountName = '',
    counterAccountName = '',
    invoiceNumber = '',
    receiptNote = '',
  } = input;

  const count = await Transaction.countDocuments();
  const txnId = `TXN-${new Date().getFullYear()}-${String(1000 + count + 1)}`;

  let vendorContext = {};
  if (vendorName) {
    const vendor = await Vendor.findOne({ name: vendorName });
    if (vendor) {
      const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const match = await Transaction.findOne({
        vendorName,
        amount: Number(amount),
        date: { $gte: since },
      }).sort({ date: -1 });
      const changedAt = vendor.accountDetailsLastModified ? new Date(vendor.accountDetailsLastModified) : null;
      const createdAt = vendor.createdAt ? new Date(vendor.createdAt) : null;
      const bankChangedAfterSetup = changedAt && createdAt && changedAt - createdAt > 24 * 60 * 60 * 1000;
      const bankChangedRecently = bankChangedAfterSetup && Date.now() - changedAt < 14 * 24 * 60 * 60 * 1000;
      vendorContext = {
        vendorAvg: vendor.avgTransaction || 0,
        vendorHistoricalSpend: vendor.totalSpending || 0,
        vendorSpendSpikeRatio: vendor.recentSpendSpikeRatio || 1,
        vendorAccountModifiedRecently: bankChangedRecently,
        vendorModifiedDate: changedAt ? changedAt.toISOString().slice(0, 10) : '',
        hasRecentMatchingAmount: Boolean(match),
        matchingTxnId: match?.txnId || '',
      };
    }
  }

  let employeeContext = {};
  if (employeeName && type === 'expense') {
    const employee = await Employee.findOne({ name: employeeName });
    if (employee) {
      const projected = (employee.currentMonthSpend || 0) + Number(amount);
      const limit = employee.monthlySpendLimit || 0;
      if (limit > 0 && projected > limit) {
        employeeContext = {
          employeeOverLimit: true,
          employeeOverAmount: projected - limit,
          employeeLimit: limit,
          employeeTotal: projected,
        };
      }
    }
  }

  const aiAnalysis = await aiFraudEngine.analyzeTransaction(
    { amount, date, vendorName, employeeName, department, category, type },
    { ...vendorContext, ...employeeContext }
  );

  const account = await applyToBooks({ type, amount, department, vendorName, bankAccountName, counterAccountName });

  if (type === 'expense' && employeeName) {
    const employee = await Employee.findOne({ name: employeeName });
    if (employee) {
      employee.currentMonthSpend = (employee.currentMonthSpend || 0) + Number(amount);
      employee.totalClaimsCount = (employee.totalClaimsCount || 0) + 1;
      employee.averageClaimAmount = Math.round(employee.currentMonthSpend / employee.totalClaimsCount);
      await employee.save();
    }
  }

  const transaction = await Transaction.create({
    txnId,
    date,
    type,
    category,
    subcategory: type === 'transfer' ? `to:${counterAccountName}` : subcategory,
    description,
    department: department || 'Finance',
    vendorName,
    customerName,
    employeeName,
    amount: Number(amount),
    paymentMethod,
    status: aiAnalysis.riskLevel === 'Critical' ? 'flagged' : status,
    isAnomaly: aiAnalysis.riskScore > 40,
    riskScore: aiAnalysis.riskScore,
    riskLevel: aiAnalysis.riskLevel,
    riskFactors: aiAnalysis.reasons,
    detectionTypes: aiAnalysis.detectionTypes,
    evidence: aiAnalysis.evidence,
    recommendedAction: aiAnalysis.recommendedAction,
    isRecurring,
    recurringInterval,
    bankAccountName: account?.accountName || bankAccountName || 'Operating',
    invoiceNumber,
    receiptUrl: receiptNote,
    auditTrail: [
      {
        action: 'Posted to ledger',
        performedBy: req.user?.name || 'System',
        timestamp: new Date(),
        notes: `Risk ${aiAnalysis.riskScore} (${aiAnalysis.riskLevel}). Bank and budget updated from this entry.`,
      },
    ],
  });

  let alert = null;
  if (aiAnalysis.riskScore >= 60) {
    alert = await FraudAlert.create({
      alertId: `ALT-${Date.now().toString().slice(-6)}`,
      transactionRef: transaction._id,
      txnId: transaction.txnId,
      entityType: vendorName ? 'Vendor' : employeeName ? 'Employee' : 'Transaction',
      entityName: vendorName || employeeName || description,
      amount: transaction.amount,
      riskScore: aiAnalysis.riskScore,
      riskLevel: aiAnalysis.riskLevel,
      detectionType: aiAnalysis.detectionTypes[0] || 'Unusual Amount',
      detectionDate: new Date(),
      status: 'New',
      reasons: aiAnalysis.reasons,
      evidence: aiAnalysis.evidence,
      recommendedAction: aiAnalysis.recommendedAction,
    });
  }

  await logAudit({
    req,
    action: 'Transaction Created',
    module: 'Transactions',
    recordId: transaction.txnId,
    recordType: 'Transaction',
    newValue: { amount: transaction.amount, type: transaction.type, riskScore: transaction.riskScore },
    details: `Posted ${transaction.txnId} for $${Number(amount).toLocaleString()}`,
  });

  return { transaction, aiAnalysis, alert };
}

async function reversePostedEntry(req, transaction) {
  if (!transaction || transaction.reversed || transaction.status === 'rejected') return transaction;

  const value = Number(transaction.amount) || 0;
  if (transaction.type === 'transfer') {
    const destination = String(transaction.subcategory || '').replace(/^to:/, '');
    await applyToBooks({
      type: 'transfer',
      amount: value,
      bankAccountName: destination,
      counterAccountName: transaction.bankAccountName,
    });
  } else {
    const account = await BankAccount.findOne({ accountName: transaction.bankAccountName })
      || await BankAccount.findOne({ status: 'Active' });
    if (account) {
      const delta = transaction.type === 'income' || transaction.type === 'refund' ? -value : value;
      account.currentBalance += delta;
      account.availableBalance += delta;
      await account.save();
    }
    if (transaction.type === 'expense' && transaction.department) {
      const budget = await Budget.findOne({ department: transaction.department }).sort({ fiscalYear: -1 });
      if (budget) {
        budget.actualSpent = Math.max(0, (budget.actualSpent || 0) - value);
        refreshBudgetStatus(budget);
        await budget.save();
      }
    }
    if (transaction.vendorName && (transaction.type === 'expense' || transaction.type === 'refund')) {
      const vendor = await Vendor.findOne({ name: transaction.vendorName });
      if (vendor) {
        const signed = transaction.type === 'refund' ? value : -value;
        vendor.totalSpending = Math.max(0, (vendor.totalSpending || 0) + signed);
        await vendor.save();
      }
    }
    if (transaction.type === 'expense' && transaction.employeeName) {
      const employee = await Employee.findOne({ name: transaction.employeeName });
      if (employee) {
        employee.currentMonthSpend = Math.max(0, (employee.currentMonthSpend || 0) - value);
        await employee.save();
      }
    }
    if (transaction.customerName && transaction.type === 'income') {
      const customer = await Customer.findOne({ name: transaction.customerName });
      if (customer) {
        customer.outstandingBalance = (customer.outstandingBalance || 0) + value;
        customer.status = customer.outstandingBalance > customer.creditLimit ? 'Delinquent' : 'Active';
        await customer.save();
      }
    }
  }

  if (transaction.invoiceNumber) {
    const invoice = await Invoice.findOne({ invoiceNumber: transaction.invoiceNumber });
    if (invoice) {
      invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - value);
      invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
      invoice.status = invoice.amountPaid > 0 ? 'partially_paid' : 'sent';
      await invoice.save();
    }
  }

  transaction.status = 'rejected';
  transaction.reversed = true;
  transaction.auditTrail.push({
    action: 'Reversed',
    performedBy: req.user?.name || 'System',
    timestamp: new Date(),
    notes: 'Confirmed fraud. Cash, budget, vendor spend, and the invoice balance were put back.',
  });
  await transaction.save();

  await logAudit({
    req,
    action: 'Transaction Reversed',
    module: 'Transactions',
    recordId: transaction.txnId,
    recordType: 'Transaction',
    details: `Reversed ${transaction.txnId} after confirmed fraud`,
  });

  return transaction;
}

module.exports = { postLedgerEntry, applyToBooks, reversePostedEntry };
