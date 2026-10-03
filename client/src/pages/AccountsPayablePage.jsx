import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { TrendingDown, DollarSign, Clock, CheckCircle2, Search } from 'lucide-react';

export const AccountsPayablePage = () => {
  const { showToast } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [paying, setPaying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { type: 'payable' });
      setInvoices(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const paySelected = async () => {
    const targets = invoices.filter((invoice) => selected.includes(invoice._id) && invoice.balanceDue > 0);
    if (!targets.length) return;
    setPaying(true);
    try {
      for (const invoice of targets) {
        await api.post(`/invoices/${invoice._id}/pay`, { amount: invoice.balanceDue, method: 'ACH' });
      }
      showToast(`Paid ${targets.length} bill${targets.length === 1 ? '' : 's'} from the operating account.`, 'success');
      setSelected([]);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
      fetchData();
    } finally {
      setPaying(false);
    }
  };

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v || 0);

  const filtered = invoices.filter((i) =>
    search ? i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) : true
  );

  const totalPayable = filtered.reduce((s, i) => s + (i.balanceDue ?? (i.totalAmount - (i.amountPaid || 0))), 0);
  const overdue = filtered.filter((i) => i.status === 'overdue').length;
  const paid = filtered.filter((i) => i.status === 'paid').length;

  const columns = [
    {
      key: 'pick',
      label: '',
      render: (row) => row.balanceDue > 0 && row.status !== 'disputed' ? (
        <input
          type="checkbox"
          checked={selected.includes(row._id)}
          onChange={() => setSelected((ids) => ids.includes(row._id) ? ids.filter((id) => id !== row._id) : [...ids, row._id])}
        />
      ) : null,
    },
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.invoiceNumber}</p>
          <p className="text-xs text-slate-400">{row.vendorName || 'N/A'}</p>
        </div>
      ),
    },
    { key: 'amount', label: 'Total', render: (row) => <span className="font-semibold text-sm">{fmt(row.totalAmount)}</span> },
    {
      key: 'outstanding',
      label: 'Outstanding',
      render: (row) => (
        <span className="font-semibold text-sm text-rose-600">
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accounts Payable</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tick open bills and pay them together. Each payment hits the first active bank account.</p>
        </div>
        <button disabled={!selected.length || paying} onClick={paySelected} className="px-3 py-2 bg-[#1C2B24] text-white rounded-md text-sm disabled:opacity-40">
          {paying ? 'Paying…' : `Pay ${selected.length} selected`}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Payable" value={fmt(totalPayable)} icon={TrendingDown} color="rose" loading={loading} />
        <StatCard title="Total Bills" value={filtered.length} icon={DollarSign} color="blue" loading={loading} />
        <StatCard title="Overdue" value={overdue} icon={Clock} color="amber" loading={loading} />
        <StatCard title="Paid" value={paid} icon={CheckCircle2} color="emerald" loading={loading} />
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

      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="No payable invoices found" />
    </div>
  );
};
