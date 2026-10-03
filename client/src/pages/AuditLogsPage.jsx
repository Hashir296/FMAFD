import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { DataTable } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/Badge';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  User,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-rose-100 text-rose-700',
  LOGIN: 'bg-indigo-100 text-indigo-700',
  LOGOUT: 'bg-slate-100 text-slate-600',
  EXPORT: 'bg-amber-100 text-amber-700',
  APPROVE: 'bg-teal-100 text-teal-700',
  REJECT: 'bg-red-100 text-red-700',
};

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        ...(search && { search }),
        ...(actionFilter !== 'All' && { module: actionFilter }),
      };
      const res = await api.get('/audit-logs', params);
      setLogs(res.data || []);
      setPagination({ page: res.page, pages: res.pages, total: res.total });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${ACTION_COLORS[row.action] || 'bg-slate-100 text-slate-600'}`}>
          {row.action}
        </span>
      ),
    },
    {
      key: 'resource',
      label: 'Resource',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-800 capitalize">{row.module}</p>
          {row.recordId && <p className="text-xs text-slate-400 font-mono truncate max-w-[120px]">{row.recordId}</p>}
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {row.userName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm text-slate-800">{row.userName || 'System'}</p>
            <p className="text-xs text-slate-400">{row.userRole || ''}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      label: 'IP',
      render: (row) => <span className="text-xs font-mono text-slate-500">{row.ipAddress || '—'}</span>,
    },
    {
      key: 'description',
      label: 'Details',
      render: (row) => (
        <p className="text-sm text-slate-500 line-clamp-1 max-w-[200px]">{row.details || '—'}</p>
      ),
    },
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          {new Date(row.timestamp || row.createdAt).toLocaleString()}
        </div>
      ),
    },
  ];

  const modules = ['All', 'Transactions', 'Invoices', 'Fraud Detection', 'Auth', 'Budgets', 'Vendors'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-slate-600" />
            Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete audit trail of all system actions and user activity</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
          <ShieldCheck className="w-4 h-4" />
          Tamper-proof logging
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {modules.map((a) => (
            <button
              key={a}
              onClick={() => { setActionFilter(a); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                actionFilter === a ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="No audit logs found"
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  );
};
