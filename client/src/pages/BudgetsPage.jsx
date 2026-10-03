import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import {
  PieChart as PieChartIcon,
  Plus,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const BudgetsPage = () => {
  const { showToast } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    department: '',
    category: 'Overall Operations',
    quarter: 'Q4',
    allocatedAmount: '',
  });

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/budgets');
      setBudgets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const saveBudget = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/budgets', {
        department: draft.department,
        category: draft.category,
        quarter: draft.quarter,
        fiscalYear: 2026,
        allocatedAmount: Number(draft.allocatedAmount),
      });
      showToast('Budget saved. Expenses posted to this department will count against it.', 'success');
      setShowForm(false);
      setDraft({ department: '', category: 'Overall Operations', quarter: 'Q4', allocatedAmount: '' });
      await fetchBudgets();
    } catch (err) {
      showToast(err.message || 'Could not save the budget', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v || 0);

  const totalAllocated = budgets.reduce((s, b) => s + (b.allocatedAmount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.actualSpent || 0), 0);
  const overBudget = budgets.filter((b) => b.actualSpent > b.allocatedAmount).length;

  const chartData = budgets.slice(0, 8).map((b) => ({
    name: (b.department || '').substring(0, 12),
    allocated: b.allocatedAmount,
    spent: b.actualSpent,
  }));

  const columns = [
    {
      key: 'name',
      label: 'Budget',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.department}</p>
          <p className="text-xs text-slate-400">{row.category} • {row.fiscalYear} {row.quarter}</p>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (row) => <StatusBadge status={row.category} /> },
    {
      key: 'allocated',
      label: 'Allocated',
      render: (row) => <span className="font-semibold text-slate-700 text-sm">{fmt(row.allocatedAmount)}</span>,
    },
    {
      key: 'spent',
      label: 'Spent',
      render: (row) => (
        <span className={`font-semibold text-sm ${row.actualSpent > row.allocatedAmount ? 'text-rose-600' : 'text-slate-700'}`}>
          {fmt(row.actualSpent)}
        </span>
      ),
    },
    {
      key: 'utilization',
      label: 'Utilization',
      render: (row) => {
        const spent = row.actualSpent || 0;
        const pct = row.allocatedAmount > 0 ? Math.min((spent / row.allocatedAmount) * 100, 100) : 0;
        const over = spent > row.allocatedAmount;
        return (
          <div className="w-32">
            <div className="flex justify-between text-xs mb-1">
              <span className={over ? 'text-rose-600 font-semibold' : 'text-slate-600'}>{row.allocatedAmount ? ((spent / row.allocatedAmount) * 100).toFixed(1) : '0'}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Budgets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track departmental budgets and spending utilization</p>
        </div>
        <button onClick={() => setShowForm((open) => !open)} className="flex items-center gap-2 px-4 py-2 bg-[#1C2B24] text-white rounded-md text-sm">
          <Plus className="w-4 h-4" />
          New Budget
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveBudget} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-sm text-[#6B6256]">This sets the ceiling. Cash does not move until someone records an expense for this department.</p>
          <label className="text-sm">Department
            <input required value={draft.department} onChange={(e) => setDraft((f) => ({ ...f, department: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Category
            <input required value={draft.category} onChange={(e) => setDraft((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Quarter
            <select value={draft.quarter} onChange={(e) => setDraft((f) => ({ ...f, quarter: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
              <option>Q1</option>
              <option>Q2</option>
              <option>Q3</option>
              <option>Q4</option>
              <option>Annual</option>
            </select>
          </label>
          <label className="text-sm">Approved amount
            <input required type="number" min="1" step="0.01" value={draft.allocatedAmount} onChange={(e) => setDraft((f) => ({ ...f, allocatedAmount: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button disabled={saving} className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">{saving ? 'Saving…' : 'Save budget'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Allocated" value={fmt(totalAllocated)} icon={Target} color="blue" loading={loading} />
        <StatCard title="Total Spent" value={fmt(totalSpent)} icon={TrendingUp} color="emerald" loading={loading} />
        <StatCard title="Remaining" value={fmt(totalAllocated - totalSpent)} icon={PieChartIcon} color="indigo" loading={loading} />
        <StatCard title="Over Budget" value={overBudget} icon={AlertTriangle} color="rose" loading={loading} />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Budget vs Spent by Department</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="allocated" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="Allocated" />
              <Bar dataKey="spent" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable columns={columns} data={budgets} loading={loading} emptyMessage="No budgets found" />
    </div>
  );
};
