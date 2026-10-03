const Department = require('../models/Department');
const Employee = require('../models/Employee');
const Budget = require('../models/Budget');
const { logAudit } = require('../middleware/auditLogger');

const getDepartments = async (req, res) => {
  try {
    const [departments, employees, budgets] = await Promise.all([
      Department.find().sort({ name: 1 }),
      Employee.find({ status: 'Active' }),
      Budget.find(),
    ]);
    const data = departments.map((department) => {
      const people = employees.filter((person) => person.department === department.name);
      const budget = budgets.find((line) => line.department === department.name);
      return {
        ...department.toObject(),
        headcount: people.length,
        currentSpend: budget ? budget.actualSpent : 0,
        allocatedBudget: budget ? budget.allocatedAmount : department.allocatedBudget,
        budgetStatus: budget ? budget.status : 'No budget',
      };
    });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code, managerName, managerEmail } = req.body;
    if (!name || !code || !managerName || !managerEmail) {
      return res.status(400).json({ success: false, message: 'Name, code, manager, and manager email are required.' });
    }
    const department = await Department.create({
      name,
      code,
      managerName,
      managerEmail,
      allocatedBudget: 0,
      currentSpend: 0,
      headcount: 0,
      status: 'Active',
    });
    await logAudit({
      req,
      action: 'Department Created',
      module: 'Employees',
      recordId: department.code,
      recordType: 'Department',
      details: `Opened department ${department.name}`,
    });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDepartments, createDepartment };
