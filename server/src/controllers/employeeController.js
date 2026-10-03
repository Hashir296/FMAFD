const Employee = require('../models/Employee');
const Transaction = require('../models/Transaction');
const BankAccount = require('../models/BankAccount');
const { postLedgerEntry } = require('../services/ledger');

// @desc    Get all employees with spending and risk metrics
// @route   GET /api/employees
const getEmployees = async (req, res) => {
  try {
    const { department, riskLevel, search } = req.query;
    const query = {};

    if (department) query.department = department;
    if (riskLevel) query.riskLevel = riskLevel;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(query).sort({ currentMonthSpend: -1 });
    res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single employee profile with transactions and spending analytics
// @route   GET /api/employees/:id
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const transactions = await Transaction.find({ employeeName: employee.name }).sort({ date: -1 });

    // Category breakdown for employee
    const catMap = {};
    transactions.forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    const categories = Object.entries(catMap).map(([name, amount]) => ({ name, amount }));

    res.json({
      success: true,
      data: employee,
      transactions,
      spendingAnalytics: {
        totalSpent: transactions.reduce((s, t) => s + t.amount, 0),
        claimCount: transactions.length,
        averageClaim: transactions.length > 0 ? Math.round(transactions.reduce((s, t) => s + t.amount, 0) / transactions.length) : 0,
        monthlyAllowance: employee.monthlySpendLimit,
        utilizationPercent: Math.round((employee.currentMonthSpend / (employee.monthlySpendLimit || 1)) * 100),
        categories,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { name, email, department, role, jobTitle, phone, location, salary, monthlySpendLimit } = req.body;
    if (!name || !email || !department || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, department, and role are required.' });
    }
    const exists = await Employee.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'An employee with this email already exists.' });

    const employee = await Employee.create({
      employeeId: `EMP-${Date.now().toString().slice(-6)}`,
      name,
      email,
      department,
      role,
      jobTitle: jobTitle || role,
      phone: phone || '',
      location: location || '',
      salary: Number(salary) || 0,
      monthlySpendLimit: Number(monthlySpendLimit) || 5000,
      status: 'Active',
      joinedDate: new Date(),
    });
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const fields = ['name', 'email', 'department', 'role', 'jobTitle', 'phone', 'location', 'status', 'salary', 'monthlySpendLimit'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) employee[field] = req.body[field];
    });
    await employee.save();
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runPayroll = async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const marker = `PAYROLL-${month}`;
    const already = await Transaction.findOne({ invoiceNumber: marker, status: { $ne: 'rejected' } });
    if (already) {
      return res.status(400).json({ success: false, message: `Payroll for ${month} is already on the books.` });
    }
    const people = await Employee.find({ status: 'Active', salary: { $gt: 0 } });
    if (!people.length) {
      return res.status(400).json({ success: false, message: 'No active employee has a salary on file.' });
    }
    const account = req.body.bankAccountName
      ? await BankAccount.findOne({ accountName: req.body.bankAccountName, status: 'Active' })
      : await BankAccount.findOne({ accountType: 'Payroll', status: 'Active' });
    if (!account) {
      return res.status(400).json({ success: false, message: 'Choose an active bank account for payroll.' });
    }
    const lines = people.map((person) => ({
      person,
      amount: Math.round((person.salary / 12) * 100) / 100,
    }));
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    if (account.currentBalance < total) {
      return res.status(400).json({ success: false, message: `${account.accountName} has $${account.currentBalance.toLocaleString()}, and this payroll is $${total.toLocaleString()}.` });
    }
    const posted = [];
    for (const line of lines) {
      const result = await postLedgerEntry(req, {
        type: 'expense',
        category: 'Payroll',
        description: `Salary ${month} — ${line.person.name}`,
        department: line.person.department || 'Finance',
        employeeName: line.person.name,
        amount: line.amount,
        bankAccountName: account.accountName,
        paymentMethod: 'Direct Deposit',
        invoiceNumber: marker,
      });
      posted.push(result.transaction.txnId);
    }
    res.status(201).json({ success: true, month, count: posted.length, total, account: account.accountName, transactions: posted });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getEmployees, getEmployeeById, createEmployee, updateEmployee, runPayroll };
