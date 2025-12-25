import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  'Ouvert': 'bg-amber-100 text-amber-800 border-amber-200',
  'En cours': 'bg-blue-100 text-blue-800 border-blue-200',
  'Résolu': 'bg-green-100 text-green-800 border-green-200',
  'Classé': 'bg-slate-100 text-slate-800 border-slate-200',
  'Transmis': 'bg-purple-100 text-purple-800 border-purple-200'
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border",
      statusColors[status] || 'bg-muted text-muted-foreground border-border'
    )}>
      {status}
    </span>
  );
}
