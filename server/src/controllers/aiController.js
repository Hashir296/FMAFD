const aiFraudEngine = require('../services/aiFraudEngine');
const aiForecastingEngine = require('../services/aiForecastingEngine');
const aiInsightsEngine = require('../services/aiInsightsEngine');
const aiAssistantEngine = require('../services/aiAssistantEngine');
const openRouter = require('../services/openRouter');
const { buildBooksContext } = require('../services/booksContext');
const FraudAlert = require('../models/FraudAlert');
const Transaction = require('../models/Transaction');
const Vendor = require('../models/Vendor');
const Employee = require('../models/Employee');
const Budget = require('../models/Budget');

const BankAccount = require('../models/BankAccount');

const buildMonthlyHistory = (transactions) => {
  const buckets = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) {
      buckets[key] = {
        key,
        month: d.toLocaleString('en-US', { month: 'short' }),
        revenue: 0,
        expenses: 0,
      };
    }
    if (t.status === 'rejected') return;
    if (t.type === 'income') buckets[key].revenue += t.amount;
    if (t.type === 'expense') buckets[key].expenses += t.amount;
  });
  return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
};

// @desc    Get live financial briefing from the ledger
// @route   GET /api/ai/briefing
const getBriefing = async (req, res) => {
  try {
    const insights = await aiInsightsEngine.generateExecutiveBriefing();
    res.json({ success: true, count: insights.length, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getInsights = async (req, res) => {
  try {
    const insights = await aiInsightsEngine.generateExecutiveBriefing();
    res.json({ success: true, count: insights.length, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Project the next months from posted transactions
// @route   GET /api/ai/forecast
const getForecast = async (req, res) => {
  try {
    const [transactions, accounts] = await Promise.all([Transaction.find(), BankAccount.find()]);
    const history = buildMonthlyHistory(transactions);
    const cash = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
    const forecast = aiForecastingEngine.generateForecast(history, cash);
    res.json({ success: true, data: forecast });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Anomaly Detection matrix across Txns, Vendors, Employees, Departments
// @route   GET /api/ai/anomalies
const getAnomalies = async (req, res) => {
  try {
    const [txnAnomalies, vendorAnomalies, employeeAnomalies, budgetAnomalies] = await Promise.all([
      Transaction.find({ riskScore: { $gte: 60 } }).sort({ riskScore: -1 }).limit(8),
      Vendor.find({ riskScore: { $gte: 40 } }).sort({ riskScore: -1 }).limit(6),
      Employee.find({ riskScore: { $gte: 35 } }).sort({ riskScore: -1 }).limit(6),
      Budget.find({ status: { $in: ['Near Limit', 'Over Budget'] } }).sort({ actualSpent: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        transactions: txnAnomalies,
        vendors: vendorAnomalies,
        employees: employeeAnomalies,
        departments: budgetAnomalies,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Chat with AI Finance Assistant
// @route   POST /api/ai/assistant/chat
const chatAssistant = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      const response = await aiAssistantEngine.processQuery(query);
      return res.json({ success: true, data: response });
    }

    const books = await buildBooksContext();
    const { text, model } = await openRouter.chat([
      { role: 'system', content: openRouter.SYSTEM },
      {
        role: 'user',
        content: `Posted books:\n${JSON.stringify(books)}\n\nQuestion: ${String(query).trim()}`,
      },
    ]);

    res.json({
      success: true,
      data: {
        query,
        intent: 'books',
        answer: text,
        model,
        keyMetrics: [
          { label: 'Income', value: books.totals.income },
          { label: 'Expenses', value: books.totals.expenses },
          { label: 'Cash', value: books.totals.cash },
        ],
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const writeReview = async (req, res) => {
  try {
    const books = await buildBooksContext();
    const { text, model } = await openRouter.chat([
      { role: 'system', content: openRouter.SYSTEM },
      {
        role: 'user',
        content: `Write a short finance-desk review of these posted books. Mention cash, profit, any budget that is over its amount, overdue invoices, and open fraud alerts. Four to six sentences.\n${JSON.stringify(books)}`,
      },
    ]);
    res.json({ success: true, data: { review: text, model, asOf: books.asOf } });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const explainAlert = async (req, res) => {
  try {
    const alert = await FraudAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const { text, model } = await openRouter.chat([
      { role: 'system', content: openRouter.SYSTEM },
      {
        role: 'user',
        content: `Explain this fraud alert for a finance reviewer in three or four sentences. The risk score was already calculated by the desk rules. Do not change the score. Say what to check next.\n${JSON.stringify({
          id: alert.alertId,
          entity: alert.entityName,
          amount: alert.amount,
          riskScore: alert.riskScore,
          riskLevel: alert.riskLevel,
          type: alert.detectionType,
          status: alert.status,
          reasons: alert.reasons,
          evidence: alert.evidence,
          recommendedAction: alert.recommendedAction,
        })}`,
      },
    ]);

    alert.modelNote = text;
    await alert.save();
    res.json({ success: true, data: { explanation: text, model } });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    On-demand AI transaction risk scoring
// @route   POST /api/ai/score-transaction
const scoreTransaction = async (req, res) => {
  try {
    const { transaction, vendorContext } = req.body;
    const result = await aiFraudEngine.analyzeTransaction(transaction, vendorContext || {});
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBriefing,
  getInsights,
  getForecast,
  getAnomalies,
  chatAssistant,
  writeReview,
  explainAlert,
  scoreTransaction,
};
