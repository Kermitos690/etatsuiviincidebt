import React, { forwardRef } from 'react';
import { Sparkles } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, icon, children }, ref) => {
    return (
      <div ref={ref} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
                {icon}
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-secondary flex items-center justify-center animate-pulse-glow">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text animate-scale-in">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '100ms' }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {(actions || children) && (
          <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
            {actions}
            {children}
          </div>
        )}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';
