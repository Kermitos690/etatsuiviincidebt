import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export interface AuroraHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Show floating particles effect */
  particles?: boolean;
  /** Show sparkle badge on icon */
  sparkle?: boolean;
}

const AuroraHeader = React.forwardRef<HTMLDivElement, AuroraHeaderProps>(
  ({ 
    className, 
    title, 
    subtitle, 
    icon, 
    actions,
    particles = false,
    sparkle = true,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8',
          className
        )}
        {...props}
      >
        {/* Ambient orb background */}
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          {icon && (
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
                {icon}
              </div>
              {sparkle && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-secondary flex items-center justify-center animate-pulse-glow">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text animate-scale-in">
              {title}
            </h1>
            {subtitle && (
              <p 
                className="mt-1 text-sm md:text-base text-muted-foreground animate-slide-up"
                style={{ animationDelay: '100ms' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {actions && (
          <div 
            className="flex flex-wrap gap-3 relative z-10 animate-slide-up"
            style={{ animationDelay: '200ms' }}
          >
            {actions}
          </div>
        )}

        {/* Floating particles */}
        {particles && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary/30 animate-float" style={{ animationDelay: '0s' }} />
            <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-accent/30 animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-1/4 left-1/2 w-1 h-1 rounded-full bg-primary/20 animate-float" style={{ animationDelay: '2s' }} />
          </div>
        )}
      </div>
    );
  }
);
AuroraHeader.displayName = 'AuroraHeader';

export { AuroraHeader };
