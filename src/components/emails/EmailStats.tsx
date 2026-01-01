import React, { memo } from 'react';
import { Layers, Mail, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface EmailStatsProps {
  totalThreads: number;
  totalEmails: number;
  incidents: number;
  unprocessed: number;
  avgConfidence: number;
}

const stats = [
  { key: 'threads', icon: Layers, label: 'Threads', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'emails', icon: Mail, label: 'Emails', gradient: 'from-violet-500 to-purple-500' },
  { key: 'incidents', icon: AlertTriangle, label: 'Incidents', gradient: 'from-rose-500 to-red-500' },
  { key: 'unprocessed', icon: Clock, label: 'Non traités', gradient: 'from-amber-500 to-orange-500' },
  { key: 'confidence', icon: TrendingUp, label: 'Confiance', gradient: 'from-emerald-500 to-green-500' },
] as const;

function EmailStatsInner({
  totalThreads,
  totalEmails,
  incidents,
  unprocessed,
  avgConfidence,
}: EmailStatsProps) {
  const values: Record<string, number> = {
    threads: totalThreads,
    emails: totalEmails,
    incidents: incidents,
    unprocessed: unprocessed,
    confidence: avgConfidence,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 min-w-0 overflow-hidden">
      {stats.map((stat, i) => (
        <GlassCard
          key={stat.key}
          variant="elevated"
          hover="3d"
          className="p-3 sm:p-4 min-w-0 overflow-hidden group"
          animationDelay={i * 80}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn(
              "flex-shrink-0 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br shadow-lg",
              "transition-transform duration-300 group-hover:scale-110",
              stat.gradient
            )}>
              <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                {stat.key === 'confidence' ? (
                  <><AnimatedCounter value={values[stat.key]} />%</>
                ) : (
                  <AnimatedCounter value={values[stat.key]} />
                )}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
            </div>
          </div>

          {/* Decorative corner */}
          <div className={cn(
            "absolute -bottom-4 -right-4 w-12 h-12 sm:w-16 sm:h-16 rounded-full opacity-10 pointer-events-none",
            "bg-gradient-to-br",
            stat.gradient
          )} />
        </GlassCard>
      ))}
    </div>
  );
}

export const EmailStats = memo(EmailStatsInner);
export default EmailStats;
