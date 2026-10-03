import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { RiskBadge, StatusBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Download,
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const TYPE_OPTIONS = ['All', 'income', 'expense', 'transfer', 'refund'];
const STATUS_OPTIONS = ['All', 'completed', 'pending', 'flagged', 'under_review', 'rejected'];

export const TransactionsPage = () => {
  const { showToast } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'All',
    status: 'All',
    page: 1,
    limit: 15,
  });
  const [showForm, setShowForm] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [entry, setEntry] = useState({
    type: 'expense',
    amount: '',
    category: '',
    department: 'Finance',
    description: '',
    vendorName: '',
    customerName: '',
    employeeName: '',
    bankAccountName: '',
    counterAccountName: '',
    paymentMethod: 'ACH',
    isRecurring: false,
    recurringInterval: 'Monthly',
  });
  const [pagination, setPagination] = useState({});
  const [trendData, setTrendData] = useState([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.type !== 'All' && { type: filters.type }),
        ...(filters.status !== 'All' && { status: filters.status }),
      };
      const [txRes, statsRes] = await Promise.all([
        api.get('/transactions', params),
        api.get('/transactions/stats'),
      ]);
      setTransactions(txRes.data || []);
      setPagination({ page: txRes.page, pages: txRes.pages, total: txRes.total });
      setStats(statsRes.data || {});
      setTrendData(statsRes.data?.trend || []);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not load transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    api.get('/bank-accounts').then((res) => setAccounts(res.data || [])).catch(() => setAccounts([]));
  }, []);

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v || 0);

  const columns = [
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm truncate max-w-[200px]">{row.description}</p>
          <p className="text-xs text-slate-400">{row.txnId}</p>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (row) => <StatusBadge status={row.category} /> },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span className={`font-semibold text-sm ${row.type === 'income' || row.type === 'refund' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {row.type === 'income' || row.type === 'refund' ? '+' : '-'}
          {fmt(row.amount)}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'riskScore',
      label: 'Risk',
      render: (row) => <RiskBadge score={row.riskScore} />,
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <span className="text-sm text-slate-500">
          {new Date(row.date || row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: () => null,
    },
  ];

  const recordEntry = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post('/transactions', {
        ...entry,
        amount: Number(entry.amount),
      });
      const risk = res.aiAnalysis?.riskScore;
      showToast(
        risk >= 60 ? `Posted. Risk score ${risk}. An alert was opened.` : `Posted to the ledger. Risk score ${risk}.`,
        risk >= 60 ? 'error' : 'success'
      );
      setShowForm(false);
      setEntry({ type: 'expense', amount: '', category: '', department: 'Finance', description: '', vendorName: '', customerName: '', employeeName: '', bankAccountName: '', counterAccountName: '', paymentMethod: 'ACH', isRecurring: false, recurringInterval: 'Monthly' });
      fetchTransactions();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor all financial transactions and flag anomalies</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const res = await api.get('/transactions', { ...filters, page: 1, limit: 1000 });
                const rows = res.data || [];
                const header = ['Date', 'ID', 'Type', 'Description', 'Category', 'Department', 'Amount', 'Status', 'Account', 'Vendor', 'Employee'];
                const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
                const lines = [
                  header.join(','),
                  ...rows.map((row) => [
                    row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
                    row.txnId,
                    row.type,
                    row.description,
                    row.category,
                    row.department,
                    row.amount,
                    row.status,
                    row.bankAccountName,
                    row.vendorName,
                    row.employeeName,
                  ].map(escape).join(',')),
                ];
                const file = new Blob([lines.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(file);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'ledger.csv';
                link.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                showToast(err.message, 'error');
              }
            }}
            className="px-4 py-2 border border-[#1C2B24] rounded-md text-sm"
          >
            Export CSV
          </button>
          <button onClick={() => setShowForm((open) => !open)} className="px-4 py-2 bg-[#1C2B24] text-white rounded-md text-sm">
            Record entry
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={recordEntry} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-sm text-[#6B6256]">Posting updates the bank balance. An expense also increases that department's spent amount. A score of 60 or more opens a fraud alert.</p>
          <label className="text-sm">Type
            <select value={entry.type} onChange={(e) => setEntry((f) => ({ ...f, type: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2 bg-white">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="refund">Refund</option>
              <option value="transfer">Transfer between accounts</option>
            </select>
          </label>
          <label className="text-sm">Bank account
            <select required value={entry.bankAccountName} onChange={(e) => setEntry((f) => ({ ...f, bankAccountName: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2 bg-white">
              <option value="">Choose</option>
              {accounts.map((account) => <option key={account._id}>{account.accountName}</option>)}
            </select>
          </label>
          {entry.type === 'transfer' && (
            <label className="text-sm">Destination account
              <select required value={entry.counterAccountName} onChange={(e) => setEntry((f) => ({ ...f, counterAccountName: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2 bg-white">
                <option value="">Choose</option>
                {accounts.map((account) => <option key={account._id}>{account.accountName}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm">Amount
            <input required type="number" min="0.01" step="0.01" value={entry.amount} onChange={(e) => setEntry((f) => ({ ...f, amount: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Category
            <input required value={entry.category} onChange={(e) => setEntry((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Department
            <input required value={entry.department} onChange={(e) => setEntry((f) => ({ ...f, department: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">Description
            <input required value={entry.description} onChange={(e) => setEntry((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Vendor name
            <input value={entry.vendorName} onChange={(e) => setEntry((f) => ({ ...f, vendorName: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Customer name
            <input value={entry.customerName} onChange={(e) => setEntry((f) => ({ ...f, customerName: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Employee name
            <input value={entry.employeeName} onChange={(e) => setEntry((f) => ({ ...f, employeeName: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Method
            <select value={entry.paymentMethod} onChange={(e) => setEntry((f) => ({ ...f, paymentMethod: e.target.value }))} className="mt-1 w-full border border-[#DDD4C4] rounded-md px-3 py-2 bg-white">
              <option>ACH</option>
              <option>Wire Transfer</option>
              <option>Check</option>
              <option>Corporate Card</option>
            </select>
          </label>
          <label className="text-sm flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={entry.isRecurring} onChange={(e) => setEntry((f) => ({ ...f, isRecurring: e.target.checked }))} />
            Repeat this entry. It will show on the Recurring desk.
          </label>
          <div className="sm:col-span-2">
            <button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Post to ledger</button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Volume"
          value={fmt(stats.totalVolume)}
          icon={DollarSign}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Total Credit"
          value={fmt(stats.totalCredit)}
          icon={TrendingUp}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title="Total Debit"
          value={fmt(stats.totalDebit)}
          icon={TrendingDown}
          color="rose"
          loading={loading}
        />
        <StatCard
          title="Flagged"
          value={stats.flaggedCount || 0}
          icon={AlertTriangle}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Transaction Trend (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Area type="monotone" dataKey="total" stroke="#3B82F6" fill="url(#txGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          >
            {TYPE_OPTIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={fetchTransactions}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        emptyMessage="No transactions found"
        pagination={pagination}
        onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
      />
    </div>
  );
};
