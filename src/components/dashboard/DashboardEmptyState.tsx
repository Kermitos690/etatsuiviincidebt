import React, { forwardRef } from 'react';
import { AlertTriangle, Sparkles, Mail, Brain, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const DashboardEmptyState = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const navigate = useNavigate();
  
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
        Bienvenue dans votre Registre
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        Pour commencer, synchronisez vos emails ou créez manuellement votre premier incident.
      </p>
      
      {/* Quick start actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/50"
          onClick={() => navigate('/gmail-config')}
        >
          <Mail className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Connecter Gmail</span>
        </Button>
        
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/50"
          onClick={() => navigate('/analysis-pipeline')}
        >
          <Brain className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Lancer une analyse</span>
        </Button>
        
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/50"
          onClick={() => navigate('/nouveau')}
        >
          <Plus className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Créer un incident</span>
        </Button>
      </div>
    </div>
  );
});

DashboardEmptyState.displayName = 'DashboardEmptyState';

