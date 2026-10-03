import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Landmark,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const FinancePage = () => {
  const [overview, setOverview] = useState({});
  const [cashflow, setCashflow] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes] = await Promise.all([api.get('/finance/overview')]);
        const summary = overviewRes.summary || {};
        setOverview({
          totalRevenue: summary.totalIncome,
          totalExpenses: summary.totalExpenses,
          netProfit: summary.netProfit,
          cashBalance: summary.totalCash,
        });
        setCashflow((overviewRes.monthlyTrend || []).map((month) => ({
          month: month.month,
          income: month.revenue,
          expense: month.expenses,
        })));
        setExpenseBreakdown(overviewRes.categoryBreakdown || []);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Corporate Finance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Financial overview, cash flow and P&L analysis</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={fmt(overview.totalRevenue)} icon={TrendingUp} color="emerald" loading={loading} />
        <StatCard title="Total Expenses" value={fmt(overview.totalExpenses)} icon={TrendingDown} color="rose" loading={loading} />
        <StatCard title="Net Profit" value={fmt(overview.netProfit)} icon={DollarSign} color="blue" loading={loading} />
        <StatCard title="Cash Balance" value={fmt(overview.cashBalance)} icon={Landmark} color="indigo" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Monthly Cash Flow
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cashflow} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expense" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-purple-500" />
            Expense Breakdown
          </h2>
          {expenseBreakdown.length > 0 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseBreakdown} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={1}>
                      {expenseBreakdown.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [fmt(v), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-2">
                {expenseBreakdown.map((entry, i) => {
                  const total = expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
                  const share = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                  return (
                    <li key={entry.name} className="flex items-start justify-between gap-3 text-sm">
                      <span className="flex items-start gap-2 min-w-0">
                        <span className="mt-1 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color || COLORS[i % COLORS.length] }} />
                        <span className="text-slate-700 leading-5">{entry.name}</span>
                      </span>
                      <span className="shrink-0 text-slate-500">{share > 0 ? `${share}%` : '<1%'}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No breakdown data available
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Profit Margin', value: overview.profitMargin ? `${overview.profitMargin.toFixed(1)}%` : 'N/A', color: 'text-emerald-600' },
          { label: 'Burn Rate', value: fmt(overview.burnRate), color: 'text-amber-600' },
          { label: 'Revenue Growth', value: overview.revenueGrowth ? `${overview.revenueGrowth.toFixed(1)}%` : 'N/A', color: 'text-blue-600' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
            <p className="text-sm text-slate-500">{m.label}</p>
            <p className={`text-3xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
