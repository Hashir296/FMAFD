import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isOwner } from '../lib/roles';
import { DataTable } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/Badge';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const DepartmentsPage = () => {
  const { user, showToast } = useAuth();
  const canAdd = isOwner(user?.role) || user?.role === 'Finance Manager';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', code: '', managerName: '', managerEmail: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setRows(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post('/departments', draft);
      showToast('Department opened. Set its budget on the Budgets desk.', 'success');
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Department', render: (row) => <div><p className="text-sm font-medium">{row.name}</p><p className="text-xs text-slate-400">{row.code}</p></div> },
    { key: 'manager', label: 'Manager', render: (row) => <div><p className="text-sm">{row.managerName}</p><p className="text-xs text-slate-400">{row.managerEmail}</p></div> },
    { key: 'people', label: 'People', render: (row) => <span className="text-sm">{row.headcount}</span> },
    { key: 'budget', label: 'Budget', render: (row) => <span className="text-sm">{money(row.allocatedBudget)}</span> },
    { key: 'spent', label: 'Spent', render: (row) => <span className="text-sm">{money(row.currentSpend)}</span> },
    { key: 'status', label: 'Budget status', render: (row) => <StatusBadge status={row.budgetStatus} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-[#1C2B24]">Departments</h1>
          <p className="text-sm text-[#6B6256] mt-1">Headcount comes from active employees. Spend comes from the budget line with the same name.</p>
        </div>
        {canAdd && <button onClick={() => setShowForm((open) => !open)} className="px-3 py-2 bg-[#1C2B24] text-white rounded-md text-sm">Add department</button>}
      </div>
      {showForm && (
        <form onSubmit={save} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Name<input required value={draft.name} onChange={(e) => setDraft((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" /></label>
          <label className="text-sm">Code<input required value={draft.code} onChange={(e) => setDraft((f) => ({ ...f, code: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" /></label>
          <label className="text-sm">Manager<input required value={draft.managerName} onChange={(e) => setDraft((f) => ({ ...f, managerName: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" /></label>
          <label className="text-sm">Manager email<input required type="email" value={draft.managerEmail} onChange={(e) => setDraft((f) => ({ ...f, managerEmail: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" /></label>
          <div className="sm:col-span-2"><button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Save department</button></div>
        </form>
      )}
      <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No departments on file" />
    </div>
  );
};
