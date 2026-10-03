import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { DataTable } from '../components/common/DataTable';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const RecurringPage = () => {
  const { showToast } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/recurring');
      setRows(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (row) => {
    try {
      const res = await api.post(`/finance/recurring/${row._id}/run`);
      showToast(res.alert ? 'Posted for this month, and a fraud alert was opened.' : 'Posted for this month.', res.alert ? 'error' : 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'what', label: 'Item', render: (row) => <div><p className="text-sm font-medium">{row.description}</p><p className="text-xs text-slate-400">{row.vendorName || row.department} · {row.recurringInterval}</p></div> },
    { key: 'amount', label: 'Amount', render: (row) => <span className="text-sm">{money(row.amount)}</span> },
    { key: 'account', label: 'Account', render: (row) => <span className="text-sm">{row.bankAccountName}</span> },
    { key: 'last', label: 'Last posted', render: (row) => <span className="text-sm">{row.date ? new Date(row.date).toLocaleDateString() : ''}</span> },
    { key: 'run', label: '', render: (row) => <button onClick={() => run(row)} className="text-sm text-[#8A6A3B]">Post this month</button> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-[#1C2B24]">Recurring</h1>
        <p className="text-sm text-[#6B6256] mt-1">These are bills already marked to repeat. Posting writes a new ledger entry for the current month and moves cash again.</p>
      </div>
      <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No recurring items. Mark an entry recurring when you record it." />
    </div>
  );
};
