import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { RiskBadge } from '../components/common/Badge';
import { canAccessPath } from '../lib/roles';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, ShieldAlert, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const changeLabel = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return `${value > 0 ? '+' : ''}${value}%`;
};

const tooltipStyle = { backgroundColor: '#1C2B24', border: 'none', borderRadius: '6px', color: '#F7F1E8', fontSize: '12px' };

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fraudStats, setFraudStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [ownTxns, setOwnTxns] = useState([]);
  const [ownClaims, setOwnClaims] = useState([]);
  const [claimQueue, setClaimQueue] = useState({ submitted: 0, approved: 0 });

  const seesBooks = canAccessPath(user?.role, '/finance') || user?.role === 'Department Manager' || user?.role === 'Fraud Analyst';
  const seesFraud = canAccessPath(user?.role, '/fraud-detection');
  const isEmployee = user?.role === 'Employee';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isEmployee) {
          const [txns, claims] = await Promise.all([
            api.get('/transactions', { limit: 50 }),
            api.get('/claims'),
          ]);
          setOwnTxns(txns.data || []);
          setOwnClaims(claims.data || []);
          return;
        }

        const financeRes = await api.get('/finance/overview');
        setSummary(financeRes.summary || {});
        setMonthly(financeRes.monthlyTrend || []);
        setDepartments(financeRes.departmentSpend || []);
        setCategories((financeRes.categoryBreakdown || []).slice(0, 6));

        if (seesFraud) {
          const fraudRes = await api.get('/fraud/alerts');
          setFraudStats(fraudRes.stats || {});
          setAlerts((fraudRes.data || []).slice(0, 5));
        }
        if (canAccessPath(user?.role, '/ai-insights')) {
          const briefingRes = await api.get('/ai/briefing');
          setNotes(briefingRes.data || []);
        }
        if (canAccessPath(user?.role, '/claims')) {
          const claimsRes = await api.get('/claims');
          const list = claimsRes.data || [];
          setClaimQueue({
            submitted: list.filter((claim) => claim.status === 'Submitted').length,
            approved: list.filter((claim) => claim.status === 'Approved').length,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isEmployee, seesFraud, user?.role]);

  if (isEmployee) {
    const spent = ownTxns.reduce((sum, txn) => sum + (txn.amount || 0), 0);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-4xl text-[#1C2B24]">Your activity</h1>
          <p className="text-sm text-[#6B6256] mt-1">Submit a claim before anything is paid. Posted items appear after finance approves and posts them.</p>
        </div>
        <button onClick={() => navigate('/claims')} className="px-3 py-2 bg-[#1C2B24] text-white rounded-md text-sm">New claim</button>
        <div className="bg-white border border-[#DDD4C4] rounded-md divide-y divide-[#EFE8DC]">
          {ownClaims.length === 0 && !loading && <p className="p-5 text-sm text-[#6B6256]">No claims yet.</p>}
          {ownClaims.map((claim) => (
            <div key={claim._id} className="px-4 py-3 flex justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{claim.description}</p>
                <p className="text-xs text-[#6B6256]">{claim.claimId} · {claim.status}</p>
              </div>
              <p className="font-medium">{money(claim.amount)}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <StatCard title="Recorded items" value={loading ? '…' : ownTxns.length} icon={Wallet} iconBg="bg-[#F3E6D8] text-[#8A6A3B]" />
          <StatCard title="Amount on those items" value={loading ? '…' : money(spent)} icon={DollarSign} iconBg="bg-[#E7EFE8] text-[#1F4D3A]" />
        </div>
        <div className="bg-white border border-[#DDD4C4] rounded-md divide-y divide-[#EFE8DC]">
          {ownTxns.length === 0 && !loading && (
            <p className="p-5 text-sm text-[#6B6256]">Nothing is posted in your name yet.</p>
          )}
          {ownTxns.map((txn) => (
            <div key={txn._id} className="px-4 py-3 flex justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{txn.description}</p>
                <p className="text-xs text-[#6B6256]">{txn.category} · {new Date(txn.date).toLocaleDateString()}</p>
              </div>
              <p className="font-medium">{money(txn.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const revenueChange = changeLabel(summary?.revenueChange);
  const expenseChange = changeLabel(summary?.expenseChange);
  const profitChange = changeLabel(summary?.profitChange);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-[#1C2B24]">Dashboard</h1>
        <p className="text-sm text-[#6B6256] mt-1">Figures below are summed from posted transactions, invoices, budgets, and open alerts.</p>
      </div>

      {(claimQueue.submitted > 0 || claimQueue.approved > 0) && (
        <button onClick={() => navigate('/claims')} className="w-full text-left bg-white border border-[#DDD4C4] rounded-md px-4 py-3 text-sm">
          Claims waiting: {claimQueue.submitted} to review, {claimQueue.approved} approved and not yet posted.
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Income" value={loading ? '…' : money(summary?.totalIncome)} change={revenueChange} changeType={summary?.revenueChange >= 0 ? 'positive' : 'negative'} subtext={revenueChange ? 'vs prior posted month' : 'no prior month to compare'} icon={ArrowUpRight} iconBg="bg-[#E7EFE8] text-[#1F4D3A]" />
        <StatCard title="Expenses" value={loading ? '…' : money(summary?.totalExpenses)} change={expenseChange} changeType={summary?.expenseChange > 0 ? 'negative' : 'positive'} subtext={expenseChange ? 'vs prior posted month' : 'no prior month to compare'} icon={ArrowDownRight} iconBg="bg-[#F3E6D8] text-[#8A6A3B]" />
        <StatCard title="Net" value={loading ? '…' : money(summary?.netProfit)} change={profitChange} changeType={summary?.profitChange >= 0 ? 'positive' : 'negative'} subtext={summary ? `${summary.profitMargin || 0}% of income` : ''} icon={DollarSign} iconBg="bg-[#E7EFE8] text-[#1F4D3A]" />
        <StatCard title="Cash in banks" value={loading ? '…' : money(summary?.totalCash)} subtext={summary ? `${summary.accountCount || 0} accounts` : ''} icon={Wallet} iconBg="bg-[#E8EEF2] text-[#3D4F6F]" />
        {seesBooks && (
          <StatCard title="Open receivables" value={loading ? '…' : money(summary?.accountsReceivable)} subtext={summary ? `${summary.overdueReceivableCount || 0} overdue` : ''} onClick={() => navigate('/accounts-receivable')} icon={ArrowUpRight} iconBg="bg-[#F3E6D8] text-[#C4622D]" />
        )}
        {seesBooks && (
          <StatCard title="Open payables" value={loading ? '…' : money(summary?.accountsPayable)} subtext={summary ? `${summary.payableCount || 0} open bills` : ''} onClick={() => navigate('/accounts-payable')} icon={ArrowDownRight} iconBg="bg-[#F6E8E4] text-[#8C3A3A]" />
        )}
      </div>

      {seesFraud && fraudStats && (
        <div className="bg-white border border-[#DDD4C4] rounded-md p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#8C3A3A]" />
              <h2 className="font-medium">Open risk</h2>
            </div>
            <button onClick={() => navigate('/fraud-detection')} className="text-sm text-[#8A6A3B]">Open the queue</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
            <div className="border border-[#EFE8DC] rounded-md p-3"><p className="text-[#6B6256]">Alerts</p><p className="text-2xl font-serif">{fraudStats.totalAlerts || 0}</p></div>
            <div className="border border-[#EFE8DC] rounded-md p-3"><p className="text-[#6B6256]">Critical</p><p className="text-2xl font-serif">{fraudStats.criticalAlerts || 0}</p></div>
            <div className="border border-[#EFE8DC] rounded-md p-3"><p className="text-[#6B6256]">High</p><p className="text-2xl font-serif">{fraudStats.highRiskAlerts || 0}</p></div>
            <div className="border border-[#EFE8DC] rounded-md p-3"><p className="text-[#6B6256]">Cases open</p><p className="text-2xl font-serif">{summary?.openInvestigations || 0}</p></div>
            <div className="border border-[#EFE8DC] rounded-md p-3"><p className="text-[#6B6256]">Exposure</p><p className="text-xl font-serif">{money(fraudStats.totalRiskExposure)}</p></div>
          </div>
        </div>
      )}

      {notes[0] && (
        <div className="bg-[#1C2B24] text-[#F7F1E8] rounded-md p-5">
          <p className="text-xs tracking-wide uppercase text-[#C9B59A]">From the books</p>
          <h2 className="font-serif text-2xl mt-1">{notes[0].title}</h2>
          <p className="text-sm text-[#E7E0D4] mt-2">{notes[0].summary}</p>
          <button onClick={() => navigate('/ai-insights')} className="mt-3 text-sm text-[#C9B59A]">Read the notes</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#DDD4C4] rounded-md p-5">
          <h3 className="font-medium">Income and expenses by month</h3>
          <p className="text-xs text-[#6B6256] mb-3">Grouped from transaction dates.</p>
          {monthly.length === 0 ? (
            <p className="text-sm text-[#6B6256] py-10 text-center">No transactions posted yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE8DC" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B6256' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${Math.round(val / 1000)}k`} tick={{ fontSize: 12, fill: '#6B6256' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => money(val)} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="revenue" name="Income" stroke="#1F4D3A" fill="#1F4D3A22" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#C4622D" fill="#C4622D22" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-[#DDD4C4] rounded-md p-5">
          <div className="flex justify-between">
            <h3 className="font-medium">Budget vs spent</h3>
            <button onClick={() => navigate('/budgets')} className="text-sm text-[#8A6A3B]">Budgets</button>
          </div>
          {departments.length === 0 ? (
            <p className="text-sm text-[#6B6256] py-10 text-center">No budgets saved.</p>
          ) : (
            <div className="h-64 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departments}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE8DC" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B6256' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${Math.round(val / 1000)}k`} tick={{ fontSize: 12, fill: '#6B6256' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => money(val)} contentStyle={tooltipStyle} />
                  <Bar dataKey="spend" name="Spent" fill="#1F4D3A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="budget" name="Approved" fill="#D9D0C3" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {seesFraud && (
          <div className="lg:col-span-2 bg-white border border-[#DDD4C4] rounded-md p-5">
            <h3 className="font-medium mb-3">Latest alerts</h3>
            {alerts.length === 0 && <p className="text-sm text-[#6B6256]">No alerts on file.</p>}
            <div className="divide-y divide-[#EFE8DC]">
              {alerts.map((alert) => (
                <button key={alert._id} onClick={() => navigate('/fraud-detection')} className="w-full py-3 flex items-center justify-between text-left gap-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-[#8C3A3A]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{alert.detectionType}</span>
                        <RiskBadge level={alert.riskLevel} />
                      </div>
                      <p className="text-xs text-[#6B6256]">{alert.entityName}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{money(alert.amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`bg-white border border-[#DDD4C4] rounded-md p-5 ${seesFraud ? '' : 'lg:col-span-3'}`}>
          <h3 className="font-medium">Expense categories</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-[#6B6256] py-8 text-center">No expenses posted.</p>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="value" innerRadius={48} outerRadius={70}>
                      {categories.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => money(val)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-sm">
                {categories.map((cat) => (
                  <div key={cat.name} className="flex justify-between gap-3">
                    <span className="truncate flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      {cat.name}
                    </span>
                    <span>{money(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
