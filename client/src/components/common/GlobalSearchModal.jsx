import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, ShieldAlert, ArrowLeftRight, Building2, Users, FileText } from 'lucide-react';
import { api } from '../../api/client';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ transactions: [], vendors: [], alerts: [], invoices: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(true);
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ transactions: [], vendors: [], alerts: [], invoices: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [txnsRes, vendorsRes, alertsRes, invoicesRes] = await Promise.all([
          api.get('/transactions', { search: query, limit: 4 }),
          api.get('/vendors', { search: query, limit: 3 }),
          api.get('/fraud/alerts', { search: query, limit: 3 }),
          api.get('/invoices', { search: query, limit: 3 }),
        ]);

        setResults({
          transactions: txnsRes.data || [],
          vendors: vendorsRes.data || [],
          alerts: alertsRes.data || [],
          invoices: invoicesRes.data || [],
        });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative mx-auto max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200">
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-200">
          <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, vendor name, transaction ID, or amount..."
            className="h-13 w-full border-0 bg-transparent pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
            autoFocus
          />
          <button
            onClick={onClose}
            className="absolute right-3.5 top-3.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 text-xs space-y-4">
          {loading && <p className="text-center py-6 text-slate-400 animate-pulse">Searching telemetry records...</p>}

          {!loading && query && results.transactions.length === 0 && results.vendors.length === 0 && results.alerts.length === 0 && (
            <p className="text-center py-6 text-slate-400">No matching records found for "{query}".</p>
          )}

          {/* Transactions */}
          {results.transactions.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transactions</p>
              <div className="space-y-1">
                {results.transactions.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => {
                      navigate(`/transactions?id=${t.txnId}`);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="font-semibold text-slate-800">{t.description}</p>
                        <p className="text-[11px] text-slate-400">{t.txnId} • {t.vendorName || t.department}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">${(t.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fraud Alerts */}
          {results.alerts.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-bold text-rose-500 uppercase tracking-wider">Fraud Alerts</p>
              <div className="space-y-1">
                {results.alerts.map((a) => (
                  <div
                    key={a._id}
                    onClick={() => {
                      navigate('/fraud-detection');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 hover:bg-rose-50 cursor-pointer transition-colors border border-rose-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <div>
                        <p className="font-semibold text-rose-900">{a.detectionType}: {a.entityName}</p>
                        <p className="text-[11px] text-rose-600">Risk Score: {a.riskScore}/100 • {a.alertId}</p>
                      </div>
                    </div>
                    <span className="font-bold text-rose-800">${(a.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendors */}
          {results.vendors.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendors</p>
              <div className="space-y-1">
                {results.vendors.map((v) => (
                  <div
                    key={v._id}
                    onClick={() => {
                      navigate('/vendors');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="font-semibold text-slate-800">{v.name}</p>
                        <p className="text-[11px] text-slate-400">{v.category} • {v.vendorId}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600">Spend: ${(v.totalSpending || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
