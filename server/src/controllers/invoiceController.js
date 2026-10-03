const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Payment = require('../models/Payment');
const { logAudit } = require('../middleware/auditLogger');
const { postLedgerEntry } = require('../services/ledger');

// @desc    Get all invoices with filtering
// @route   GET /api/invoices
const getInvoices = async (req, res) => {
  try {
    await Invoice.updateMany(
      {
        status: { $in: ['sent', 'partially_paid'] },
        balanceDue: { $gt: 0 },
        dueDate: { $lt: new Date() },
      },
      { $set: { status: 'overdue' } }
    );

    const { type, status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
      ];
    }

    const invoices = await Invoice.find(query).sort({ dueDate: 1 }).limit(Number(limit));
    const total = await Invoice.countDocuments(query);

    res.json({ success: true, count: invoices.length, total, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Accounts Receivable aging breakdown
// @route   GET /api/invoices/receivables/aging
const getReceivablesAging = async (req, res) => {
  try {
    const invoices = await Invoice.find({ type: 'receivable', status: { $nin: ['paid', 'void'] } });
    const now = new Date();

    const aging = {
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0,
      totalReceivables: 0,
    };

    const categorizedInvoices = [];

    invoices.forEach((inv) => {
      const due = new Date(inv.dueDate);
      const diffTime = now - due;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const balance = inv.balanceDue || inv.totalAmount;

      aging.totalReceivables += balance;

      let bucket = 'Current';
      if (diffDays <= 0) {
        aging.current += balance;
        bucket = 'Current';
      } else if (diffDays <= 30) {
        aging.days1To30 += balance;
        bucket = '1-30 Days';
      } else if (diffDays <= 60) {
        aging.days31To60 += balance;
        bucket = '31-60 Days';
      } else if (diffDays <= 90) {
        aging.days61To90 += balance;
        bucket = '61-90 Days';
      } else {
        aging.days90Plus += balance;
        bucket = '90+ Days';
      }

      categorizedInvoices.push({
        ...inv.toObject(),
        overdueDays: Math.max(0, diffDays),
        agingBucket: bucket,
      });
    });

    res.json({ success: true, summary: aging, invoices: categorizedInvoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Accounts Payable obligations breakdown
// @route   GET /api/invoices/payables/obligations
const getPayablesObligations = async (req, res) => {
  try {
    const invoices = await Invoice.find({ type: 'payable' }).sort({ dueDate: 1 });
    const now = new Date();

    const summary = {
      totalOutstanding: 0,
      dueSoon: 0,
      overdue: 0,
      paidCount: 0,
      paidTotal: 0,
    };

    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        summary.paidCount += 1;
        summary.paidTotal += inv.totalAmount;
      } else {
        summary.totalOutstanding += inv.balanceDue;
        const diffDays = Math.floor((new Date(inv.dueDate) - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          summary.overdue += inv.balanceDue;
        } else if (diffDays <= 14) {
          summary.dueSoon += inv.balanceDue;
        }
      }
    });

    res.json({ success: true, summary, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customerRef')
      .populate('vendorRef');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const relatedTransactions = await Transaction.find({
      $or: [
        { invoiceNumber: invoice.invoiceNumber },
        { vendorName: invoice.vendorName, vendorName: { $ne: '' } },
        { customerName: invoice.customerName, customerName: { $ne: '' } },
      ],
    }).limit(5);

    res.json({ success: true, data: invoice, relatedTransactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
const createInvoice = async (req, res) => {
  try {
    const {
      type,
      customerName,
      vendorName,
      department = 'Finance',
      issueDate = new Date(),
      dueDate,
      items = [],
      tax = 0,
      paymentTerms = 'Net 30',
      notes = '',
    } = req.body;

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalAmount = subtotal + Number(tax);
    const balanceDue = totalAmount;

    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(2000 + count + 1)}`;

    const customer = customerName ? await Customer.findOne({ name: customerName }) : null;
    const vendor = vendorName ? await Vendor.findOne({ name: vendorName }) : null;
    if (customer) {
      customer.outstandingBalance = (customer.outstandingBalance || 0) + totalAmount;
      customer.status = customer.creditLimit > 0 && customer.outstandingBalance > customer.creditLimit ? 'Delinquent' : customer.status;
      await customer.save();
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      type,
      customerName: customerName || '',
      customerRef: customer?._id,
      vendorName: vendorName || '',
      vendorRef: vendor?._id,
      department,
      issueDate,
      dueDate,
      items,
      subtotal,
      tax: Number(tax),
      totalAmount,
      amountPaid: 0,
      balanceDue,
      status: 'sent',
      paymentTerms,
      notes,
    });

    await logAudit({
      req,
      action: 'Invoice Created',
      module: 'Invoices',
      recordId: invoice.invoiceNumber,
      recordType: 'Invoice',
      newValue: { totalAmount, recipient: customerName || vendorName },
      details: `Created invoice ${invoice.invoiceNumber} for $${totalAmount.toLocaleString()}`,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record payment against invoice
// @route   POST /api/invoices/:id/pay
const recordPayment = async (req, res) => {
  try {
    const { amount, method = 'ACH', reference = '' } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a payment amount.' });
    }
    if (payAmt > invoice.balanceDue + 0.001) {
      return res.status(400).json({ success: false, message: 'Payment is larger than the balance due.' });
    }
    if (invoice.status === 'disputed') {
      return res.status(400).json({ success: false, message: 'This invoice is disputed. Release the dispute before paying it.' });
    }
    if (invoice.status === 'void') {
      return res.status(400).json({ success: false, message: 'This invoice was voided.' });
    }
    if (invoice.status === 'paid' || invoice.balanceDue <= 0) {
      return res.status(400).json({ success: false, message: 'This invoice is already paid.' });
    }

    const posted = await postLedgerEntry(req, {
      type: invoice.type === 'receivable' ? 'income' : 'expense',
      category: invoice.type === 'receivable' ? 'Customer receipt' : 'Vendor payment',
      description: `Payment on ${invoice.invoiceNumber}`,
      department: invoice.department || 'Finance',
      vendorName: invoice.vendorName,
      customerName: invoice.customerName,
      amount: payAmt,
      paymentMethod: method === 'Check' ? 'Check' : method,
      bankAccountName: req.body.bankAccountName || '',
      invoiceNumber: invoice.invoiceNumber,
    });

    invoice.amountPaid += payAmt;
    invoice.balanceDue = Math.max(0, Number((invoice.totalAmount - invoice.amountPaid).toFixed(2)));

    if (invoice.balanceDue === 0) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partially_paid';
    }

    const paymentReference = reference || `REF-${Date.now().toString().slice(-6)}`;
    invoice.paymentHistory.push({
      paymentDate: new Date(),
      amount: payAmt,
      method,
      reference: paymentReference,
    });

    await invoice.save();

    if (invoice.customerName && invoice.type === 'receivable') {
      const customer = await Customer.findOne({ name: invoice.customerName });
      if (customer) {
        customer.outstandingBalance = Math.max(0, (customer.outstandingBalance || 0) - payAmt);
        customer.status = customer.outstandingBalance > 0 && customer.creditLimit && customer.outstandingBalance > customer.creditLimit
          ? 'Delinquent'
          : 'Active';
        await customer.save();
      }
    }

    await Payment.create({
      paymentNumber: `PAY-${Date.now().toString().slice(-8)}`,
      invoiceRef: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      transactionRef: posted.transaction._id,
      amount: payAmt,
      paymentDate: new Date(),
      method: ['ACH', 'Wire Transfer', 'Check', 'Card', 'Other'].includes(method) ? method : 'ACH',
      reference: paymentReference,
      payer: invoice.type === 'receivable' ? invoice.customerName : 'Company',
      payee: invoice.type === 'payable' ? invoice.vendorName : 'Company',
    });

    await logAudit({
      req,
      action: 'Payment Applied to Invoice',
      module: 'Invoices',
      recordId: invoice.invoiceNumber,
      recordType: 'Invoice',
      newValue: { amountPaid: invoice.amountPaid, balanceDue: invoice.balanceDue, status: invoice.status },
      details: `Applied payment of $${payAmt.toLocaleString()} to ${invoice.invoiceNumber}`,
    });

    res.json({ success: true, data: invoice, transaction: posted.transaction, alert: posted.alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const applyCredit = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const credit = Number(req.body.amount);
    if (!credit || credit <= 0) return res.status(400).json({ success: false, message: 'Enter a credit amount.' });
    if (credit > invoice.balanceDue + 0.001) {
      return res.status(400).json({ success: false, message: 'Credit is larger than the balance due.' });
    }
    invoice.totalAmount = Math.max(0, Number((invoice.totalAmount - credit).toFixed(2)));
    invoice.balanceDue = Math.max(0, Number((invoice.balanceDue - credit).toFixed(2)));
    if (invoice.balanceDue === 0) invoice.status = 'paid';
    invoice.paymentHistory.push({
      paymentDate: new Date(),
      amount: credit,
      method: 'Credit',
      reference: req.body.reason || 'Credit memo',
    });
    invoice.notes = [invoice.notes, `Credit $${credit.toLocaleString()}: ${req.body.reason || 'no reason given'}`].filter(Boolean).join(' ');
    await invoice.save();
    if (invoice.customerName && invoice.type === 'receivable') {
      const customer = await Customer.findOne({ name: invoice.customerName });
      if (customer) {
        customer.outstandingBalance = Math.max(0, (customer.outstandingBalance || 0) - credit);
        await customer.save();
      }
    }
    await logAudit({
      req,
      action: 'Credit Memo Applied',
      module: 'Invoices',
      recordId: invoice.invoiceNumber,
      recordType: 'Invoice',
      details: `Credited $${credit.toLocaleString()} on ${invoice.invoiceNumber}. Cash did not move.`,
    });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const voidInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.amountPaid > 0) {
      return res.status(400).json({ success: false, message: 'A payment has already been applied. Credit the balance instead of voiding it.' });
    }
    if (invoice.status === 'void') {
      return res.status(400).json({ success: false, message: 'This invoice is already void.' });
    }
    const cleared = invoice.balanceDue;
    invoice.status = 'void';
    invoice.balanceDue = 0;
    invoice.notes = [invoice.notes, req.body.reason || 'Voided before payment'].filter(Boolean).join(' ');
    await invoice.save();
    if (invoice.customerName && invoice.type === 'receivable' && cleared > 0) {
      const customer = await Customer.findOne({ name: invoice.customerName });
      if (customer) {
        customer.outstandingBalance = Math.max(0, (customer.outstandingBalance || 0) - cleared);
        await customer.save();
      }
    }
    await logAudit({
      req,
      action: 'Invoice Voided',
      module: 'Invoices',
      recordId: invoice.invoiceNumber,
      recordType: 'Invoice',
      details: `Voided ${invoice.invoiceNumber}. No cash moved.`,
    });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const releaseDispute = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status !== 'disputed') {
      return res.status(400).json({ success: false, message: 'This invoice is not disputed.' });
    }
    const overdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.balanceDue > 0;
    invoice.status = invoice.amountPaid > 0 ? 'partially_paid' : overdue ? 'overdue' : 'sent';
    await invoice.save();
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const disputeInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (!['sent', 'partially_paid', 'overdue'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'Only an open invoice can be disputed.' });
    }
    invoice.status = 'disputed';
    invoice.notes = [invoice.notes, req.body.reason || 'Disputed'].filter(Boolean).join(' ');
    await invoice.save();
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvoices,
  getReceivablesAging,
  getPayablesObligations,
  getInvoiceById,
  createInvoice,
  recordPayment,
  applyCredit,
  disputeInvoice,
  voidInvoice,
  releaseDispute,
};
