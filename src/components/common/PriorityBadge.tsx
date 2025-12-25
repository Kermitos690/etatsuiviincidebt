import { cn } from '@/lib/utils';
import { getPriorityColor } from '@/config/appConfig';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PriorityBadgeProps {
  priority: string;
  score: number;
  gravite?: string;
  type?: string;
  showTooltip?: boolean;
}

const priorityLabels: Record<string, string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  eleve: 'Élevé',
  critique: 'Critique'
};

export function PriorityBadge({ 
  priority, 
  score, 
  gravite, 
  type, 
  showTooltip = true 
}: PriorityBadgeProps) {
  const badge = (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
      getPriorityColor(priority)
    )}>
      <span>{priorityLabels[priority] || priority}</span>
      <span className="font-bold">({score})</span>
    </span>
  );

  if (!showTooltip || !gravite || !type) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-xs space-y-1">
          <p className="font-medium">Calcul du score</p>
          <p>Gravité ({gravite}) × 2 + Type ({type})</p>
          <p className="text-muted-foreground">Score total: {score}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
