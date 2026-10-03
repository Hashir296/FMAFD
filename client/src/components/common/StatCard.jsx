import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtext,
  change,
  changeType = 'positive', // 'positive' | 'negative' | 'neutral'
  icon: Icon,
  iconBg = 'bg-blue-50 text-blue-600',
  accentColor,
  onClick,
}) => {
  const isUp = change && change.startsWith('+');
  const isDown = change && change.startsWith('-');

  return (
    <div
      onClick={onClick}
      className={`bg-[#FBF8F3] border border-[#DDD4C4] rounded-md p-5 transition-colors relative overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {accentColor && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#6B6256]">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBg} shadow-xs shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(change || subtext) && (
        <div className="mt-3.5 flex items-center gap-2 text-xs">
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded ${
                changeType === 'positive'
                  ? 'text-emerald-700 bg-emerald-50'
                  : changeType === 'negative'
                  ? 'text-rose-700 bg-rose-50'
                  : 'text-slate-600 bg-slate-100'
              }`}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {change}
            </span>
          )}
          {subtext && <span className="text-slate-500 font-normal">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
