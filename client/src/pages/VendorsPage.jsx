import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, RiskBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Plus,
  Search,
  Star,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export const VendorsPage = () => {
  const { showToast } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: '', contactEmail: '', contactPhone: '' });
  const [bankDraft, setBankDraft] = useState({ bankName: '', bankAccount: '', bankRouting: '' });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const res = await api.get('/vendors', params);
      setVendors(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const saveVendor = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/vendors', draft);
      showToast('Vendor added. Payments that use this exact name will update their spend.', 'success');
      setShowForm(false);
      setDraft({ name: '', category: '', contactEmail: '', contactPhone: '' });
      await fetchVendors();
    } catch (err) {
      showToast(err.message || 'Could not add the vendor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v || 0);

  const totalSpend = vendors.reduce((s, v) => s + (v.totalSpending || 0), 0);
  const activeVendors = vendors.filter((v) => (v.status || '').toLowerCase() === 'active').length;
  const highRisk = vendors.filter((v) => ['high', 'critical'].includes((v.riskLevel || '').toLowerCase())).length;

  const columns = [
    {
      key: 'name',
      label: 'Vendor',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">{row.name}</p>
            <p className="text-xs text-slate-400">{row.category}</p>
          </div>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'riskLevel',
      label: 'Risk',
      render: (row) => <RiskBadge level={row.riskLevel} score={row.riskScore} />,
    },
    {
      key: 'totalPurchases',
      label: 'Total Spend',
      render: (row) => <span className="font-semibold text-sm text-slate-800">{fmt(row.totalSpending)}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-sm text-slate-700">{row.performanceRating?.overall?.toFixed(1) || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedVendor(row);
            setBankDraft({ bankName: row.bankName || '', bankAccount: '', bankRouting: row.bankRouting || '' });
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
          <h1 className="text-2xl font-bold text-slate-800">Vendors</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage supplier relationships and risk profiles</p>
        </div>
        <button onClick={() => setShowForm((open) => !open)} className="flex items-center gap-2 px-4 py-2 bg-[#1C2B24] text-white rounded-md text-sm">
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveVendor} className="bg-white border border-[#DDD4C4] rounded-md p-4 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-sm text-[#6B6256]">Use the same name later on bills and payments. That is how spend and fraud checks attach to this vendor.</p>
          <label className="text-sm">Name
            <input required value={draft.name} onChange={(e) => setDraft((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Category
            <input required value={draft.category} onChange={(e) => setDraft((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Email
            <input required type="email" value={draft.contactEmail} onChange={(e) => setDraft((f) => ({ ...f, contactEmail: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <label className="text-sm">Phone
            <input value={draft.contactPhone} onChange={(e) => setDraft((f) => ({ ...f, contactPhone: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button disabled={saving} className="bg-[#1C2B24] text-white px-4 py-2 rounded-md text-sm">{saving ? 'Saving…' : 'Save vendor'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Vendors" value={vendors.length} icon={Building2} color="blue" loading={loading} />
        <StatCard title="Active" value={activeVendors} icon={CheckCircle2} color="emerald" loading={loading} />
        <StatCard title="Total Spend" value={fmt(totalSpend)} icon={DollarSign} color="indigo" loading={loading} />
        <StatCard title="High Risk" value={highRisk} icon={AlertTriangle} color="rose" loading={loading} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      <DataTable columns={columns} data={vendors} loading={loading} emptyMessage="No vendors found" />

      {/* Vendor Detail Modal */}
      <Modal isOpen={!!selectedVendor} onClose={() => setSelectedVendor(null)} title={selectedVendor?.name}>
        {selectedVendor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-1">Category</p>
                <p className="font-medium text-slate-800">{selectedVendor.category}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <StatusBadge status={selectedVendor.status} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Spend</p>
                <p className="font-semibold text-slate-800">{fmt(selectedVendor.totalSpending)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Risk Score</p>
                <RiskBadge score={selectedVendor.riskScore} />
              </div>
            </div>

            <form
              className="pt-3 border-t border-slate-100 space-y-2"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const res = await api.put(`/vendors/${selectedVendor._id}`, bankDraft);
                  showToast('Bank details saved. A payment to this vendor in the next 14 days will be scored as a changed account.', 'success');
                  setSelectedVendor(res.data);
                  fetchVendors();
                } catch (err) {
                  showToast(err.message, 'error');
                }
              }}
            >
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Change bank details</p>
              <input required placeholder="Bank name" value={bankDraft.bankName} onChange={(e) => setBankDraft((f) => ({ ...f, bankName: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm" />
              <input required placeholder="New account number" value={bankDraft.bankAccount} onChange={(e) => setBankDraft((f) => ({ ...f, bankAccount: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm" />
              <input placeholder="Routing number" value={bankDraft.bankRouting} onChange={(e) => setBankDraft((f) => ({ ...f, bankRouting: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm" />
              <button className="bg-[#1C2B24] text-white px-3 py-2 rounded-md text-sm">Save bank details</button>
            </form>
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
              {selectedVendor.contactEmail && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {selectedVendor.contactEmail}
                </div>
              )}
              {selectedVendor.contactPhone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {selectedVendor.contactPhone}
                </div>
              )}
              {selectedVendor.address && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {selectedVendor.address}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
