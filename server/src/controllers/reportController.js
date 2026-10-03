const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FraudAlert = require('../models/FraudAlert');
const Vendor = require('../models/Vendor');
const Employee = require('../models/Employee');
const BankAccount = require('../models/BankAccount');
const Invoice = require('../models/Invoice');

// @desc    Generate financial or risk report
// @route   GET /api/reports/:reportType
const getReport = async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, department } = req.query;

    const query = {};
    if (department) query.department = department;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const txns = await Transaction.find(query);

    let reportData = {};

    switch (reportType) {
      case 'profit-and-loss':
      case 'income_statement': {
        const totalRevenue = txns.filter((t) => t.type === 'income' && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);
        const operatingExpenses = {};
        txns
          .filter((t) => t.type === 'expense' && t.status !== 'rejected')
          .forEach((t) => {
            operatingExpenses[t.category] = (operatingExpenses[t.category] || 0) + t.amount;
          });

        const totalOpex = Object.values(operatingExpenses).reduce((s, a) => s + a, 0);
        const netProfit = totalRevenue - totalOpex;

        reportData = {
          title: 'Profit and loss',
          period: 'Posted transactions',
          summary: `Net ${netProfit >= 0 ? 'income' : 'loss'} is $${Math.abs(netProfit).toLocaleString()} on income of $${totalRevenue.toLocaleString()} and expenses of $${totalOpex.toLocaleString()}.`,
          sections: [
            { category: 'Income', amount: totalRevenue },
            ...Object.entries(operatingExpenses).map(([name, val]) => ({
              category: name,
              amount: -val,
            })),
            { category: 'Total expenses', amount: -totalOpex, isTotal: true },
            { category: 'Net income', amount: netProfit, isGrandTotal: true },
          ],
        };
        break;
      }

      case 'balance-sheet': {
        const bankAccounts = await BankAccount.find();
        const cashEquivalents = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
        const invoices = await Invoice.find();
        const accountsReceivable = invoices
          .filter((i) => i.type === 'receivable')
          .reduce((s, i) => s + (i.balanceDue || 0), 0);
        const accountsPayable = invoices
          .filter((i) => i.type === 'payable')
          .reduce((s, i) => s + (i.balanceDue || 0), 0);
        const recordedAssets = cashEquivalents + accountsReceivable;
        const netPosition = recordedAssets - accountsPayable;

        reportData = {
          title: 'Recorded balances',
          period: 'Bank accounts and open invoices',
          summary: `Cash, open receivables, and open payables are taken from the books. Fixed assets and loans are not tracked here, so they are not shown.`,
          sections: [
            { category: 'Cash in bank accounts', amount: cashEquivalents },
            { category: 'Open receivables', amount: accountsReceivable },
            { category: 'Recorded assets', amount: recordedAssets, isTotal: true },
            { category: 'Open payables', amount: accountsPayable },
            { category: 'Assets minus payables', amount: netPosition, isGrandTotal: true },
          ],
        };
        break;
      }

      case 'cash-flow':
      case 'cash_flow': {
        const totalInflows = txns.filter((t) => t.type === 'income' && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);
        const totalOutflows = txns.filter((t) => t.type === 'expense' && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);
        const netOperatingCash = totalInflows - totalOutflows;

        reportData = {
          title: 'Cash movement from transactions',
          period: 'Posted income and expenses',
          summary: `Net movement is $${netOperatingCash.toLocaleString()}. This is income minus expenses. It is not split into invented investing or financing lines.`,
          sections: [
            { category: 'Income received', amount: totalInflows },
            { category: 'Expenses paid', amount: -totalOutflows },
            { category: 'Net movement', amount: netOperatingCash, isGrandTotal: true },
          ],
        };
        break;
      }

      case 'budget-variance':
      case 'budget_variance': {
        const budgets = await Budget.find().sort({ department: 1 });
        reportData = {
          title: 'Budget variance',
          period: 'Approved budgets on file',
          summary: budgets.length
            ? `${budgets.filter((b) => b.actualSpent > b.allocatedAmount).length} budget line(s) are over the approved amount.`
            : 'No budgets have been saved.',
          sections: budgets.map((b) => ({
            category: b.department,
            amount: b.allocatedAmount - b.actualSpent,
            note: `Spent $${b.actualSpent.toLocaleString()} of $${b.allocatedAmount.toLocaleString()}`,
          })),
        };
        break;
      }

      case 'vendor-risk':
      case 'vendor_risk': {
        const vendors = await Vendor.find().sort({ riskScore: -1 });
        reportData = {
          title: 'Vendor risk',
          period: 'Supplier records',
          summary: `${vendors.filter((v) => ['High', 'Critical'].includes(v.riskLevel)).length} vendors are marked high or critical risk.`,
          sections: vendors.slice(0, 25).map((v) => ({
            category: `${v.name} (${v.riskLevel || 'Unscored'})`,
            amount: v.totalSpending || 0,
          })),
        };
        break;
      }

      case 'fraud-summary':
      case 'fraud_summary':
      case 'risk-exposure': {
        const alerts = await FraudAlert.find();
        const vendors = await Vendor.find();
        const employees = await Employee.find();

        const highRiskVendors = vendors.filter((v) => v.riskScore >= 50);
        const highRiskEmployees = employees.filter((e) => e.riskScore >= 40);

        const openRiskAmount = alerts
          .filter((a) => ['New', 'Under Review', 'Escalated'].includes(a.status))
          .reduce((s, a) => s + a.amount, 0);

        reportData = {
          title: 'Enterprise Fraud & Financial Risk Audit Report',
          period: 'Live Telemetry Audit',
          summary: `Current active capital exposure evaluated at $${openRiskAmount.toLocaleString()} across ${alerts.length} historical algorithmic alerts.`,
          sections: [
            { category: 'Total Flagged Risk Capital (Active)', amount: openRiskAmount, isTotal: true },
            { category: 'Critical Severity Alerts Count', amount: alerts.filter((a) => a.riskLevel === 'Critical').length },
            { category: 'High Severity Alerts Count', amount: alerts.filter((a) => a.riskLevel === 'High').length },
            { category: 'Vendors with Elevated Risk Scores (>50)', amount: highRiskVendors.length },
            { category: 'Employees with Spending Limit Violations', amount: highRiskEmployees.length },
            { category: 'Confirmed Fraud Cases Resolved', amount: alerts.filter((a) => a.status === 'Confirmed Fraud').length },
            { category: 'False Positive Cleared Cases', amount: alerts.filter((a) => a.status === 'False Positive').length },
          ],
        };
        break;
      }

      default: {
        reportData = {
          title: 'Custom Operational Report',
          period: 'FY 2026',
          summary: 'Consolidated report overview.',
          sections: txns.slice(0, 10).map((t) => ({ category: t.description, amount: t.amount })),
        };
      }
    }

    res.json({ success: true, report: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getReport };
