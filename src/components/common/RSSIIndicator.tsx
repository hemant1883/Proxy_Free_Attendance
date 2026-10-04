import React from 'react';

export interface RSSIIndicatorProps {
  rssi: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function getRSSICategory(rssi: number): {
  level: number; // 1 to 4
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  eligible: boolean;
} {
  if (rssi >= -50) {
    return {
      level: 4,
      label: 'Excellent',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      eligible: true
    };
  } else if (rssi >= -60) {
    return {
      level: 3,
      label: 'Strong',
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      eligible: true
    };
  } else if (rssi >= -70) {
    return {
      level: 2,
      label: 'Acceptable',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      eligible: true
    };
  } else {
    return {
      level: 1,
      label: 'Rejected (Weak Signal)',
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      eligible: false
    };
  }
}

export const RSSIIndicator: React.FC<RSSIIndicatorProps> = ({
  rssi,
  showDetails = true,
  size = 'md'
}) => {
  const cat = getRSSICategory(rssi);

  const barHeights = ['h-2', 'h-3.5', 'h-5', 'h-6.5'];
  const barWidths = size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5';

  return (
    <div className="inline-flex items-center gap-2.5">
      {/* 4-bar RSSI graphic */}
      <div className="flex items-end gap-0.5 h-6">
        {[1, 2, 3, 4].map((bar) => {
          const isActive = bar <= cat.level;
          let barBg = 'bg-slate-200';
          if (isActive) {
            if (cat.level === 1) barBg = 'bg-rose-500';
            else if (cat.level === 2) barBg = 'bg-amber-500';
            else if (cat.level === 3) barBg = 'bg-teal-500';
            else barBg = 'bg-emerald-600';
          }
          return (
            <div
              key={bar}
              className={`${barWidths} ${barHeights[bar - 1]} ${barBg} rounded-t-sm transition-all duration-300`}
            />
          );
        })}
      </div>

      {showDetails && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">
              {rssi} dBm
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${cat.bgColor} ${cat.color} border ${cat.borderColor}`}
            >
              {cat.label}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {cat.eligible ? 'Within Threshold (≥ -70 dBm)' : 'Below Threshold (< -70 dBm)'}
          </span>
        </div>
      )}
    </div>
  );
};
