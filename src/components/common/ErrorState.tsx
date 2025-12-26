import React, { forwardRef } from 'react';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHelp?: () => void;
  showHelp?: boolean;
}

export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ 
    className, 
    title = 'Une erreur est survenue',
    message = 'Impossible de charger les données. Veuillez réessayer.',
    onRetry,
    onHelp,
    showHelp = false,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card p-8 md:p-12 text-center animate-scale-in border-destructive/20',
          className
        )}
        {...props}
      >
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>
        
        <h3 className="text-xl md:text-2xl font-semibold mb-2 text-destructive">
          {title}
        </h3>
        
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          {message}
        </p>
        
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="border-destructive/30 hover:bg-destructive/10">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          )}
          
          {showHelp && onHelp && (
            <Button onClick={onHelp} variant="ghost">
              <HelpCircle className="h-4 w-4 mr-2" />
              Obtenir de l'aide
            </Button>
          )}
        </div>
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';
