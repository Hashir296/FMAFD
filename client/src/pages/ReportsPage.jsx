import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const REPORTS = [
  { key: 'profit-and-loss', label: 'Profit and loss', description: 'Income, expenses, and net from posted transactions' },
  { key: 'cash-flow', label: 'Cash movement', description: 'Income received minus expenses paid' },
  { key: 'balance-sheet', label: 'Recorded balances', description: 'Bank cash, open receivables, and open payables' },
  { key: 'budget-variance', label: 'Budget variance', description: 'Approved amount minus what was spent' },
  { key: 'vendor-risk', label: 'Vendor risk', description: 'Suppliers ordered by the risk score on file' },
  { key: 'risk-exposure', label: 'Fraud summary', description: 'Open alert amounts and counts' },
];

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const ReportsPage = () => {
  const { showToast } = useAuth();
  const [active, setActive] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const openReport = async (key) => {
    setActive(key);
    setLoading(true);
    try {
      const res = await api.get(`/reports/${key}`);
      setReport(res.report);
    } catch (err) {
      showToast(err.message || 'Could not build that report', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-[#1C2B24]">Reports</h1>
        <p className="text-sm text-[#6B6256] mt-1">Built when you open them, from the current ledger. Nothing is stored as a fake snapshot.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((item) => (
          <button
            key={item.key}
            onClick={() => openReport(item.key)}
            className={`text-left bg-white border rounded-md p-4 ${active === item.key ? 'border-[#1C2B24]' : 'border-[#DDD4C4]'}`}
          >
            <p className="font-medium">{item.label}</p>
            <p className="text-sm text-[#6B6256] mt-1">{item.description}</p>
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[#6B6256]">Building the report…</p>}

      {report && !loading && (
        <div className="bg-white border border-[#DDD4C4] rounded-md p-5">
          <h2 className="font-serif text-3xl">{report.title}</h2>
          <p className="text-xs text-[#8A6A3B] mt-1">{report.period}</p>
          <p className="text-sm mt-3">{report.summary}</p>
          <table className="w-full text-sm mt-4">
            <tbody>
              {(report.sections || []).map((row) => (
                <tr key={row.category} className="border-t border-[#EFE8DC]">
                  <td className={`py-2 pr-4 ${row.isGrandTotal || row.isTotal ? 'font-medium' : ''}`}>{row.category}</td>
                  <td className="py-2 text-right">
                    {typeof row.amount === 'number' && /count|vendors|employees|cases/i.test(row.category)
                      ? row.amount.toLocaleString()
                      : typeof row.amount === 'number'
                      ? money(row.amount)
                      : row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
