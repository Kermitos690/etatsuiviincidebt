import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  to: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  color?: string;
}

interface QuickActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
}

export const QuickActions = forwardRef<HTMLDivElement, QuickActionsProps>(
  ({ className, actions, columns = 4, ...props }, ref) => {
    const gridCols = {
      2: 'grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-4',
    };

    return (
      <div
        ref={ref}
        className={cn('grid gap-4', gridCols[columns], className)}
        {...props}
      >
        {actions.map((action, index) => (
          <Link
            key={action.to}
            to={action.to}
            className={cn(
              'glass-card p-4 md:p-6 flex flex-col items-center text-center group',
              'hover:shadow-elevated hover:-translate-y-1 transition-all duration-300',
              'animate-scale-in'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={cn(
              'w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3',
              'bg-gradient-primary shadow-glow group-hover:scale-110 transition-transform duration-300'
            )}>
              <action.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
            </div>
            <h3 className="font-semibold text-sm md:text-base mb-1 group-hover:text-primary transition-colors">
              {action.label}
            </h3>
            {action.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {action.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    );
  }
);

QuickActions.displayName = 'QuickActions';
