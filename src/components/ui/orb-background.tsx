import * as React from 'react';
import { cn } from '@/lib/utils';

export interface OrbBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of orbs to display (1-4) */
  orbCount?: 1 | 2 | 3 | 4;
  /** Reduce motion/intensity */
  subtle?: boolean;
}

const OrbBackground = React.forwardRef<HTMLDivElement, OrbBackgroundProps>(
  ({ className, orbCount = 3, subtle = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('orb-container', className)}
        aria-hidden="true"
        {...props}
      >
        <div 
          className={cn(
            'orb-bg orb-1',
            subtle && 'opacity-50'
          )} 
        />
        {orbCount >= 2 && (
          <div 
            className={cn(
              'orb-bg orb-2',
              subtle && 'opacity-50'
            )} 
          />
        )}
        {orbCount >= 3 && (
          <div 
            className={cn(
              'orb-bg orb-3',
              subtle && 'opacity-50'
            )} 
          />
        )}
        {orbCount >= 4 && (
          <div 
            className="orb-bg absolute top-1/2 left-1/4 w-[300px] h-[300px]"
            style={{
              background: 'radial-gradient(ellipse at center, hsl(38 92% 50% / 0.06), transparent 70%)',
              animationDelay: '-18s',
            }}
          />
        )}
      </div>
    );
  }
);
OrbBackground.displayName = 'OrbBackground';

export { OrbBackground };
