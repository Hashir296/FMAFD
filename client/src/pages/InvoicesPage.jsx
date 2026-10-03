import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Plus,
  Search,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Send,
  X,
} from 'lucide-react';

export const InvoicesPage = () => {
  const { showToast } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('ACH');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    type: 'payable',
    party: '',
    department: 'Finance',
    description: '',
    amount: '',
    dueDate: '',
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(search && { search }),
        ...(statusFilter !== 'All' && { status: statusFilter }),
      };
      const res = await api.get('/invoices', params);
      setInvoices(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const saveInvoice = async (event) => {
    event.preventDefault();
    try {
      const amount = Number(draft.amount);
      await api.post('/invoices', {
        type: draft.type,
        vendorName: draft.type === 'payable' ? draft.party : '',
        customerName: draft.type === 'receivable' ? draft.party : '',
        department: draft.department,
        dueDate: draft.dueDate,
        items: [{ description: draft.description, quantity: 1, unitPrice: amount, amount }],
      });
      showToast('Invoice saved. It stays open until you record a payment.', 'success');
      setShowForm(false);
      fetchInvoices();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const payInvoice = async (invoice) => {
    try {
      const res = await api.post(`/invoices/${invoice._id}/pay`, { amount: Number(payAmount), method: payMethod });
      const note = res.alert ? ' Payment posted and a fraud alert was opened.' : ' Payment posted to the ledger.';
      showToast(`Invoice ${invoice.invoiceNumber} updated.${note}`, 'success');
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

  const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const pending = invoices.filter((i) => i.status === 'pending' || i.status === 'sent').length;
  const overdue = invoices.filter((i) => i.status === 'overdue').length;

  const columns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{row.invoiceNumber}</p>
          <p className="text-xs text-slate-400">{row.vendorName || row.customerName || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (row) => <StatusBadge status={row.type} />,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => <span className="font-semibold text-sm text-slate-800">{fmt(row.totalAmount)}</span>,
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
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedInvoice(row);
            setPayAmount(String(row.balanceDue || ''));
            setPayMethod('ACH');
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage accounts payable and receivable invoices</p>
        </div>
        <button onClick={() => setShowForm((open) => !open)} className="flex items-center gap-2 px-4 py-2 bg-[#1C2B24] text-white rounded-md text-sm">
          <Plus className="w-4 h-4" />
          New invoice
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveInvoice} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-sm text-[#6B6256]">A receivable is money a customer owes you. A payable is a vendor bill. Recording payment later moves the cash and writes the ledger entry.</p>
          <label className="text-sm">Kind
            <select value={draft.type} onChange={(e) => setDraft((f) => ({ ...f, type: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
              <option value="payable">Bill to pay</option>
              <option value="receivable">Invoice to collect</option>
            </select>
          </label>
          <label className="text-sm">{draft.type === 'payable' ? 'Vendor' : 'Customer'}
            <input required value={draft.party} onChange={(e) => setDraft((f) => ({ ...f, party: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Department
            <input required value={draft.department} onChange={(e) => setDraft((f) => ({ ...f, department: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Due date
            <input required type="date" value={draft.dueDate} onChange={(e) => setDraft((f) => ({ ...f, dueDate: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">What it is for
            <input required value={draft.description} onChange={(e) => setDraft((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Amount
            <input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={(e) => setDraft((f) => ({ ...f, amount: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Save invoice</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Value" value={fmt(totalAmount)} icon={DollarSign} color="blue" loading={loading} />
        <StatCard title="Total Invoices" value={invoices.length} icon={FileText} color="indigo" loading={loading} />
        <StatCard title="Pending" value={pending} icon={Clock} color="amber" loading={loading} />
        <StatCard title="Overdue" value={overdue} icon={AlertTriangle} color="rose" loading={loading} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        {['All', 'sent', 'partially_paid', 'paid', 'overdue', 'disputed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={invoices} loading={loading} emptyMessage="No invoices found" />

      {/* Invoice Detail Modal */}
      <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={`Invoice ${selectedInvoice?.invoiceNumber}`}>
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Party</p>
                <p className="text-sm font-medium text-slate-800">{selectedInvoice.vendorName || selectedInvoice.customerName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <StatusBadge status={selectedInvoice.status} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Amount</p>
                <p className="text-lg font-bold text-slate-800">{fmt(selectedInvoice.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Due Date</p>
                <p className="text-sm font-medium text-slate-800">
                  {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            {selectedInvoice.balanceDue > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm">Amount to apply
                  <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
                </label>
                <label className="text-sm">Method
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
                    <option>ACH</option>
                    <option>Wire Transfer</option>
                    <option>Check</option>
                  </select>
                </label>
                <p className="sm:col-span-2 text-sm text-[#6B6256]">Balance due is {fmt(selectedInvoice.balanceDue)}. A smaller amount leaves the invoice partly open.</p>
                <button onClick={() => payInvoice(selectedInvoice)} className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">Record payment</button>
                <label className="text-sm">Credit memo
                  <input type="number" min="0.01" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
                </label>
                <label className="text-sm">Why
                  <input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.post(`/invoices/${selectedInvoice._id}/credit`, { amount: Number(creditAmount), reason: creditReason });
                      showToast('Credit applied. Cash did not move.', 'success');
                      setSelectedInvoice(null);
                      fetchInvoices();
                    } catch (err) {
                      showToast(err.message, 'error');
                    }
                  }}
                  className="border border-[#1C2B24] px-4 py-2 rounded-md text-sm"
                >
                  Apply credit
                </button>
                {selectedInvoice.status === 'disputed' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.post(`/invoices/${selectedInvoice._id}/release`);
                        showToast('Dispute released. The bill can be paid again.', 'success');
                        setSelectedInvoice(null);
                        fetchInvoices();
                      } catch (err) {
                        showToast(err.message, 'error');
                      }
                    }}
                    className="text-sm text-[#1F4D3A]"
                  >
                    Release dispute
                  </button>
                )}
                {selectedInvoice.amountPaid === 0 && selectedInvoice.status !== 'void' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.post(`/invoices/${selectedInvoice._id}/void`, { reason: creditReason || 'Voided' });
                        showToast('Invoice voided. No cash moved.', 'success');
                        setSelectedInvoice(null);
                        fetchInvoices();
                      } catch (err) {
                        showToast(err.message, 'error');
                      }
                    }}
                    className="text-sm text-[#8C3A3A]"
                  >
                    Void unpaid invoice
                  </button>
                )}
                {['sent', 'partially_paid', 'overdue'].includes(selectedInvoice.status) && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.post(`/invoices/${selectedInvoice._id}/dispute`, { reason: creditReason || 'Disputed' });
                        showToast('Invoice marked disputed. It stays open until you pay or credit it.', 'success');
                        setSelectedInvoice(null);
                        fetchInvoices();
                      } catch (err) {
                        showToast(err.message, 'error');
                      }
                    }}
                    className="text-sm text-[#8C3A3A]"
                  >
                    Mark disputed
                  </button>
                )}
              </div>
            )}
            {selectedInvoice.paymentHistory?.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Payments already applied</p>
                <ul className="text-sm space-y-1">
                  {selectedInvoice.paymentHistory.map((payment) => (
                    <li key={payment.reference}>{fmt(payment.amount)} · {payment.method} · {payment.reference}</li>
                  ))}
                </ul>
              </div>
            )}
            {selectedInvoice.notes && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{selectedInvoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
