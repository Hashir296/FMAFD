const Customer = require('../models/Customer');
const { logAudit } = require('../middleware/auditLogger');

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }
    const customers = await Customer.find(query).sort({ outstandingBalance: -1, name: 1 });
    const outstanding = customers.reduce((sum, customer) => sum + (customer.outstandingBalance || 0), 0);
    res.json({ success: true, count: customers.length, outstanding, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, company, email, phone = '', address = '', creditLimit = 0, paymentTerms = 'Net 30' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Customer name and email are required.' });
    }
    const count = await Customer.countDocuments();
    const customer = await Customer.create({
      customerId: `CUS-${String(100 + count + 1)}`,
      name,
      company: company || name,
      email,
      phone,
      address,
      creditLimit: Number(creditLimit) || 0,
      paymentTerms,
      outstandingBalance: 0,
      status: 'Active',
    });
    await logAudit({
      req,
      action: 'Customer Created',
      module: 'Invoices',
      recordId: customer.customerId,
      recordType: 'Customer',
      newValue: { name: customer.name, email: customer.email },
      details: `Added customer ${customer.name}`,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCustomers, createCustomer };
