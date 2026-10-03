const Budget = require('../models/Budget');
const Department = require('../models/Department');
const { logAudit } = require('../middleware/auditLogger');

// @desc    Get all budgets with department utilization analysis
// @route   GET /api/budgets
const getBudgets = async (req, res) => {
  try {
    const { fiscalYear = 2026, quarter } = req.query;
    const query = { fiscalYear: Number(fiscalYear) };
    if (quarter) query.quarter = quarter;

    const budgets = await Budget.find(query).sort({ actualSpent: -1 });

    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.actualSpent, 0);
    const totalRemaining = totalAllocated - totalSpent;
    const overallUtilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

    // Categorize status counts
    const overBudgetCount = budgets.filter((b) => b.status === 'Over Budget').length;
    const nearLimitCount = budgets.filter((b) => b.status === 'Near Limit').length;
    const healthyCount = budgets.filter((b) => b.status === 'Healthy').length;

    res.json({
      success: true,
      summary: {
        totalAllocated,
        totalSpent,
        totalRemaining,
        overallUtilization,
        overBudgetCount,
        nearLimitCount,
        healthyCount,
      },
      data: budgets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new budget
// @route   POST /api/budgets
const createBudget = async (req, res) => {
  try {
    const { department, category = 'Overall Operations', fiscalYear = 2026, quarter = 'Q3', allocatedAmount, notes = '' } = req.body;

    const allocated = Number(allocatedAmount);
    const budget = await Budget.create({
      department,
      category,
      fiscalYear: Number(fiscalYear),
      quarter,
      allocatedAmount: allocated,
      actualSpent: 0,
      status: 'Healthy',
      notes,
    });

    await logAudit({
      req,
      action: 'Budget Created',
      module: 'Budgets',
      recordId: budget._id,
      recordType: 'Budget',
      newValue: { department, allocatedAmount: allocated, quarter },
      details: `Created budget for ${department} (${quarter} ${fiscalYear}): $${allocated.toLocaleString()}`,
    });

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update budget allocation or actuals
// @route   PUT /api/budgets/:id
const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const prevAllocated = budget.allocatedAmount;
    if (req.body.allocatedAmount !== undefined) budget.allocatedAmount = Number(req.body.allocatedAmount);
    if (req.body.actualSpent !== undefined) budget.actualSpent = Number(req.body.actualSpent);
    if (req.body.notes !== undefined) budget.notes = req.body.notes;

    // Recalculate status
    const utilization = budget.allocatedAmount > 0 ? (budget.actualSpent / budget.allocatedAmount) * 100 : 0;
    if (utilization >= 100) {
      budget.status = 'Over Budget';
    } else if (utilization >= (budget.alertThresholdPercent || 85)) {
      budget.status = 'Near Limit';
    } else {
      budget.status = 'Healthy';
    }

    await budget.save();

    await logAudit({
      req,
      action: 'Budget Updated',
      module: 'Budgets',
      recordId: budget._id,
      recordType: 'Budget',
      previousValue: { allocatedAmount: prevAllocated },
      newValue: { allocatedAmount: budget.allocatedAmount, status: budget.status },
      details: `Updated budget for ${budget.department}`,
    });

    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    await budget.deleteOne();
    res.json({ success: true, message: 'Budget removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget };
