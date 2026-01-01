import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  variant?: 'spinner' | 'skeleton' | 'cards' | 'list' | 'table';
  size?: 'sm' | 'md' | 'lg';
  count?: number;
}

export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, message = 'Chargement...', variant = 'spinner', size = 'md', count = 4, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-8 w-8',
      lg: 'h-12 w-12',
    };

    if (variant === 'skeleton') {
      return (
        <div ref={ref} className={cn('space-y-4 animate-fade-in', className)} {...props}>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      );
    }

    if (variant === 'cards') {
      return (
        <div ref={ref} className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in', className)} {...props}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="glass-card p-6 space-y-3" style={{ animationDelay: `${i * 50}ms` }}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      );
    }

    if (variant === 'list') {
      return (
        <div ref={ref} className={cn('space-y-3 animate-fade-in', className)} {...props}>
          {Array.from({ length: count }).map((_, i) => (
            <div 
              key={i} 
              className="glass-card p-4 flex items-center gap-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20 flex-shrink-0" />
            </div>
          ))}
        </div>
      );
    }

    if (variant === 'table') {
      return (
        <div ref={ref} className={cn('glass-card p-4 space-y-3 animate-fade-in', className)} {...props}>
          <div className="flex items-center gap-4 pb-3 border-b border-border">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div 
              key={i} 
              className="flex items-center gap-4 py-2"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16 ml-auto rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-12 animate-fade-in',
          className
        )}
        {...props}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative p-4 rounded-full bg-gradient-primary shadow-glow">
            <Loader2 className={cn('text-white animate-spin', sizeClasses[size])} />
          </div>
        </div>
        {message && (
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">{message}</p>
        )}
      </div>
    );
  }
);

LoadingState.displayName = 'LoadingState';
