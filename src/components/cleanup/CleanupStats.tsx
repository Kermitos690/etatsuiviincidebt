import { Card, CardContent } from '@/components/ui/card';
import { Trash2, ShieldCheck, ShieldX, SkipForward, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CleanupStatsProps {
  deleted: number;
  kept: number;
  blacklisted: number;
  skipped: number;
  remaining: number;
  className?: string;
}

export function CleanupStats({
  deleted,
  kept,
  blacklisted,
  skipped,
  remaining,
  className,
}: CleanupStatsProps) {
  const stats = [
    { 
      label: 'Supprimés', 
      value: deleted, 
      icon: Trash2, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    { 
      label: 'Conservés', 
      value: kept, 
      icon: ShieldCheck, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: 'Blacklistés', 
      value: blacklisted, 
      icon: ShieldX, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    { 
      label: 'Passés', 
      value: skipped, 
      icon: SkipForward, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
  ];

  return (
    <Card className={cn("glass-card", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Cette session</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="text-sm">{remaining} restants</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <span className="text-lg font-bold">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}