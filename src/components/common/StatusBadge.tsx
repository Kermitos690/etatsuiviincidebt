import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, Archive, Send } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { 
  gradient: string; 
  icon: typeof CheckCircle;
  glow: string;
}> = {
  'Ouvert': { 
    gradient: 'from-amber-400 to-orange-500', 
    icon: Clock,
    glow: 'shadow-amber-500/30'
  },
  'En cours': { 
    gradient: 'from-blue-400 to-blue-600', 
    icon: AlertCircle,
    glow: 'shadow-blue-500/30'
  },
  'Résolu': { 
    gradient: 'from-emerald-400 to-emerald-600', 
    icon: CheckCircle,
    glow: 'shadow-emerald-500/30'
  },
  'Classé': { 
    gradient: 'from-slate-400 to-slate-500', 
    icon: Archive,
    glow: 'shadow-slate-500/20'
  },
  'Transmis': { 
    gradient: 'from-violet-400 to-purple-600', 
    icon: Send,
    glow: 'shadow-violet-500/30'
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { 
    gradient: 'from-slate-400 to-slate-500', 
    icon: AlertCircle,
    glow: ''
  };
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
      "bg-gradient-to-r text-white shadow-sm transition-all duration-200",
      "hover:scale-105 hover:shadow-md cursor-default",
      config.gradient,
      config.glow
    )}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
