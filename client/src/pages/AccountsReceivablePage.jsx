import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { TrendingUp, DollarSign, Clock, CheckCircle2, Search } from 'lucide-react';

export const AccountsReceivablePage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/invoices', { type: 'receivable' });
        setInvoices(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v || 0);

  const filtered = invoices.filter((i) =>
    search ? i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) : true
  );

  const totalOutstanding = filtered.reduce((s, i) => s + (i.balanceDue ?? (i.totalAmount - (i.amountPaid || 0))), 0);
  const overdue = filtered.filter((i) => i.status === 'overdue').length;
  const collected = filtered.filter((i) => i.status === 'paid').length;

  const columns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.invoiceNumber}</p>
          <p className="text-xs text-slate-400">{row.customerName || 'N/A'}</p>
        </div>
      ),
    },
    { key: 'amount', label: 'Total', render: (row) => <span className="font-semibold text-sm">{fmt(row.totalAmount)}</span> },
    {
      key: 'outstanding',
      label: 'Outstanding',
      render: (row) => (
        <span className="font-semibold text-sm text-amber-600">
          {fmt(row.balanceDue ?? (row.totalAmount - (row.amountPaid || 0)))}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (row) => (
        <span className={`text-sm ${row.status === 'overdue' ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Accounts Receivable</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track outstanding customer invoices and collections</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Outstanding" value={fmt(totalOutstanding)} icon={TrendingUp} color="amber" loading={loading} />
        <StatCard title="Total Invoices" value={filtered.length} icon={DollarSign} color="blue" loading={loading} />
        <StatCard title="Overdue" value={overdue} icon={Clock} color="rose" loading={loading} />
        <StatCard title="Collected" value={collected} icon={CheckCircle2} color="emerald" loading={loading} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="No receivable invoices found" />
    </div>
  );
};
