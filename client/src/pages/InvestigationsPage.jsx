import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge, RiskBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  SearchCheck,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  BrainCircuit,
  FileText,
  User,
  Calendar,
} from 'lucide-react';

const STATUS_COLORS = {
  open: 'bg-rose-100 text-rose-700',
  in_progress: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  closed: 'bg-emerald-100 text-emerald-700',
  escalated: 'bg-purple-100 text-purple-700',
};

export const InvestigationsPage = () => {
  const { showToast } = useAuth();
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [note, setNote] = useState('');
  const [nextStatus, setNextStatus] = useState('Under Review');
  const [pagination, setPagination] = useState({});

  const fetchInvestigations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(search && { search }),
        ...(statusFilter !== 'All' && { status: statusFilter }),
      };
      const res = await api.get('/investigations', params);
      setInvestigations(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  const openCount = investigations.filter((i) => ['Open', 'Pending Evidence'].includes(i.status)).length;
  const inProgressCount = investigations.filter((i) => i.status === 'Under Review').length;
  const closedCount = investigations.filter((i) => ['Closed', 'False Positive', 'Confirmed Fraud'].includes(i.status)).length;
  const escalatedCount = investigations.filter((i) => i.priority === 'Critical').length;

  const columns = [
    {
      key: 'caseNumber',
      label: 'Case',
      render: (row) => (
        <div>
          <p className="font-mono text-sm font-semibold text-slate-800">{row.caseId}</p>
          <p className="text-xs text-slate-400 line-clamp-1">{row.title}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => <StatusBadge status={row.entityType} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold capitalize ${STATUS_COLORS[row.status] || 'bg-slate-100 text-slate-600'}`}>
          {row.status?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <RiskBadge level={row.priority} />,
    },
    {
      key: 'assignedTo',
      label: 'Investigator',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-3 h-3 text-blue-600" />
          </div>
          <span className="text-sm text-slate-600">{row.assignedInvestigator || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Opened',
      render: (row) => (
        <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => setSelectedInvestigation(row)}
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
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <SearchCheck className="w-6 h-6 text-indigo-500" />
            Investigations
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">A case opens from a fraud alert. This list is the review queue, not a place to invent a case.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Cases" value={openCount} icon={AlertTriangle} color="rose" loading={loading} />
        <StatCard title="In Progress" value={inProgressCount} icon={Clock} color="blue" loading={loading} />
        <StatCard title="Escalated" value={escalatedCount} icon={SearchCheck} color="purple" loading={loading} />
        <StatCard title="Closed" value={closedCount} icon={CheckCircle2} color="emerald" loading={loading} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        {['All', 'Open', 'Under Review', 'Pending Evidence', 'Confirmed Fraud', 'False Positive', 'Closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors whitespace-nowrap ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={investigations}
        loading={loading}
        emptyMessage="No investigations found"
        pagination={pagination}
      />

      {/* Investigation Detail Modal */}
      <Modal isOpen={!!selectedInvestigation} onClose={() => setSelectedInvestigation(null)} title={`Case: ${selectedInvestigation?.caseId}`}>
        {selectedInvestigation && (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-800">{selectedInvestigation.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold capitalize ${STATUS_COLORS[selectedInvestigation.status] || 'bg-slate-100 text-slate-600'}`}>
                  {selectedInvestigation.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Priority</p>
                <StatusBadge status={selectedInvestigation.priority} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Category</p>
                <p className="font-medium text-slate-800">{selectedInvestigation.entityType} · {selectedInvestigation.entityName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Investigator</p>
                <p className="font-medium text-slate-800">{selectedInvestigation.assignedInvestigator || 'Unassigned'}</p>
              </div>
            </div>

            {selectedInvestigation.caseSummary && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Summary</p>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{selectedInvestigation.caseSummary}</p>
              </div>
            )}

            {selectedInvestigation.aiAnalysisSummary && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-slate-800">{selectedInvestigation.aiAnalysisSummary}</p>
              </div>
            )}

            {selectedInvestigation.investigatorNotes?.length > 0 && (
              <ul className="text-sm space-y-2">
                {selectedInvestigation.investigatorNotes.map((item, index) => (
                  <li key={`${item.createdAt}-${index}`} className="border-t border-slate-100 pt-2">
                    <p className="text-xs text-slate-400">{item.author}</p>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ul>
            )}

            <form
              className="space-y-2"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const res = await api.post(`/investigations/${selectedInvestigation._id}/notes`, { text: note });
                  setSelectedInvestigation(res.data);
                  setNote('');
                  showToast('Note added to the case', 'success');
                  fetchInvestigations();
                } catch (err) {
                  showToast(err.message, 'error');
                }
              }}
            >
              <textarea required value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you check?" className="w-full border rounded-md px-3 py-2 text-sm" rows={3} />
              <button className="bg-[#1C2B24] text-white px-3 py-2 rounded-md text-sm">Add note</button>
            </form>

            <div className="flex gap-2 items-end">
              <label className="text-sm flex-1">Move the case
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 bg-white">
                  <option>Under Review</option>
                  <option>Pending Evidence</option>
                  <option>Confirmed Fraud</option>
                  <option>False Positive</option>
                  <option>Closed</option>
                </select>
              </label>
              <button
                type="button"
                className="bg-[#1C2B24] text-white px-3 py-2 rounded-md text-sm"
                onClick={async () => {
                  try {
                    const res = await api.patch(`/investigations/${selectedInvestigation._id}/status`, { status: nextStatus });
                    setSelectedInvestigation(res.data);
                    showToast(
                      nextStatus === 'Confirmed Fraud'
                        ? 'Case confirmed. The payment was reversed on the books.'
                        : 'Case status updated.',
                      'success'
                    );
                    fetchInvestigations();
                  } catch (err) {
                    showToast(err.message, 'error');
                  }
                }}
              >
                Update
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
