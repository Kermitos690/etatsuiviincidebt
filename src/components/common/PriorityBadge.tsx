import { cn } from '@/lib/utils';
import { getPriorityColor } from '@/config/appConfig';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Zap } from 'lucide-react';

interface PriorityBadgeProps {
  priority: string;
  score: number;
  gravite?: string;
  type?: string;
  showTooltip?: boolean;
}

const priorityConfig: Record<string, { label: string; gradient: string; glow: string }> = {
  faible: { 
    label: 'Faible', 
    gradient: 'from-emerald-400 to-emerald-500',
    glow: 'shadow-emerald-500/30'
  },
  moyen: { 
    label: 'Moyen', 
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-500/30'
  },
  eleve: { 
    label: 'Élevé', 
    gradient: 'from-orange-500 to-red-500',
    glow: 'shadow-orange-500/30'
  },
  critique: { 
    label: 'Critique', 
    gradient: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/30'
  }
};

export function PriorityBadge({ 
  priority, 
  score, 
  gravite, 
  type, 
  showTooltip = true 
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] || { 
    label: priority, 
    gradient: 'from-slate-400 to-slate-500',
    glow: ''
  };

  const badge = (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
      "bg-gradient-to-r text-white shadow-sm transition-all duration-200",
      "hover:scale-105 hover:shadow-md cursor-default",
      config.gradient,
      config.glow
    )}>
      <Zap className="h-3 w-3" />
      <span>{config.label}</span>
      <span className="font-bold opacity-90">({score})</span>
    </span>
  );

  if (!showTooltip || !gravite || !type) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-xs glass-card border-glass backdrop-blur-glass"
      >
        <div className="text-xs space-y-2 p-1">
          <p className="font-semibold gradient-text">Calcul du score</p>
          <div className="space-y-1 text-muted-foreground">
            <p>Gravité ({gravite}) × 2</p>
            <p>+ Type ({type})</p>
          </div>
          <p className="font-medium text-foreground">Score total: <span className="text-primary">{score}</span></p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
