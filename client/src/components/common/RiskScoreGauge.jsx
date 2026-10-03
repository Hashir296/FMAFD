import React from 'react';

export const RiskScoreGauge = ({ score = 10, size = 'md' }) => {
  const numScore = Math.min(Math.max(Number(score) || 0, 0), 100);

  let colorClass = 'bg-emerald-500 text-emerald-700';
  let level = 'Low Risk';

  if (numScore > 80) {
    colorClass = 'bg-rose-600 text-rose-700';
    level = 'Critical Risk';
  } else if (numScore > 60) {
    colorClass = 'bg-orange-500 text-orange-700';
    level = 'High Risk';
  } else if (numScore > 30) {
    colorClass = 'bg-amber-500 text-amber-700';
    level = 'Medium Risk';
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${colorClass.split(' ')[0]}`} style={{ width: `${numScore}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-700">{numScore}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Risk Score</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass.replace('bg-', 'bg-opacity-10 bg-')}`}>
          {level}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{numScore}</span>
        <span className="text-sm font-medium text-slate-400">/ 100</span>
      </div>
      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass.split(' ')[0]}`}
          style={{ width: `${numScore}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
        <span>0 (Safe)</span>
        <span>30</span>
        <span>60</span>
        <span>80</span>
        <span>100 (Critical)</span>
      </div>
    </div>
  );
};

export default RiskScoreGauge;
