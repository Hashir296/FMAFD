import React from 'react';

export const RiskBadge = ({ level = 'Low', score }) => {
  const normalized = (level || 'Low').toLowerCase();

  const configs = {
    critical: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
        dot: 'bg-rose-600',
      label: 'Critical Risk',
    },
    high: {
      bg: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20',
      dot: 'bg-orange-600',
      label: 'High Risk',
    },
    medium: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
      dot: 'bg-amber-500',
      label: 'Medium Risk',
    },
    low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
      dot: 'bg-emerald-500',
      label: 'Low Risk',
    },
  };

  const cfg = configs[normalized] || configs.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} shadow-xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{score !== undefined ? `${score}/100 • ` : ''}{cfg.label}</span>
    </span>
  );
};

export const StatusBadge = ({ status = 'completed' }) => {
  const s = (status || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (['completed', 'paid', 'healthy', 'active', 'resolved'].includes(s)) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['pending', 'near limit', 'under review', 'sent', 'open'].includes(s)) {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (['flagged', 'over budget', 'overdue', 'partially_paid', 'disputed'].includes(s)) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['rejected', 'confirmed fraud', 'blocked', 'delinquent'].includes(s)) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
  } else if (['false positive'].includes(s)) {
    styles = 'bg-teal-50 text-teal-700 border-teal-200';
  }

  // Format label: under_review -> Under Review
  const label = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles}`}>
      {label}
    </span>
  );
};

export default { RiskBadge, StatusBadge };
