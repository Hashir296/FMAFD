require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const financeRoutes = require('./routes/financeRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const fraudRoutes = require('./routes/fraudRoutes');
const investigationRoutes = require('./routes/investigationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiRoutes = require('./routes/aiRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const customerRoutes = require('./routes/customerRoutes');
const claimRoutes = require('./routes/claimRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

const app = express();

app.use((req, _res, next) => {
  if (process.env.VERCEL && req.url && !req.url.startsWith('/api')) {
    req.url = req.url.startsWith('/') ? `/api${req.url}` : `/api/${req.url}`;
  }
  next();
});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Database is not connected.' });
  }
});

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'FinGuard AI - Corporate Finance & Fraud Detection Platform',
    version: '1.0.0',
    timestamp: new Date(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/departments', departmentRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5050;
  app.listen(PORT, () => {
    console.log(`[FinGuard AI Engine] Server actively running on http://localhost:${PORT}`);
  });
}

module.exports = app;
