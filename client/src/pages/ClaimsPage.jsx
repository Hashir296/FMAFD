import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isOwner } from '../lib/roles';
import { DataTable } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/Badge';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const ClaimsPage = () => {
  const { user, showToast } = useAuth();
  const canReview = isOwner(user?.role) || ['Finance Manager', 'Department Manager'].includes(user?.role);
  const canPost = isOwner(user?.role) || ['Finance Manager', 'Accountant'].includes(user?.role);
  const [claims, setClaims] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [bankAccountName, setBankAccountName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ department: user?.department || '', category: '', description: '', amount: '', vendorName: '', receiptNote: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/claims');
      setClaims(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (canPost) api.get('/bank-accounts').then((res) => setAccounts(res.data || [])).catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/claims', { ...draft, amount: Number(draft.amount) });
      showToast('Claim submitted. Cash stays put until finance posts it.', 'success');
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const review = async (claim, decision) => {
    try {
      await api.patch(`/claims/${claim._id}/review`, { decision });
      showToast(decision === 'Approved' ? 'Approved. It still needs a posting to leave the bank.' : 'Claim rejected.', 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const post = async (claim) => {
    try {
      const res = await api.post(`/claims/${claim._id}/post`, { bankAccountName });
      showToast(res.alert ? 'Posted, and a fraud alert was opened.' : `Posted as ${res.data.txnId}.`, res.alert ? 'error' : 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'id', label: 'Claim', render: (row) => <div><p className="text-sm font-medium">{row.claimId}</p><p className="text-xs text-slate-400">{row.employeeName}</p></div> },
    { key: 'what', label: 'What', render: (row) => <div><p className="text-sm">{row.description}</p><p className="text-xs text-slate-400">{row.department} · {row.category}</p></div> },
    { key: 'amount', label: 'Amount', render: (row) => <span className="text-sm font-semibold">{money(row.amount)}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: '', render: (row) => (
      <div className="flex gap-2 text-sm">
        {canReview && row.status === 'Submitted' && (
          <>
            <button onClick={() => review(row, 'Approved')} className="text-[#1F4D3A]">Approve</button>
            <button onClick={() => review(row, 'Rejected')} className="text-[#8C3A3A]">Reject</button>
          </>
        )}
        {canPost && row.status === 'Approved' && (
          <button onClick={() => post(row)} className="text-[#8A6A3B]">Post</button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-[#1C2B24]">Expense claims</h1>
          <p className="text-sm text-[#6B6256] mt-1">A claim does not move cash. A manager approves it, then finance posts it to a bank account.</p>
        </div>
        <button onClick={() => setShowForm((open) => !open)} className="px-3 py-2 bg-[#1C2B24] text-white rounded-md text-sm">New claim</button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Department
            <input required value={draft.department} onChange={(e) => setDraft((f) => ({ ...f, department: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Category
            <input required value={draft.category} onChange={(e) => setDraft((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">What was bought
            <input required value={draft.description} onChange={(e) => setDraft((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Amount
            <input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={(e) => setDraft((f) => ({ ...f, amount: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Vendor
            <input value={draft.vendorName} onChange={(e) => setDraft((f) => ({ ...f, vendorName: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm sm:col-span-2">Receipt note
            <input value={draft.receiptNote} onChange={(e) => setDraft((f) => ({ ...f, receiptNote: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <div className="sm:col-span-2"><button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Submit claim</button></div>
        </form>
      )}
      {canPost && (
        <label className="text-sm block max-w-sm">Bank account used when posting
          <select value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
            <option value="">Choose</option>
            {accounts.map((account) => <option key={account._id}>{account.accountName}</option>)}
          </select>
        </label>
      )}
      <DataTable columns={columns} data={claims} loading={loading} emptyMessage="No claims yet" />
    </div>
  );
};
