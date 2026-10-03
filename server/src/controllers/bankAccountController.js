const BankAccount = require('../models/BankAccount');
const { postLedgerEntry } = require('../services/ledger');

// @desc    Get all bank accounts
// @route   GET /api/bank-accounts
const getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find().sort({ currentBalance: -1 });
    const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
    res.json({ success: true, count: accounts.length, totalBalance, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create bank account
// @route   POST /api/bank-accounts
const createBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.create(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const transferBetweenAccounts = async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, description = '' } = req.body;
    const value = Number(amount);
    if (!fromAccount || !toAccount || fromAccount === toAccount) {
      return res.status(400).json({ success: false, message: 'Choose two different accounts.' });
    }
    if (!value || value <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a transfer amount.' });
    }
    const posted = await postLedgerEntry(req, {
      type: 'transfer',
      category: 'Internal transfer',
      description: description || `Transfer from ${fromAccount} to ${toAccount}`,
      department: 'Finance',
      amount: value,
      bankAccountName: fromAccount,
      counterAccountName: toAccount,
      paymentMethod: 'ACH',
    });
    res.status(201).json({ success: true, data: posted.transaction, alert: posted.alert });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const reconcileAccount = async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found.' });
    const statementBalance = Number(req.body.statementBalance);
    if (Number.isNaN(statementBalance)) {
      return res.status(400).json({ success: false, message: 'Enter the balance printed on the bank statement.' });
    }
    const difference = Number((account.currentBalance - statementBalance).toFixed(2));
    if (Math.abs(difference) > 0.009) {
      return res.status(400).json({
        success: false,
        message: `Books show $${account.currentBalance.toLocaleString()} and the statement shows $${statementBalance.toLocaleString()}. Difference $${difference.toLocaleString()}. The account stays unreconciled.`,
        difference,
      });
    }
    account.lastReconciliationDate = new Date();
    await account.save();
    res.json({ success: true, data: account, message: 'Statement matches the books. Reconciliation date updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBankAccounts, createBankAccount, transferBetweenAccounts, reconcileAccount };
