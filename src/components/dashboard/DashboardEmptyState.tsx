import React, { forwardRef } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DashboardEmptyState = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('glass-card p-8 md:p-16 text-center animate-scale-in', className)}
      {...props}
    >
      <div className="relative inline-block mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-primary/10 flex items-center justify-center animate-float">
          <AlertTriangle className="h-12 w-12 text-primary" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-secondary flex items-center justify-center animate-pulse-glow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
      </div>
      <h3 className="text-xl md:text-2xl font-semibold mb-3 gradient-text">
        Aucun incident enregistré
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Commencez par créer votre premier incident pour voir les statistiques apparaître ici.
      </p>
    </div>
  );
});

DashboardEmptyState.displayName = 'DashboardEmptyState';

