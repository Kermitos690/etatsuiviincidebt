import React, { memo } from 'react';
import { Layers, Mail, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailStatsProps {
  totalThreads: number;
  totalEmails: number;
  incidents: number;
  unprocessed: number;
  avgConfidence: number;
}

const stats = [
  { key: 'threads', icon: Layers, label: 'Threads', color: 'from-blue-500 to-cyan-500' },
  { key: 'emails', icon: Mail, label: 'Emails', color: 'from-violet-500 to-purple-500' },
  { key: 'incidents', icon: AlertTriangle, label: 'Incidents', color: 'from-rose-500 to-red-500' },
  { key: 'unprocessed', icon: Clock, label: 'Non traités', color: 'from-amber-500 to-orange-500' },
  { key: 'confidence', icon: TrendingUp, label: 'Confiance', color: 'from-emerald-500 to-green-500' },
] as const;

function EmailStatsInner({
  totalThreads,
  totalEmails,
  incidents,
  unprocessed,
  avgConfidence,
}: EmailStatsProps) {
  const values = {
    threads: totalThreads,
    emails: totalEmails,
    incidents: incidents,
    unprocessed: unprocessed,
    confidence: `${avgConfidence}%`,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {stats.map((stat, i) => (
        <div
          key={stat.key}
          className={cn(
            "relative overflow-hidden rounded-2xl p-4",
            "bg-card/80 backdrop-blur-sm border border-border/50",
            "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
            "transition-all duration-300 group cursor-default"
          )}
          style={{
            animationDelay: `${i * 80}ms`,
            animation: 'scale-in 0.4s ease-out backwards'
          }}
        >
          {/* Background gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" 
               style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />

          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl bg-gradient-to-br shadow-lg",
              "transition-transform duration-300 group-hover:scale-110",
              stat.color
            )}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold truncate">{values[stat.key]}</p>
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
            </div>
          </div>

          {/* Decorative corner */}
          <div className={cn(
            "absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-10",
            "bg-gradient-to-br",
            stat.color
          )} />
        </div>
      ))}
    </div>
  );
}

export const EmailStats = memo(EmailStatsInner);
export default EmailStats;
