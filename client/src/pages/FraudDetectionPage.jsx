import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { RiskBadge, StatusBadge } from '../components/common/Badge';
import { DataTable } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { RiskScoreGauge } from '../components/common/RiskScoreGauge';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Clock,
  Zap,
  Search,
  Filter,
  RefreshCw,
  BrainCircuit,
  ChevronRight,
} from 'lucide-react';

export const FraudDetectionPage = () => {
  const { showToast } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [investigatingId, setInvestigatingId] = useState(null);
  const [explaining, setExplaining] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...(statusFilter !== 'All' && { status: statusFilter }),
        ...(severityFilter !== 'All' && { riskLevel: severityFilter }),
      };
      const res = await api.get('/fraud/alerts', params);
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDismiss = async (alertId) => {
    try {
      await api.patch(`/fraud/alerts/${alertId}/status`, { status: 'False Positive', resolutionNotes: 'Cleared from the queue' });
      showToast('Alert dismissed', 'success');
      fetchAlerts();
    } catch (err) {
      showToast('Failed to dismiss alert', 'error');
    }
  };

  const handleInvestigate = async (alertId) => {
    setInvestigatingId(alertId);
    try {
      const res = await api.post(`/fraud/alerts/${alertId}/investigate`);
      showToast('Investigation initiated', 'success');
      fetchAlerts();
    } catch (err) {
      showToast('Failed to initiate investigation', 'error');
    } finally {
      setInvestigatingId(null);
    }
  };

  const activeAlerts = alerts.filter((a) => ['New', 'Under Review', 'Escalated'].includes(a.status)).length;
  const criticalAlerts = alerts.filter((a) => a.riskLevel === 'Critical').length;
  const underInvestigation = alerts.filter((a) => a.status === 'Under Review' || a.status === 'Escalated').length;
  const resolvedAlerts = alerts.filter((a) => ['False Positive', 'Resolved', 'Confirmed Fraud'].includes(a.status)).length;

  const severityColor = {
    critical: 'bg-rose-100 text-rose-700 border border-rose-200',
    high: 'bg-orange-100 text-orange-700 border border-orange-200',
    medium: 'bg-amber-100 text-amber-700 border border-amber-200',
    low: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  const columns = [
    {
      key: 'alertType',
      label: 'Alert',
      render: (row) => (
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
            row.riskLevel === 'Critical' ? 'bg-rose-500' :
            row.riskLevel === 'High' ? 'bg-orange-500' :
            row.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
          }`} />
          <div>
            <p className="font-medium text-slate-800 text-sm">{row.detectionType}</p>
            <p className="text-xs text-slate-400 line-clamp-1">{row.entityName} · {row.txnId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (row) => (
        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold capitalize ${severityColor[(row.riskLevel || '').toLowerCase()] || severityColor.low}`}>
          {row.riskLevel}
        </span>
      ),
    },
    { key: 'riskScore', label: 'Risk Score', render: (row) => <RiskBadge score={row.riskScore} /> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'detectedAt',
      label: 'Detected',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.detectionDate || row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedAlert(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          {['New', 'Under Review', 'Escalated'].includes(row.status) && (
            <>
              <button
                onClick={() => handleInvestigate(row._id)}
                disabled={investigatingId === row._id}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                title="Investigate"
              >
                <BrainCircuit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDismiss(row._id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Dismiss"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            Fraud Detection
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Scores come from the desk rules. Open an alert to ask OpenRouter for a written review.</p>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Alerts" value={activeAlerts} icon={ShieldAlert} color="rose" loading={loading} />
        <StatCard title="Critical" value={criticalAlerts} icon={AlertTriangle} color="amber" loading={loading} />
        <StatCard title="Under Investigation" value={underInvestigation} icon={Clock} color="indigo" loading={loading} />
        <StatCard title="Resolved" value={resolvedAlerts} icon={CheckCircle2} color="emerald" loading={loading} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Status</p>
          <div className="flex gap-2">
            {['All', 'New', 'Under Review', 'Escalated', 'Confirmed Fraud', 'False Positive', 'Resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Severity</p>
          <div className="flex gap-2">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  severityFilter === s ? 'bg-rose-600 text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={alerts} loading={loading} emptyMessage="No fraud alerts found" />

      {/* Alert Detail Modal */}
      <Modal isOpen={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Fraud Alert Details">
        {selectedAlert && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize ${severityColor[(selectedAlert.riskLevel || '').toLowerCase()] || severityColor.low}`}>
                {selectedAlert.riskLevel} risk
              </span>
              <StatusBadge status={selectedAlert.status} />
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Alert Type</p>
              <p className="font-semibold text-slate-800">{selectedAlert.detectionType}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Description</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">{(selectedAlert.reasons || []).join(' ') || selectedAlert.recommendedAction}</p>
            </div>

            {selectedAlert.riskScore !== undefined && (
              <div className="flex justify-center">
                <RiskScoreGauge score={selectedAlert.riskScore} size="md" />
              </div>
            )}

            {selectedAlert.recommendedAction && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-700 mb-1">Recommended review</p>
                <p className="text-sm text-slate-800">{selectedAlert.recommendedAction}</p>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700">OpenRouter note</p>
                <button
                  onClick={async () => {
                    setExplaining(true);
                    try {
                      const res = await api.post(`/ai/alerts/${selectedAlert._id}/explain`);
                      setSelectedAlert({ ...selectedAlert, modelNote: res.data.explanation });
                    } catch (err) {
                      showToast(err.message || 'Could not write the note', 'error');
                    } finally {
                      setExplaining(false);
                    }
                  }}
                  disabled={explaining}
                  className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-50"
                >
                  {explaining ? 'Writing…' : 'Write a note'}
                </button>
              </div>
              <p className="text-sm text-slate-700">{selectedAlert.modelNote || 'No written note yet. The score stays the one already stored on this alert.'}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Amount</p>
              <p className="text-lg font-bold text-rose-600">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedAlert.amount || 0)}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
