/**
 * Briefings are computed from the books. Nothing here is a fixed narrative.
 */
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FraudAlert = require('../models/FraudAlert');
const Vendor = require('../models/Vendor');
const Invoice = require('../models/Invoice');
const BankAccount = require('../models/BankAccount');

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

class AIInsightsEngine {
  async generateExecutiveBriefing() {
    try {
      const [transactions, budgets, alerts, vendors, invoices, accounts] = await Promise.all([
        Transaction.find(),
        Budget.find(),
        FraudAlert.find({ status: { $in: ['New', 'Under Review', 'Escalated'] } }).sort({ riskScore: -1 }),
        Vendor.find(),
        Invoice.find(),
        BankAccount.find(),
      ]);

      const income = transactions.filter((t) => t.type === 'income' && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);
      const expenses = transactions.filter((t) => t.type === 'expense' && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);
      const margin = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
      const cash = accounts.reduce((s, a) => s + a.currentBalance, 0);

      const overBudget = budgets.filter((b) => b.allocatedAmount > 0 && b.actualSpent > b.allocatedAmount);
      const nearLimit = budgets.filter(
        (b) => b.allocatedAmount > 0 && b.actualSpent / b.allocatedAmount >= (b.alertThresholdPercent || 85) / 100 && b.actualSpent <= b.allocatedAmount
      );

      const openReceivables = invoices.filter((i) => i.type === 'receivable' && i.balanceDue > 0);
      const overdue = openReceivables.filter((i) => i.status === 'overdue');
      const overdueTotal = overdue.reduce((s, i) => s + i.balanceDue, 0);
      const arTotal = openReceivables.reduce((s, i) => s + i.balanceDue, 0);

      const riskyVendors = vendors
        .filter((v) => ['High', 'Critical'].includes(v.riskLevel) || (v.riskScore || 0) >= 50)
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

      const exposure = alerts.reduce((s, a) => s + (a.amount || 0), 0);
      const now = new Date();

      const insights = [
        {
          id: 'books-margin',
          type: 'forecast',
          category: 'financial',
          title: income ? `Recorded margin is ${margin}%` : 'No income has been posted yet',
          summary: income
            ? `The ledger shows ${money(income)} in income and ${money(expenses)} in expenses. Net is ${money(income - expenses)}.`
            : 'Post income and expense transactions before this desk can describe performance.',
          severity: margin >= 15 ? 'Positive' : margin >= 0 ? 'Info' : 'Warning',
          impact: 'High',
          dollarImpact: income - expenses,
          evidence: [
            `Income posted: ${money(income)} across ${transactions.filter((t) => t.type === 'income').length} transactions.`,
            `Expenses posted: ${money(expenses)} across ${transactions.filter((t) => t.type === 'expense').length} transactions.`,
            `Cash sitting in ${accounts.length} bank account${accounts.length === 1 ? '' : 's'}: ${money(cash)}.`,
          ],
          recommendedAction: margin < 0 ? 'Review the largest expense categories before approving new spend.' : 'Keep posting receipts so the margin stays tied to the books.',
          actionRoute: '/finance',
          generatedAt: now,
        },
        {
          id: 'books-budgets',
          type: 'recommendation',
          category: 'budget',
          title: overBudget.length
            ? `${overBudget.length} budget${overBudget.length === 1 ? '' : 's'} are over the approved amount`
            : nearLimit.length
            ? `${nearLimit.length} budget${nearLimit.length === 1 ? '' : 's'} are near the alert line`
            : 'Budgets are inside their approved amounts',
          summary: budgets.length
            ? overBudget.length
              ? `${overBudget.map((b) => b.department).join(', ')} spent more than was allocated.`
              : 'No department has crossed its allocated amount.'
            : 'No budgets have been created yet.',
          severity: overBudget.length ? 'Warning' : 'Info',
          impact: 'Medium',
          dollarImpact: overBudget.reduce((s, b) => s + (b.actualSpent - b.allocatedAmount), 0),
          evidence: (overBudget.length ? overBudget : budgets).slice(0, 6).map(
            (b) => `${b.department}: spent ${money(b.actualSpent)} of ${money(b.allocatedAmount)}`
          ),
          recommendedAction: overBudget.length
            ? 'Stop non-essential purchases in over-budget departments until the owner approves more funds.'
            : 'Leave the current ceilings in place.',
          actionRoute: '/budgets',
          generatedAt: now,
        },
        {
          id: 'books-risk',
          type: 'risk',
          category: 'risk',
          title: alerts.length
            ? `${alerts.length} open alert${alerts.length === 1 ? '' : 's'} worth ${money(exposure)}`
            : 'No open fraud alerts',
          summary: alerts.length
            ? 'These alerts are still New, Under Review, or Escalated. Amounts come from the alert records.'
            : 'Nothing is waiting in the fraud queue.',
          severity: alerts.some((a) => a.riskLevel === 'Critical') ? 'Critical' : alerts.length ? 'Warning' : 'Positive',
          impact: 'High',
          dollarImpact: exposure,
          evidence: alerts.slice(0, 5).map(
            (a) => `${a.detectionType} · ${a.txnId || 'no txn'} · ${money(a.amount)} · ${a.entityName} · score ${a.riskScore}`
          ),
          recommendedAction: alerts.length
            ? 'Open the case from the alert before releasing the payment.'
            : 'No review is waiting.',
          actionRoute: '/fraud-detection',
          generatedAt: now,
        },
        {
          id: 'books-vendors',
          type: 'anomaly',
          category: 'vendor',
          title: riskyVendors.length
            ? `${riskyVendors.length} vendor${riskyVendors.length === 1 ? '' : 's'} scored high risk`
            : 'No vendor is marked high risk',
          summary: riskyVendors.length
            ? `${riskyVendors[0].name} is the highest scored supplier on file.`
            : 'Supplier risk levels on file are Low or Medium.',
          severity: riskyVendors.length ? 'Warning' : 'Info',
          impact: 'High',
          dollarImpact: riskyVendors.reduce((s, v) => s + (v.totalSpending || 0), 0),
          evidence: riskyVendors.slice(0, 4).map(
            (v) => `${v.name}: risk ${v.riskLevel || 'n/a'} (${v.riskScore || 0}), recorded spend ${money(v.totalSpending || 0)}`
          ),
          recommendedAction: riskyVendors.length
            ? 'Confirm bank details with the vendor before the next payment.'
            : 'No supplier hold is required from the current scores.',
          actionRoute: '/vendors',
          generatedAt: now,
        },
        {
          id: 'books-cash',
          type: 'forecast',
          category: 'forecast',
          title: `Cash on the books is ${money(cash)}`,
          summary: `Open receivables are ${money(arTotal)}. Overdue receivables are ${money(overdueTotal)} across ${overdue.length} invoice${overdue.length === 1 ? '' : 's'}.`,
          severity: overdue.length ? 'Warning' : 'Info',
          impact: 'Medium',
          dollarImpact: arTotal,
          evidence: [
            `Bank balances: ${money(cash)}.`,
            `Open receivables: ${money(arTotal)} on ${openReceivables.length} invoices.`,
            `Overdue: ${money(overdueTotal)}.`,
          ],
          recommendedAction: overdue.length
            ? 'Collect the overdue invoices before treating that cash as available.'
            : 'Receivables are not past due.',
          actionRoute: '/accounts-receivable',
          generatedAt: now,
        },
      ];

      return insights.filter((item) => item.evidence.length || item.summary);
    } catch (error) {
      console.error('[Insights Engine Error]', error.message);
      return [];
    }
  }
}

module.exports = new AIInsightsEngine();
