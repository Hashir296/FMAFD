import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/Badge';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const CustomersPage = () => {
  const { showToast } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', company: '', email: '', phone: '', creditLimit: '', paymentTerms: 'Net 30' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data || []);
      setOutstanding(res.outstanding || 0);
    } catch (err) {
      showToast(err.message || 'Could not load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post('/customers', { ...draft, creditLimit: Number(draft.creditLimit) || 0 });
      showToast('Customer saved. Use this exact name on a receivable invoice.', 'success');
      setShowForm(false);
      setDraft({ name: '', company: '', email: '', phone: '', creditLimit: '', paymentTerms: 'Net 30' });
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Customer', render: (row) => (
      <div>
        <p className="font-medium text-sm">{row.name}</p>
        <p className="text-xs text-slate-400">{row.customerId} · {row.company}</p>
      </div>
    ) },
    { key: 'email', label: 'Email', render: (row) => <span className="text-sm">{row.email}</span> },
    { key: 'terms', label: 'Terms', render: (row) => <span className="text-sm">{row.paymentTerms}</span> },
    { key: 'limit', label: 'Credit limit', render: (row) => <span className="text-sm">{money(row.creditLimit)}</span> },
    { key: 'due', label: 'They owe', render: (row) => <span className="text-sm font-semibold">{money(row.outstandingBalance)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-[#1C2B24]">Customers</h1>
          <p className="text-sm text-[#6B6256] mt-1">Open receivables total {loading ? '…' : money(outstanding)}. A customer invoice raises what they owe. A receipt lowers it.</p>
        </div>
        <button onClick={() => setShowForm((open) => !open)} className="px-3 py-2 bg-[#1C2B24] text-white rounded-md text-sm">Add customer</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Name used on invoices
            <input required value={draft.name} onChange={(e) => setDraft((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Company
            <input value={draft.company} onChange={(e) => setDraft((f) => ({ ...f, company: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Email
            <input required type="email" value={draft.email} onChange={(e) => setDraft((f) => ({ ...f, email: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Phone
            <input value={draft.phone} onChange={(e) => setDraft((f) => ({ ...f, phone: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Credit limit
            <input type="number" min="0" step="0.01" value={draft.creditLimit} onChange={(e) => setDraft((f) => ({ ...f, creditLimit: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Terms
            <select value={draft.paymentTerms} onChange={(e) => setDraft((f) => ({ ...f, paymentTerms: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
              <option>Net 15</option>
              <option>Net 30</option>
              <option>Net 45</option>
              <option>Due on receipt</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Save customer</button>
          </div>
        </form>
      )}

      <DataTable columns={columns} data={customers} loading={loading} emptyMessage="No customers yet" />
    </div>
  );
};
