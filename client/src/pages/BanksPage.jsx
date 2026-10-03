import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Landmark } from 'lucide-react';

const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const BanksPage = () => {
  const { showToast } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReconcile, setShowReconcile] = useState(false);
  const [reconcile, setReconcile] = useState({ accountId: '', statementBalance: '' });
  const [opening, setOpening] = useState({ accountName: '', bankName: '', accountNumber: '', accountType: 'Checking', openingBalance: '' });
  const [transfer, setTransfer] = useState({ fromAccount: '', toAccount: '', amount: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bank-accounts');
      setAccounts(res.data || []);
      setTotal(res.totalBalance || 0);
    } catch (err) {
      showToast(err.message || 'Could not load bank accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAccount = async (event) => {
    event.preventDefault();
    const balance = Number(opening.openingBalance) || 0;
    try {
      await api.post('/bank-accounts', {
        accountName: opening.accountName,
        bankName: opening.bankName,
        accountNumber: opening.accountNumber,
        accountType: opening.accountType,
        currentBalance: balance,
        availableBalance: balance,
        status: 'Active',
      });
      showToast('Account opened. The opening balance is cash on the books.', 'success');
      setShowOpen(false);
      setOpening({ accountName: '', bankName: '', accountNumber: '', accountType: 'Checking', openingBalance: '' });
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const moveCash = async (event) => {
    event.preventDefault();
    try {
      const res = await api.post('/bank-accounts/transfer', {
        ...transfer,
        amount: Number(transfer.amount),
      });
      showToast(res.alert ? 'Transfer posted and a fraud alert was opened.' : 'Transfer posted. Cash moved between the two accounts.', res.alert ? 'error' : 'success');
      setShowTransfer(false);
      setTransfer({ fromAccount: '', toAccount: '', amount: '', description: '' });
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl text-[#1C2B24]">Bank accounts</h1>
          <p className="text-sm text-[#6B6256] mt-1">Cash on hand is {loading ? '…' : money(total)}. Payments and receipts hit the account you choose.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReconcile((open) => !open)} className="px-3 py-2 border border-[#1C2B24] rounded-md text-sm">Reconcile</button>
          <button onClick={() => setShowTransfer((open) => !open)} className="px-3 py-2 border border-[#1C2B24] rounded-md text-sm">Transfer</button>
          <button onClick={() => setShowOpen((open) => !open)} className="px-3 py-2 bg-[#1C2B24] text-white rounded-md text-sm">Open account</button>
        </div>
      </div>

      {showOpen && (
        <form onSubmit={openAccount} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-sm text-[#6B6256]">The opening balance is money already in that bank. It is not income.</p>
          <label className="text-sm">Account name
            <input required value={opening.accountName} onChange={(e) => setOpening((f) => ({ ...f, accountName: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Bank
            <input required value={opening.bankName} onChange={(e) => setOpening((f) => ({ ...f, bankName: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Account number
            <input required value={opening.accountNumber} onChange={(e) => setOpening((f) => ({ ...f, accountNumber: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Type
            <select value={opening.accountType} onChange={(e) => setOpening((f) => ({ ...f, accountType: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
              <option>Checking</option>
              <option>Savings</option>
              <option>Treasury</option>
              <option>Payroll</option>
              <option>Escrow</option>
            </select>
          </label>
          <label className="text-sm">Opening balance
            <input required type="number" min="0" step="0.01" value={opening.openingBalance} onChange={(e) => setOpening((f) => ({ ...f, openingBalance: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Save account</button>
          </div>
        </form>
      )}

      {showReconcile && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const res = await api.post(`/bank-accounts/${reconcile.accountId}/reconcile`, { statementBalance: Number(reconcile.statementBalance) });
              showToast(res.message, 'success');
              setShowReconcile(false);
              load();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }}
          className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3"
        >
          <p className="sm:col-span-2 text-sm text-[#6B6256]">Enter the balance on the bank statement. The account is marked reconciled only when it matches the books.</p>
          <label className="text-sm">Account
            <select required value={reconcile.accountId} onChange={(e) => setReconcile((f) => ({ ...f, accountId: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
              <option value="">Choose</option>
              {accounts.map((account) => <option key={account._id} value={account._id}>{account.accountName}</option>)}
            </select>
          </label>
          <label className="text-sm">Statement balance
            <input required type="number" step="0.01" value={reconcile.statementBalance} onChange={(e) => setReconcile((f) => ({ ...f, statementBalance: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <div className="sm:col-span-2"><button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Check statement</button></div>
        </form>
      )}

      {showTransfer && (
        <form onSubmit={moveCash} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-sm text-[#6B6256]">A transfer moves cash. It does not change profit, budgets, or vendor spend.</p>
          <label className="text-sm">From
            <select required value={transfer.fromAccount} onChange={(e) => setTransfer((f) => ({ ...f, fromAccount: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
              <option value="">Choose</option>
              {accounts.map((account) => <option key={account._id}>{account.accountName}</option>)}
            </select>
          </label>
          <label className="text-sm">To
            <select required value={transfer.toAccount} onChange={(e) => setTransfer((f) => ({ ...f, toAccount: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
              <option value="">Choose</option>
              {accounts.map((account) => <option key={account._id}>{account.accountName}</option>)}
            </select>
          </label>
          <label className="text-sm">Amount
            <input required type="number" min="0.01" step="0.01" value={transfer.amount} onChange={(e) => setTransfer((f) => ({ ...f, amount: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Note
            <input value={transfer.description} onChange={(e) => setTransfer((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Post transfer</button>
          </div>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {accounts.map((account) => (
          <article key={account._id} className="bg-white border border-[#DDD4C4] rounded-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#8A6A3B]">{account.accountType} · {account.status}</p>
                <h2 className="font-serif text-2xl mt-1">{account.accountName}</h2>
                <p className="text-sm text-[#6B6256]">{account.bankName} · {account.accountNumber}</p>
                <p className="text-xs text-[#8A6A3B] mt-1">Last reconciled {account.lastReconciliationDate ? new Date(account.lastReconciliationDate).toLocaleDateString() : 'never'}</p>
              </div>
              <Landmark className="w-5 h-5 text-[#1C2B24]" />
            </div>
            <p className="text-2xl mt-4">{money(account.currentBalance)}</p>
          </article>
        ))}
      </div>
      {!loading && accounts.length === 0 && <p className="text-sm text-[#6B6256]">No bank accounts yet. Open one before posting payments.</p>}
    </div>
  );
};
