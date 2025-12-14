import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  colorClass?: string; // Kept for API compatibility, but we might override with standard colors
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, trendUp, icon: Icon }) => {
  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm flex items-start justify-between transition-all hover:border-primary/50">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-bold font-mono tracking-tight">{value}</h3>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
            <span>{trend}</span>
            <span className="ml-1 text-muted-foreground">vs last month</span>
          </div>
        )}
      </div>
      <div className="p-2.5 rounded-lg bg-secondary text-foreground">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

export default StatCard;