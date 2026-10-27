import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge, BadgeVariant } from './Badge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  trendBadge?: { text: string; variant?: BadgeVariant };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  trendBadge,
  onClick,
  className = '',
}) => (
  <div
    onClick={onClick}
    className={`bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
      onClick ? 'cursor-pointer hover:border-blue-300' : ''
    } ${className}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          {title}
        </span>
        <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block tracking-tight">
          {value}
        </span>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor} ${iconColor}`}>
        <Icon size={18} />
      </div>
    </div>

    {(subtitle || trendBadge) && (
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        {subtitle && <span className="text-[11px] text-slate-500 truncate">{subtitle}</span>}
        {trendBadge && (
          <Badge variant={trendBadge.variant || 'primary'} size="sm">
            {trendBadge.text}
          </Badge>
        )}
      </div>
    )}
  </div>
);
