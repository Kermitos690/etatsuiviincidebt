import React, { forwardRef } from 'react';
import { LucideIcon, Inbox, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ 
    className, 
    icon: Icon = Inbox, 
    title, 
    description, 
    actionLabel, 
    onAction,
    actionIcon: ActionIcon,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass-card p-8 md:p-12 text-center animate-scale-in',
          className
        )}
        {...props}
      >
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-primary/10 flex items-center justify-center animate-float">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-secondary flex items-center justify-center animate-pulse-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        </div>
        
        <h3 className="text-xl md:text-2xl font-semibold mb-2 gradient-text">
          {title}
        </h3>
        
        {description && (
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {description}
          </p>
        )}
        
        {actionLabel && onAction && (
          <Button onClick={onAction} className="glow-button text-white">
            {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
