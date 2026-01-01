import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

interface ProgressIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep?: number;
  variant?: 'horizontal' | 'vertical';
}

export const ProgressIndicator = forwardRef<HTMLDivElement, ProgressIndicatorProps>(
  ({ className, steps, currentStep = 0, variant = 'horizontal', ...props }, ref) => {
    const getStepIcon = (status: Step['status']) => {
      switch (status) {
        case 'completed':
          return <CheckCircle2 className="h-5 w-5 text-primary" />;
        case 'running':
          return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
        case 'error':
          return <Circle className="h-5 w-5 text-destructive" />;
        default:
          return <Circle className="h-5 w-5 text-muted-foreground" />;
      }
    };

    if (variant === 'vertical') {
      return (
        <div ref={ref} className={cn('space-y-4', className)} {...props}>
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  step.status === 'completed' && 'bg-primary/10',
                  step.status === 'running' && 'bg-primary/20 animate-pulse',
                  step.status === 'error' && 'bg-destructive/10',
                  step.status === 'pending' && 'bg-muted'
                )}>
                  {getStepIcon(step.status)}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    'w-0.5 flex-1 min-h-[2rem] transition-colors duration-300',
                    step.status === 'completed' ? 'bg-primary' : 'bg-muted'
                  )} />
                )}
              </div>
              <div className="flex-1 pt-2">
                <p className={cn(
                  'font-medium text-sm',
                  step.status === 'completed' && 'text-primary',
                  step.status === 'running' && 'text-foreground',
                  step.status === 'pending' && 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Horizontal variant
    return (
      <div ref={ref} className={cn('flex items-center', className)} {...props}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                step.status === 'completed' && 'bg-primary/10',
                step.status === 'running' && 'bg-primary/20 animate-pulse',
                step.status === 'error' && 'bg-destructive/10',
                step.status === 'pending' && 'bg-muted'
              )}>
                {getStepIcon(step.status)}
              </div>
              <p className={cn(
                'text-xs mt-2 max-w-[80px] text-center',
                step.status === 'completed' && 'text-primary',
                step.status === 'running' && 'text-foreground font-medium',
                step.status === 'pending' && 'text-muted-foreground'
              )}>
                {step.label}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2 transition-colors duration-300',
                step.status === 'completed' ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

ProgressIndicator.displayName = 'ProgressIndicator';
