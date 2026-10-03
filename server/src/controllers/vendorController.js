const Vendor = require('../models/Vendor');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const { logAudit } = require('../middleware/auditLogger');

// @desc    Get all vendors with filtering
// @route   GET /api/vendors
const getVendors = async (req, res) => {
  try {
    const { category, riskLevel, search } = req.query;
    const query = {};

    if (category) query.category = category;
    if (riskLevel) query.riskLevel = riskLevel;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { vendorId: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const vendors = await Vendor.find(query).sort({ totalSpending: -1 });
    res.json({ success: true, count: vendors.length, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single vendor with full profile and AI risk analysis
// @route   GET /api/vendors/:id
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const [transactions, invoices] = await Promise.all([
      Transaction.find({ vendorName: vendor.name }).sort({ date: -1 }).limit(20),
      Invoice.find({ vendorName: vendor.name }).sort({ dueDate: -1 }).limit(10),
    ]);

    // AI Behavioral Analysis Synthesis
    const aiAnalysis = {
      vendorRiskScore: vendor.riskScore,
      riskLevel: vendor.riskLevel,
      spendingSpikeRatio: vendor.recentSpendSpikeRatio || 1.1,
      isBankDetailsRecent: !!vendor.accountDetailsLastModified && (new Date() - new Date(vendor.accountDetailsLastModified)) < 1000 * 60 * 60 * 24 * 30,
      detectedAnomalies: vendor.riskFactors || [],
      spendingTrend: vendor.totalSpending > 50000 ? 'Accelerating Outflows' : 'Consistent Outflows',
      recommendedAction: vendor.riskLevel === 'Critical' || vendor.riskLevel === 'High'
        ? 'Mandatory manual validation of bank routing with vendor CFO before issuing further disbursements.'
        : 'Approved for automated batch payment runs.',
    };

    res.json({
      success: true,
      data: vendor,
      transactions,
      invoices,
      aiAnalysis,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new vendor
// @route   POST /api/vendors
const createVendor = async (req, res) => {
  try {
    const count = await Vendor.countDocuments();
    const vendorId = `VND-${String(100 + count + 1)}`;

    const vendor = await Vendor.create({
      ...req.body,
      vendorId,
      totalSpending: 0,
      transactionCount: 0,
      avgTransaction: 0,
      riskScore: 10,
      riskLevel: 'Low',
      status: 'Active',
    });

    await logAudit({
      req,
      action: 'Vendor Onboarded',
      module: 'Vendors',
      recordId: vendor.vendorId,
      recordType: 'Vendor',
      newValue: { name: vendor.name, category: vendor.category },
      details: `Onboarded vendor ${vendor.name}`,
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update vendor details (e.g. banking, category, status)
// @route   PUT /api/vendors/:id
const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const prevBank = vendor.bankAccount;
    const isBankChanged = req.body.bankAccount && req.body.bankAccount !== prevBank;

    Object.assign(vendor, req.body);

    if (isBankChanged) {
      vendor.accountDetailsLastModified = new Date();
      if (!vendor.riskFactors.includes('Recently modified bank account coordinates')) {
        vendor.riskFactors.push('Recently modified bank account coordinates');
      }
      vendor.riskScore = Math.min(100, vendor.riskScore + 35);
      vendor.riskLevel = vendor.riskScore > 60 ? 'High' : 'Medium';
    }

    await vendor.save();

    await logAudit({
      req,
      action: isBankChanged ? 'Vendor Bank Details Altered' : 'Vendor Profile Updated',
      module: 'Vendors',
      recordId: vendor.vendorId,
      recordType: 'Vendor',
      previousValue: { bankAccount: prevBank },
      newValue: { bankAccount: vendor.bankAccount, riskScore: vendor.riskScore },
      details: `Updated vendor ${vendor.name} ${isBankChanged ? '(BANK ACCOUNT ALTERATION FLAGGED)' : ''}`,
    });

    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getVendors, getVendorById, createVendor, updateVendor };
