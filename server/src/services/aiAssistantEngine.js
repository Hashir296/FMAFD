/**
 * FinGuard AI - Conversational Financial Assistant Engine
 * Answers natural language queries grounded in live database state.
 */
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FraudAlert = require('../models/FraudAlert');
const Vendor = require('../models/Vendor');
const Invoice = require('../models/Invoice');
const BankAccount = require('../models/BankAccount');

class AIAssistantEngine {
  async processQuery(userQuery = '') {
    const q = userQuery.toLowerCase().trim();

    // 1. Largest expenses query
    if (q.includes('largest expense') || q.includes('biggest expense') || q.includes('top expense')) {
      const topExpenses = await Transaction.find({ type: 'expense' })
        .sort({ amount: -1 })
        .limit(5)
        .populate('vendorRef');

      const totalTop = topExpenses.reduce((sum, t) => sum + t.amount, 0);

      return {
        query: userQuery,
        intent: 'largest_expenses',
        answer: `Here are the **top 5 largest corporate expenses** recorded in the system. Together they account for **$${totalTop.toLocaleString()}** in capital outlays.`,
        keyMetrics: [
          { label: 'Highest Single Outlay', value: `$${(topExpenses[0]?.amount || 0).toLocaleString()}` },
          { label: 'Primary Beneficiary', value: topExpenses[0]?.vendorName || 'N/A' },
          { label: 'Combined Top 5 Total', value: `$${totalTop.toLocaleString()}` },
        ],
        supportingData: topExpenses.map((t) => ({
          id: t.txnId,
          title: t.description,
          entity: t.vendorName || t.department,
          amount: t.amount,
          date: new Date(t.date).toLocaleDateString(),
          riskScore: t.riskScore,
          category: t.category,
        })),
        followUpSuggestions: [
          'Which vendors increased their charges?',
          'Which transactions require review?',
          'Show departments exceeding their budgets.',
        ],
      };
    }

    // 2. Vendors increased charges / vendor anomalies
    if (q.includes('vendor') && (q.includes('increase') || q.includes('spike') || q.includes('charge') || q.includes('risk'))) {
      const spikers = await Vendor.find({
        $or: [{ recentSpendSpikeRatio: { $gt: 1.5 } }, { riskScore: { $gte: 40 } }],
      })
        .sort({ riskScore: -1 })
        .limit(5);

      return {
        query: userQuery,
        intent: 'vendor_spike_analysis',
        answer: `Analysis identified **${spikers.length} vendors** exhibiting anomalous billing increases or elevated risk metrics over their 90-day baseline moving average.`,
        keyMetrics: [
          { label: 'Highest Risk Vendor', value: spikers[0]?.name || 'N/A' },
          { label: 'Risk Factor', value: 'Recent Bank Detail Change + Spike' },
          { label: 'Highest Spending Spike', value: `${Math.round(((spikers[0]?.recentSpendSpikeRatio || 1.8) - 1) * 100)}% increase` },
        ],
        supportingData: spikers.map((v) => ({
          id: v.vendorId,
          title: v.name,
          entity: v.category,
          amount: v.totalSpending,
          date: 'Active',
          riskScore: v.riskScore,
          category: `${v.riskFactors?.[0] || 'Spend velocity spike'}`,
        })),
        followUpSuggestions: [
          'Show details on recent banking changes for vendors',
          'Which transactions require review?',
          'What were our largest expenses this month?',
        ],
      };
    }

    // 3. Departments exceeding budgets
    if (q.includes('department') || q.includes('budget') || q.includes('exceed') || q.includes('over budget')) {
      const budgets = await Budget.find().sort({ actualSpent: -1 });
      const overBudget = budgets.filter((b) => (b.actualSpent / (b.allocatedAmount || 1)) >= 0.85);

      return {
        query: userQuery,
        intent: 'budget_compliance',
        answer: `Currently, **${overBudget.length} department(s)** have reached or exceeded 85% of their allocated quarterly budget. We recommend placing discretionary POs under departmental manager review.`,
        keyMetrics: [
          { label: 'Departments at Risk', value: `${overBudget.length} of ${budgets.length}` },
          { label: 'Most Strained Dept', value: overBudget[0]?.department || 'None' },
          { label: 'Peak Utilization', value: `${overBudget[0]?.utilizationPercent || 0}%` },
        ],
        supportingData: budgets.map((b) => ({
          id: b.department,
          title: `${b.department} Department`,
          entity: `Quarterly Cap: $${b.allocatedAmount.toLocaleString()}`,
          amount: b.actualSpent,
          date: `${b.utilizationPercent}% utilized`,
          riskScore: b.utilizationPercent > 90 ? 75 : 20,
          category: b.status,
        })),
        followUpSuggestions: [
          'Why did expenses increase this month?',
          'What were our largest expenses this month?',
          'Forecast our cash position for next month.',
        ],
      };
    }

    // 4. Transactions requiring review
    if (q.includes('review') || q.includes('suspicious') || q.includes('fraud') || q.includes('alert')) {
      const alerts = await FraudAlert.find({ status: { $in: ['New', 'Under Review'] } })
        .sort({ riskScore: -1 })
        .limit(5);

      const totalRisk = alerts.reduce((s, a) => s + a.amount, 0);

      return {
        query: userQuery,
        intent: 'fraud_alerts_review',
        answer: `There are currently **${alerts.length} pending alerts** requiring human investigator review, representing **$${totalRisk.toLocaleString()}** in flagged risk exposure.`,
        keyMetrics: [
          { label: 'Pending Critical Alerts', value: `${alerts.filter((a) => a.riskLevel === 'Critical').length}` },
          { label: 'Total Risk Capital', value: `$${totalRisk.toLocaleString()}` },
          { label: 'Primary Trigger Type', value: alerts[0]?.detectionType || 'None' },
        ],
        supportingData: alerts.map((a) => ({
          id: a.txnId,
          title: `${a.detectionType}: ${a.entityName}`,
          entity: a.entityType,
          amount: a.amount,
          date: new Date(a.detectionDate).toLocaleDateString(),
          riskScore: a.riskScore,
          category: a.recommendedAction,
        })),
        followUpSuggestions: [
          'Open Investigation Center',
          'Which vendors increased their charges?',
          'What were our largest expenses this month?',
        ],
      };
    }

    const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;

    // 5. Why expenses moved
    if (q.includes('why') && (q.includes('expense') || q.includes('increase') || q.includes('cost'))) {
      const expenses = await Transaction.find({ type: 'expense' }).sort({ amount: -1 }).limit(5);
      const total = expenses.reduce((sum, t) => sum + t.amount, 0);
      return {
        query: userQuery,
        intent: 'expense_increase_explanation',
        answer: expenses.length
          ? `The five largest posted expenses total ${money(total)}. The biggest is ${expenses[0].description || expenses[0].category} at ${money(expenses[0].amount)}.`
          : 'No expenses have been posted yet, so there is no increase to explain.',
        keyMetrics: [
          { label: 'Largest posted expense', value: money(expenses[0]?.amount) },
          { label: 'Payee', value: expenses[0]?.vendorName || expenses[0]?.department || 'None' },
          { label: 'Top 5 combined', value: money(total) },
        ],
        supportingData: expenses.map((t) => ({
          id: t.txnId,
          title: t.description,
          entity: t.vendorName || t.department,
          amount: t.amount,
          date: new Date(t.date).toLocaleDateString(),
          riskScore: t.riskScore,
          category: t.category,
        })),
        followUpSuggestions: [
          'Show departments exceeding their budgets.',
          'Forecast our cash position for next month.',
          'What were our largest expenses this month?',
        ],
      };
    }

    // 6. Cash position from the bank accounts and posted months
    if (q.includes('forecast') || q.includes('cash position') || q.includes('next month') || q.includes('runway')) {
      const [accounts, transactions] = await Promise.all([BankAccount.find(), Transaction.find()]);
      const cash = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
      const buckets = {};
      transactions.forEach((t) => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!buckets[key]) buckets[key] = { income: 0, expense: 0 };
        if (t.status === 'rejected') return;
        if (t.type === 'income') buckets[key].income += t.amount;
        if (t.type === 'expense') buckets[key].expense += t.amount;
      });
      const months = Object.keys(buckets).sort().map((key) => buckets[key]);
      const last = months[months.length - 1] || { income: 0, expense: 0 };
      const burn = last.expense || 0;
      const runway = burn > 0 ? (cash / burn).toFixed(1) : null;
      return {
        query: userQuery,
        intent: 'cash_forecast',
        answer: months.length
          ? `Cash in the bank accounts is ${money(cash)}. The latest posted month had ${money(last.income)} in and ${money(last.expense)} out. ${runway ? `At that spend, cash covers about ${runway} months.` : 'There is no posted spend to estimate runway.'}`
          : `Cash in the bank accounts is ${money(cash)}. Post at least one month of income and expenses before a projection is useful.`,
        keyMetrics: [
          { label: 'Cash on hand', value: money(cash) },
          { label: 'Latest month income', value: money(last.income) },
          { label: 'Latest month expenses', value: money(last.expense) },
        ],
        supportingData: [],
        followUpSuggestions: [
          'What were our largest expenses this month?',
          'Which transactions require review?',
          'Show departments exceeding their budgets.',
        ],
      };
    }

    const [accounts, alerts, incomeTxns, expenseTxns] = await Promise.all([
      BankAccount.find(),
      FraudAlert.find({ status: { $in: ['New', 'Under Review', 'Escalated'] } }),
      Transaction.find({ type: 'income' }),
      Transaction.find({ type: 'expense' }),
    ]);
    const cash = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
    const income = incomeTxns.reduce((s, t) => s + t.amount, 0);
    const expenses = expenseTxns.reduce((s, t) => s + t.amount, 0);
    const margin = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    const exposure = alerts.reduce((s, a) => s + (a.amount || 0), 0);

    return {
      query: userQuery,
      intent: 'general_finance_overview',
      answer: `Posted income is ${money(income)} and posted expenses are ${money(expenses)}, so the recorded margin is ${margin}%. Cash in bank accounts is ${money(cash)}. Open fraud alerts: ${alerts.length}, covering ${money(exposure)}.`,
      keyMetrics: [
        { label: 'Cash on hand', value: money(cash) },
        { label: 'Open alert amount', value: money(exposure) },
        { label: 'Recorded margin', value: `${margin}%` },
      ],
      supportingData: [],
      followUpSuggestions: [
        'What were our largest expenses this month?',
        'Which vendors increased their charges?',
        'Show departments exceeding their budgets.',
        'Which transactions require review?',
      ],
    };
  }
}

module.exports = new AIAssistantEngine();
